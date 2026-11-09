from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.importacao_service import ler_memoria_massa
from app.repositories.medicoes_repository import salvar_medicoes
from datetime import datetime, timezone
from app.services.configuracao_service import obter_configuracao, atualizar_configuracao



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

    if demanda_contratada <= 0:
        raise HTTPException(
            status_code=400,
            detail="A demanda contratada deve ser maior que zero."
        )

    configuracao_atual = obter_configuracao()

    if configuracao_atual is None:
        raise HTTPException(
            status_code=400,
            detail="Configure os dados da empresa antes de importar o CSV"
        )


    nova_configuracao = {    #mantém as configurações da empresa e troca a demanda do predio
        
        **configuracao_atual, # os (**) é um recurso para nao precisar repetir a lista toda
        "demanda_contratada_kw": demanda_contratada
        
    }

    informacoes_arquivo = {
        "arquivo": arquivo.filename,
        "nome_predio": nome_predio.strip(),
        "demanda_contratada_kw": demanda_contratada,
        "importado_em": datetime.now(timezone.utc).isoformat(),
        "origem": "upload",
        "unidade_original": unidade,
        "unidade_armazenada": "KW"


    }

    salvar_medicoes(medicoes_demanda_kw, informacoes_arquivo)

    atualizar_configuracao(nova_configuracao)

    
    return {
        "mensagem": "Arquivo recebido e salvo com sucesso",
        "Nome_predio": nome_predio,
        "Demanda_contratada_kw": demanda_contratada,
        "Unidade": unidade,
        "total_registros": len(medicoes_demanda_kw),
        


    }