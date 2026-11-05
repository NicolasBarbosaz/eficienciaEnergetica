from fastapi import APIRouter, HTTPException

from app.repositories.medicoes_repository import listar_medicoes
from app.services import analise_service
from app.services.configuracao_service import obter_configuracao
from app.services.medicoes_service import importar_exemplo, resumo

router = APIRouter()


@router.post("/medicoes/exemplo")
def importar_exemplo_memoria_massa():
    return importar_exemplo()


@router.get("/medicoes/resumo")
def consultar_resumo_medicoes():
    dados = resumo()
    if dados is None:
        raise HTTPException(status_code=404, detail="Nenhuma memória de massa enviada")
    return dados


def _contexto():
    serie = listar_medicoes()
    if serie is None or serie.empty:
        raise HTTPException(status_code=404, detail="Nenhuma memória de massa enviada")
    config = obter_configuracao()
    if config is None:
        raise HTTPException(status_code=409, detail="Cadastre o contrato em Configurações")
    return serie, config


@router.get("/analise/resumo")
def consultar_resumo_analise():
    serie, config = _contexto()
    return analise_service.resumo_analise(serie, config)


@router.get("/analise/picos-mensais")
def consultar_picos_mensais():
    serie, config = _contexto()
    return analise_service.listar_picos_mensais(serie, config)


@router.get("/analise/mapa-picos")
def consultar_mapa_picos():
    serie, config = _contexto()
    return analise_service.mapa_picos(serie, config)


@router.get("/analise/contrato-ideal")
def consultar_contrato_ideal():
    serie, config = _contexto()
    return analise_service.contrato_ideal(serie, config)


@router.get("/analise/recomendacoes")
def consultar_recomendacoes():
    serie, config = _contexto()
    return analise_service.recomendacoes(serie, config)
