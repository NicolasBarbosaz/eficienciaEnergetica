from fastapi import APIRouter
from app.services.alerta_service import gerar_alerta_risco

router = APIRouter()



@router.get("/alerta/risco")
def consultar_alerta_risco(demanda_prevista: float):

    return gerar_alerta_risco(demanda_prevista)