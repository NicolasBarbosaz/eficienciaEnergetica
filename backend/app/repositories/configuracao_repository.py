import json
import os
from pathlib import Path


def _pasta_dados():
    env = os.environ.get("ANTEVE_DATA_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / 'data'


def _caminho_configuracao():
    return _pasta_dados() / 'configuracao.json'


def buscar_configuracao():
    caminho = _caminho_configuracao()
    if not caminho.exists():
        return None
    with open(caminho, mode='r', encoding='utf-8') as arquivo:
        return json.load(arquivo)


def salvar_configuracao(dados):
    caminho = _caminho_configuracao()
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, mode='w', encoding='utf-8') as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)
    return dados
