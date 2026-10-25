from app.repositories.demanda_repository import buscar_demanda_contratada

def verificar_risco(demanda_prevista):
    demanda_contratada = buscar_demanda_contratada()

    diferenca = demanda_prevista - demanda_contratada

    if diferenca > 0:
        mensagem = 'Risco de ultrapassagem da demanda contratada'
        risco = True
    else: 
        mensagem = 'Demanda dentro do limite contratado'
        risco = False

    return {

        "demanda_prevista": demanda_prevista,
        "demanda_contratada": demanda_contratada,
        "diferenca_kw": diferenca,
        "risco": risco,
        "mensagem": mensagem
    }

      