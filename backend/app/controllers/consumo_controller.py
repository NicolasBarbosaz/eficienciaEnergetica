from fastapi import APIRouter
from app.services.consumo_service import buscar_consumos

router = APIRouter()

@router.get("/consumos")
def listar_consumos():
    return buscar_consumos()
