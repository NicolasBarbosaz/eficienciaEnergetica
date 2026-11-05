from fastapi import APIRouter, UploadFile, File, Form
from app.services.importacao_service import ler_memoria_massa

router = APIRouter()

@router.post("/importacao/memoria-massa")
async def importar_memoria_massa(
    arquivo: UploadFile = File(...),
    nome_predio: str = Form(...),
    demanda_contratada: float = Form(...),
    unidade: str = Form(...)
):
    conteudo = await arquivo.read() 

    registros = ler_memoria_massa(conteudo)

    
    return {
        "mensagem": "Arquivo recebido com sucesso",
        "Nome_predio": nome_predio,
        "Demanda_contratada_kw": demanda_contratada,
        "Unidade": unidade,
        "total_registros": len(registros),
        "primeiros_registros": registros[:5]


    }