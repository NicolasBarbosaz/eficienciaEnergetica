from app.repositories.demanda_repository import buscar_demanda_contratada
from app.services.consumo_service import buscar_consumos


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


def verificar_ultrapassagens():

    consumos = buscar_consumos()
    ultrapassagens =[]
    diferenca = 0

    for consumo in consumos:

        if consumo['demanda_medida_kw'] > consumo['demanda_contratada_kw']:

            diferenca = consumo['demanda_medida_kw'] - consumo['demanda_contratada_kw']
            consumo['ultrapassagem_kw'] = diferenca

            ultrapassagens.append(consumo)



    return ultrapassagens


def contar_ultrapassagens():

    ultrapassagens = verificar_ultrapassagens()

    quantidade = len(ultrapassagens)

    return quantidade

def calcular_maior_ultrapassagem():
    ultrapassagens = verificar_ultrapassagens()

    if not ultrapassagens: 
        return None

    maior = max(
        ultrapassagens, 
        key=lambda consumo: consumo['ultrapassagem_kw']
    )
    return maior


def obter_indicadores_demanda():

    quantidade = contar_ultrapassagens()
    maior = calcular_maior_ultrapassagem()

    return{
        "quantidade_ultrapassagens": quantidade,
        "maior_ultrapassagem": maior
    }
      