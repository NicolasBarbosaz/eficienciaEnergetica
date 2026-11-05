import os
from pathlib import Path

import pandas as pd

from app.repositories.medicoes_repository import buscar_info
from app.services.analise_service import (
    NOMES_MES,
    TOLERANCIA,
    limite_multa,
    picos_mensais,
    situacao,
)


FEATURES = ['hora', 'dia_semana', 'mes', 'fim_de_semana', 'lag_1h', 'lag_24h', 'lag_168h', 'media_24h']

_cache_previsao = {}
_cache_modelos = {}


def _pasta_modelos():
    env = os.environ.get("ANTEVE_MODEL_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / 'model'


def carregar_modelos():
    """Carrega os 3 .txt com lightgbm.Booster uma vez só por pasta."""
    pasta = str(_pasta_modelos())
    if pasta in _cache_modelos:
        return _cache_modelos[pasta]

    import lightgbm

    central_path = Path(pasta) / 'modelo_lgbm.txt'
    if not central_path.exists():
        _cache_modelos[pasta] = None
        return None

    central = lightgbm.Booster(model_str=central_path.read_text(encoding='utf-8'))
    p10_path = Path(pasta) / 'modelo_p10.txt'
    p90_path = Path(pasta) / 'modelo_p90.txt'
    p10 = lightgbm.Booster(model_str=p10_path.read_text(encoding='utf-8')) if p10_path.exists() else None
    p90 = lightgbm.Booster(model_str=p90_path.read_text(encoding='utf-8')) if p90_path.exists() else None
    _cache_modelos[pasta] = (central, p10, p90)
    return _cache_modelos[pasta]


def previsao_proximo_mes(serie, config):
    """Fachada: usa LightGBM se disponível, baseline caso contrário. Cache por (importado_em, contratada)."""
    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    info = buscar_info() or {}
    chave = (info.get('importado_em'), contratada, tolerancia)
    if chave in _cache_previsao:
        return _cache_previsao[chave]

    modelos = carregar_modelos()
    if modelos is not None:
        central, p10, p90 = modelos
        resposta = prever_proximo_mes(serie, central, p10, p90, contratada, tolerancia)
        resposta['modelo'] = 'lightgbm'
    else:
        resposta = _prever_baseline(serie, contratada, tolerancia)
        resposta['modelo'] = 'baseline'

    _cache_previsao[chave] = resposta
    return resposta


# --- Cópia direta de referencia.py (seção 5.4) ---

def serie_horaria(serie):
    """Média de cada hora; buracos de até 3 horas seguidas são preenchidos por interpolação."""
    h = serie.resample('h').mean()
    falta = h.isna()
    tamanho_buraco = falta.groupby((~falta).cumsum()).transform('sum')
    preenchida = h.interpolate(method='time', limit_area='inside')
    return h.where(~(falta & (tamanho_buraco <= 3)), preenchida)


def prever(serie_h, horas, central, p10=None, p90=None):
    """Previsão hora a hora a partir da última leitura. Só o valor central volta como entrada."""
    hist = serie_h.copy()
    ultimo = hist.index[-1]
    janela = hist.loc[ultimo - pd.Timedelta(hours=191):ultimo]
    if len(janela) < 192 or janela.isna().any():
        raise ValueError('Faltam leituras nos últimos 8 dias do arquivo; não dá para prever.')
    linhas = []
    for k in range(1, horas + 1):
        alvo = ultimo + pd.Timedelta(hours=k)
        x = pd.DataFrame([{
            'hora': alvo.hour,
            'dia_semana': alvo.day_of_week,
            'mes': alvo.month,
            'fim_de_semana': int(alvo.day_of_week >= 5),
            'lag_1h': hist[alvo - pd.Timedelta(hours=1)],
            'lag_24h': hist[alvo - pd.Timedelta(hours=24)],
            'lag_168h': hist[alvo - pd.Timedelta(hours=168)],
            'media_24h': hist[alvo - pd.Timedelta(hours=24):alvo - pd.Timedelta(hours=1)].mean(),
        }])[FEATURES]
        c = float(central.predict(x)[0])
        baixo = min(float(p10.predict(x)[0]), c) if p10 is not None else c
        alto = max(float(p90.predict(x)[0]), c) if p90 is not None else c
        hist.loc[alvo] = c
        linhas.append((alvo, c, baixo, alto))
    return pd.DataFrame(linhas, columns=['data_hora', 'kw', 'kw_min', 'kw_max']).set_index('data_hora')


def prever_proximo_mes(serie, central, p10, p90, contratada, tolerancia=TOLERANCIA):
    """Consumo e pico típico do mês seguinte (modelo) + risco (histórico)."""
    h = serie_horaria(serie)
    ultimo = h.index[-1]
    proximo = ultimo.to_period('M') + 1
    ultima_hora = (proximo + 1).start_time - pd.Timedelta(hours=1)
    horas = int((ultima_hora - ultimo) / pd.Timedelta(hours=1))
    p = prever(h, horas, central, p10, p90)
    p = p[p.index.to_period('M') == proximo]
    return _montar_resposta(serie, p, contratada, tolerancia)


# --- Baseline (sem modelo) ---

def _prever_baseline(serie, contratada, tolerancia):
    """Média por (dia da semana, hora) das últimas 4 semanas, ± desvio padrão."""
    h = serie_horaria(serie)
    ultimo = h.index[-1]
    janela = h.loc[ultimo - pd.Timedelta(weeks=4):ultimo].dropna()

    agrupado = janela.groupby([janela.index.day_of_week, janela.index.hour])
    medias = agrupado.mean()
    desvios = agrupado.std().fillna(0.0)

    proximo = ultimo.to_period('M') + 1
    ultima_hora = (proximo + 1).start_time - pd.Timedelta(hours=1)
    idx = pd.date_range(start=ultimo + pd.Timedelta(hours=1), end=ultima_hora, freq='h')

    linhas = []
    for alvo in idx:
        chave = (alvo.day_of_week, alvo.hour)
        media = float(medias.get(chave, 0.0))
        sigma = float(desvios.get(chave, 0.0))
        linhas.append((alvo, media, media - sigma, media + sigma))

    p = pd.DataFrame(linhas, columns=['data_hora', 'kw', 'kw_min', 'kw_max']).set_index('data_hora')
    return _montar_resposta(serie, p, contratada, tolerancia)


def _montar_resposta(serie, p, contratada, tolerancia):
    """Mesma lógica de risco e aviso sazonal do prever_proximo_mes da referência."""
    picos = picos_mensais(serie)
    proximo = p.index[0].to_period('M')
    mesmo_mes = {m: v for m, v in picos.items() if m.month == proximo.month and v is not None}
    com_multa = {m: v for m, v in mesmo_mes.items() if situacao(v, contratada, tolerancia) == 'multa'}
    limite = limite_multa(contratada, tolerancia)
    pico_max = float(p['kw_max'].max())
    if (mesmo_mes and len(com_multa) / len(mesmo_mes) > 0.5) or pico_max > limite:
        risco = 'alto'
    elif com_multa or pico_max > contratada:
        risco = 'medio'
    else:
        risco = 'baixo'
    nome = NOMES_MES[proximo.month - 1].capitalize()
    if mesmo_mes:
        lista = ', '.join(f'{v:.1f} kW em {m.year}'.replace('.', ',') for m, v in sorted(mesmo_mes.items()))
        aviso = (f'{nome} passou do limite em {len(com_multa)} de {len(mesmo_mes)} '
                 f'{"ano" if len(mesmo_mes) == 1 else "anos"} do histórico ({lista}).')
    else:
        aviso = f'Sem histórico de {nome.lower()} no arquivo.'
    return {
        'mes': str(proximo),
        'consumo_previsto_kwh': round(float(p['kw'].sum()), 1),
        'pico_tipico_kw': round(float(p['kw'].max()), 1),
        'pico_tipico_min_kw': round(float(p['kw_min'].max()), 1),
        'pico_tipico_max_kw': round(pico_max, 1),
        'pico_tipico_em': p['kw'].idxmax().isoformat(),
        'risco': risco,
        'aviso_sazonal': aviso,
        'meses_historico': [{'mes': str(m), 'pico_kw': round(v, 1),
                             'situacao': situacao(v, contratada, tolerancia)}
                            for m, v in sorted(mesmo_mes.items())],
    }
