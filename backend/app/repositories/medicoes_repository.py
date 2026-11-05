import json
import os
from pathlib import Path

import pandas as pd


def _pasta_dados():
    env = os.environ.get("ANTEVE_DATA_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / 'data'


def caminho_medicoes():
    return _pasta_dados() / 'medicoes.csv'


def caminho_info():
    return _pasta_dados() / 'medicoes_info.json'


def listar_medicoes():
    caminho = caminho_medicoes()
    if not caminho.exists():
        return None
    df = pd.read_csv(caminho, parse_dates=['data_hora'])
    if df.empty:
        return None
    serie = pd.Series(
        df['demanda_kw'].to_numpy(dtype=float),
        index=pd.DatetimeIndex(df['data_hora'], name='data_hora'),
        name='demanda_kw',
    )
    return serie


def buscar_info():
    caminho = caminho_info()
    if not caminho.exists():
        return None
    with open(caminho, mode='r', encoding='utf-8') as arquivo:
        return json.load(arquivo)


def salvar_medicoes(serie, info):
    caminho_csv = caminho_medicoes()
    caminho_csv.parent.mkdir(parents=True, exist_ok=True)

    serie_ordenada = serie[~serie.index.duplicated(keep='last')].sort_index()
    df = pd.DataFrame({
        'data_hora': [t.isoformat() for t in serie_ordenada.index],
        'demanda_kw': serie_ordenada.to_numpy(dtype=float),
    })
    df.to_csv(caminho_csv, index=False)

    if info is not None:
        caminho_json = caminho_info()
        with open(caminho_json, mode='w', encoding='utf-8') as arquivo:
            json.dump(info, arquivo, ensure_ascii=False, indent=2)
