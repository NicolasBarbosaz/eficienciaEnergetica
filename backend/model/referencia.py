"""Antevê: implementação de referência dos cálculos e da previsão (memória de massa).

Os services do backend seguem estas funções, e os testes comparam com os valores do README.
"""
import io
import math
import unicodedata

import pandas as pd

TOLERANCIA = 0.05
FEATURES = ['hora', 'dia_semana', 'mes', 'fim_de_semana', 'lag_1h', 'lag_24h', 'lag_168h', 'media_24h']
NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
             'setembro', 'outubro', 'novembro', 'dezembro']


def arred(v):
    """Centavos, como na fatura."""
    return round(v + 1e-9, 2)


# ---------- Regras de negócio (ANEEL) ----------

def limite_multa(contratada, tolerancia=TOLERANCIA):
    return contratada * (1 + tolerancia)


def situacao(pico, contratada, tolerancia=TOLERANCIA):
    """'dentro' (até a contratada), 'acima_contratado' (até o limite, sem multa) ou 'multa'."""
    if round(pico, 3) > round(limite_multa(contratada, tolerancia), 3):
        return 'multa'
    if round(pico, 3) > round(contratada, 3):
        return 'acima_contratado'
    return 'dentro'


def custo_mes(contratada, pico, tarifa, tolerancia=TOLERANCIA):
    """(demanda faturada, ultrapassagem) em R$: paga o maior entre contratada e medida e,
    acima do limite, mais 2 x tarifa sobre (medida - contratada)."""
    faturada = arred(max(contratada, pico) * tarifa)
    multa = situacao(pico, contratada, tolerancia) == 'multa'
    ultrapassagem = arred((pico - contratada) * 2 * tarifa) if multa else 0.0
    return faturada, ultrapassagem


# ---------- Leitura do arquivo ----------

def _normal(texto):
    sem_acento = unicodedata.normalize('NFD', str(texto))
    return ''.join(c for c in sem_acento if unicodedata.category(c) != 'Mn').strip().lower()


def ler_memoria_massa(conteudo: bytes) -> pd.Series:
    """CSV de memória de massa -> demanda em kW indexada por data_hora (ordenada, sem duplicadas).

    Aceita o formato de distribuidora (Data;Hora;Demanda ... (kW), data dd/mm/aaaa, decimal com
    vírgula) e o simples (data_hora,demanda_kw, data ISO). Erros saem como ValueError em português.
    """
    texto = None
    for codificacao in ('utf-8-sig', 'latin-1'):
        try:
            texto = conteudo.decode(codificacao)
            break
        except UnicodeDecodeError:
            continue
    if not texto or not texto.strip():
        raise ValueError('O arquivo está vazio.')
    cabecalho = texto.splitlines()[0]
    sep = ';' if cabecalho.count(';') >= cabecalho.count(',') else ','
    df = pd.read_csv(io.StringIO(texto), sep=sep, dtype=str, skip_blank_lines=True)
    nomes = {c: _normal(c) for c in df.columns}
    col_kw = next((c for c, n in nomes.items() if 'kw' in n and 'kwh' not in n), None)
    col_dh = next((c for c, n in nomes.items() if n.replace(' ', '_') in ('data_hora', 'datahora')), None)
    col_d = next((c for c, n in nomes.items() if n.startswith('data') and c != col_dh), None)
    col_h = next((c for c, n in nomes.items() if n.startswith('hora')), None)
    if col_kw is None or (col_dh is None and (col_d is None or col_h is None)):
        raise ValueError('Não encontrei as colunas: o arquivo precisa ter data, hora e demanda em kW.')

    if col_dh is not None:
        quando = pd.to_datetime(df[col_dh].str.strip(), errors='coerce')
    else:
        dh = df[col_d].str.strip() + ' ' + df[col_h].str.strip()
        quando = pd.to_datetime(dh, format='%d/%m/%Y %H:%M', errors='coerce')
        faltou = quando.isna()
        if faltou.any():
            quando[faltou] = pd.to_datetime(dh[faltou], format='%d/%m/%Y %H:%M:%S', errors='coerce')
    bruto = df[col_kw].astype(str).str.strip()
    if bruto.str.contains(',', regex=False).any():
        bruto = bruto.str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
    kw = pd.to_numeric(bruto, errors='coerce')

    invalida = quando.isna() | kw.isna()
    if invalida.any():
        linha = int(invalida.to_numpy().nonzero()[0][0]) + 2  # +1 do cabeçalho, +1 por começar em 1
        raise ValueError(f'Linha {linha}: data, hora ou demanda inválida.')
    if (kw < 0).any():
        linha = int((kw < 0).to_numpy().nonzero()[0][0]) + 2
        raise ValueError(f'Linha {linha}: demanda negativa.')

    serie = pd.Series(kw.to_numpy(dtype=float), index=pd.DatetimeIndex(quando, name='data_hora'),
                      name='demanda_kw')
    serie = serie[~serie.index.duplicated(keep='last')].sort_index()
    if serie.index[-1] - serie.index[0] < pd.Timedelta(days=7):
        raise ValueError('O arquivo precisa ter pelo menos 7 dias de leituras.')
    return serie


def intervalo_min(serie):
    return int(round(serie.index.to_series().diff().median() / pd.Timedelta(minutes=1)))


# ---------- Análise mensal ----------

def picos_mensais(serie):
    """{Period('AAAA-MM'): pico em kW ou None}, do primeiro ao último mês do arquivo."""
    por_mes = serie.groupby(serie.index.to_period('M')).max()
    meses = pd.period_range(por_mes.index.min(), por_mes.index.max(), freq='M')
    return {m: (float(por_mes[m]) if m in por_mes.index else None) for m in meses}


def consumo_mensal_kwh(serie):
    horas = intervalo_min(serie) / 60
    return (serie * horas).groupby(serie.index.to_period('M')).sum().round(1).to_dict()


def simular_contrato(picos, contratada_atual, tarifa, margem=1.0, tolerancia=TOLERANCIA, faixa=None):
    """Custo de demanda no período para cada valor de contrato.

    ótimo = menor custo. recomendado = o mais barato entre o ótimo e o ótimo + 5 kW com pelo menos
    `margem` kW de folga em todos os meses que ficam sem multa (se nenhum, o próprio ótimo).
    sem_multa = menor contrato sem multa em nenhum mês e com essa folga.
    """
    validos = [p for p in picos.values() if p is not None]
    if faixa is None:
        c_min = math.floor(min(validos))
        c_max = math.ceil((max(validos) + margem) / (1 + tolerancia)) + 5
        faixa = range(c_min, c_max + 1)

    def calcular(c):
        faturada = ultrapassagem = 0.0
        multas = 0
        for p in validos:
            f, u = custo_mes(c, p, tarifa, tolerancia)
            faturada += f
            ultrapassagem += u
            multas += u > 0
        folgas = [limite_multa(c, tolerancia) - p for p in validos if situacao(p, c, tolerancia) != 'multa']
        return {
            'contratada_kw': c,
            'custo_rs': arred(faturada + ultrapassagem),
            'ultrapassagem_rs': arred(ultrapassagem),
            'meses_com_multa': int(multas),
            'folga_pior_mes_kw': round(limite_multa(c, tolerancia) - max(validos), 2),
            'folga_minima_kw': round(min(folgas), 2) if folgas else None,
        }

    atual = calcular(contratada_atual)
    curva = [calcular(c) for c in faixa]
    for r in curva + [atual]:
        r['economia_rs'] = arred(atual['custo_rs'] - r['custo_rs'])
    otimo = min(curva, key=lambda r: (r['custo_rs'], r['contratada_kw']))
    recomendado = next((r for r in curva
                        if otimo['contratada_kw'] <= r['contratada_kw'] <= otimo['contratada_kw'] + 5
                        and r['folga_minima_kw'] is not None and r['folga_minima_kw'] >= margem), otimo)
    sem_multa = next((r for r in curva if r['meses_com_multa'] == 0
                      and r['folga_minima_kw'] is not None and r['folga_minima_kw'] >= margem), None)
    return {'atual': atual, 'otimo': otimo, 'recomendado': recomendado, 'sem_multa': sem_multa,
            'curva': curva}


# ---------- Previsão (LightGBM) ----------

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
            'dia_semana': alvo.dayofweek,
            'mes': alvo.month,
            'fim_de_semana': int(alvo.dayofweek >= 5),
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
    """Consumo e pico típico do mês seguinte ao da última leitura (modelo) + risco (histórico)."""
    h = serie_horaria(serie)
    ultimo = h.index[-1]
    proximo = ultimo.to_period('M') + 1
    ultima_hora = (proximo + 1).start_time - pd.Timedelta(hours=1)
    horas = int((ultima_hora - ultimo) / pd.Timedelta(hours=1))
    p = prever(h, horas, central, p10, p90)
    p = p[p.index.to_period('M') == proximo]

    picos = picos_mensais(serie)
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
