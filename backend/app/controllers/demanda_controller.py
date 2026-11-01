from fastapi import APIRouter
from app.services.demanda_service import verificar_ultrapassagens, obter_indicadores_demanda

router = APIRouter()

@router.get("/demanda/ultrapassagens")
def consultar_ultrapassagens():

    resultado = verificar_ultrapassagens()

    return resultado


@router.get("/demanda/indicadores")
def consultar_indicadores_demanda():

    resultado = obter_indicadores_demanda()

    return resultado