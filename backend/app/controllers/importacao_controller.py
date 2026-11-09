from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.importacao_service import ler_memoria_massa
from app.repositories.medicoes_repository import salvar_medicoes
from datetime import datetime, timezone

router = APIRouter()

@router.post("/importacao/memoria-massa")
async def importar_memoria_massa(
    arquivo: UploadFile = File(...),
    nome_predio: str = Form(...),
    demanda_contratada: float = Form(...),
    unidade: str = Form(...)
):

    if unidade.strip().lower() != "kwh":
        raise HTTPException(
            status_code=400,
            detail="para este formato de arquivo, informe a unidade kwh"
        )
    conteudo = await arquivo.read() 

    medicoes_demanda_kw = ler_memoria_massa(conteudo, unidade)

    informacoes_arquivo = {
        "arquivo": arquivo.filename,
        "importado_em": datetime.now(timezone.utc).isoformat(),
        "origem": "upload",
        "unidade_original": unidade,
        "unidade_armazenada": "KW"


    }

    salvar_medicoes(medicoes_demanda_kw, informacoes_arquivo)

    
    return {
        "mensagem": "Arquivo recebido e salvo com sucesso",
        "Nome_predio": nome_predio,
        "Demanda_contratada_kw": demanda_contratada,
        "Unidade": unidade,
        "total_registros": len(medicoes_demanda_kw),
        


    }