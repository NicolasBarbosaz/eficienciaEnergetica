from fastapi import APIRouter, HTTPException

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
