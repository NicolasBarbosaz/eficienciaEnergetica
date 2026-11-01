from app.services.demanda_service import verificar_risco

def gerar_alerta_risco(demanda_prevista):

    resultado = verificar_risco(demanda_prevista)

    if resultado['risco']:

        return {
            
            "tipo": "risco_ultrapassagem",
            "demanda_prevista_kw": resultado["demanda_prevista"],
            "demanda_contratada_kw": resultado["demanda_contratada"],
            "nivel": "critico",
            "mensagem": "Risco de ultrapassar a demanda contratada",
            "diferenca_kw": resultado["diferenca_kw"],
            "acao_recomendada": "Verificar equipamentos de maior potência."
        }

    return{
      
        "nivel": "normal",
        "mensagem": "Demanda dentro do limite contratado",
        "diferenca_kw": resultado["diferenca_kw"],
        "acao_recomendada": "Nenhuma ação necessária"
    }