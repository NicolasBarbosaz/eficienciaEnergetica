from fastapi import APIRouter
from app.services.demanda_service import verificar_risco

router = APIRouter()

@router.get("/verificarRisco")
def consultar_risco(demanda_prevista: float):
    resultado = verificar_risco(demanda_prevista)

    return resultado