import io
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app.repositories.medicoes_repository import (
    buscar_info,
    caminho_medicoes,
    listar_medicoes,
    salvar_medicoes,
)


def _pasta_exemplos():
    return Path(__file__).resolve().parents[2] / 'exemplos'


def importar_exemplo():
    caminho = _pasta_exemplos() / 'memoria_massa_bobcat.csv'
    serie = ler_memoria_massa(caminho.read_bytes())
    info = {
        'arquivo': 'memoria_massa_bobcat.csv',
        'importado_em': datetime.now(timezone.utc).isoformat(),
        'origem': 'exemplo',
    }
    salvar_medicoes(serie, info)
    return resumo()


def resumo():
    serie = listar_medicoes()
    if serie is None or serie.empty:
        return None
    info = buscar_info() or {}
    importado_em_padrao = _modificacao_do_csv()
    return {
        'arquivo': info.get('arquivo', 'arquivo enviado'),
        'origem': info.get('origem', 'upload'),
        'importado_em': info.get('importado_em', importado_em_padrao),
        'inicio': serie.index[0].isoformat(),
        'fim': serie.index[-1].isoformat(),
        'intervalo_min': intervalo_min(serie),
        'total_leituras': int(len(serie)),
        'meses_sem_dados': _meses_sem_dados(serie),
    }


def _modificacao_do_csv():
    caminho = caminho_medicoes()
    if caminho.exists():
        return datetime.fromtimestamp(caminho.stat().st_mtime, tz=timezone.utc).isoformat()
    return datetime.now(timezone.utc).isoformat()


def _meses_sem_dados(serie):
    periodos = serie.index.to_period('M').unique()
    if len(periodos) == 0:
        return []
    faixa = pd.period_range(periodos.min(), periodos.max(), freq='M')
    presentes = {str(p) for p in periodos}
    return [str(p) for p in faixa if str(p) not in presentes]


# --- Cópia direta de referencia.py (seção 5.2: a nossa parte lê e grava no
# contrato; para não depender do commit 7, duplicamos a leitura aqui). ---

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
        linha = int(invalida.to_numpy().nonzero()[0][0]) + 2
        raise ValueError(f'Linha {linha}: data, hora ou demanda inválida.')
    if (kw < 0).any():
        linha = int((kw < 0).to_numpy().nonzero()[0][0]) + 2
        raise ValueError(f'Linha {linha}: demanda negativa.')

    serie = pd.Series(
        kw.to_numpy(dtype=float),
        index=pd.DatetimeIndex(quando, name='data_hora'),
        name='demanda_kw',
    )
    serie = serie[~serie.index.duplicated(keep='last')].sort_index()
    if serie.index[-1] - serie.index[0] < pd.Timedelta(days=7):
        raise ValueError('O arquivo precisa ter pelo menos 7 dias de leituras.')
    return serie


def intervalo_min(serie):
    return int(round(serie.index.to_series().diff().median() / pd.Timedelta(minutes=1)))
