from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.configuracao_service import (
    ErroValidacao,
    atualizar_configuracao,
    obter_configuracao,
)


class EmpresaCorpo(BaseModel):
    razao_social: str
    cnpj: Optional[str] = None
    cidade_uf: str
    modalidade: Literal['verde', 'azul']


class ConfiguracaoCorpo(BaseModel):
    empresa: EmpresaCorpo
    demanda_contratada_kw: float
    tolerancia: float
    tarifa_demanda_rs_kw: float
    ponta_inicio: str
    ponta_fim: str
    fonte_dados: Literal['memoria_massa', 'iot']
    margem_seguranca_kw: float


router = APIRouter()


@router.get("/configuracao")
def consultar_configuracao():
    dados = obter_configuracao()
    if dados is None:
        raise HTTPException(status_code=404, detail="Contrato ainda não cadastrado")
    return dados


@router.put("/configuracao")
def salvar_configuracao(corpo: ConfiguracaoCorpo):
    try:
        return atualizar_configuracao(corpo.model_dump())
    except ErroValidacao as erro:
        raise HTTPException(status_code=422, detail=erro.erros)
