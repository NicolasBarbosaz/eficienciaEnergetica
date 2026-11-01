from fastapi import APIRouter
from app.services.consumo_service import buscar_consumos, calcular_consumo_total, calcular_media_consumo, calcular_maior_consumo, calcular_menor_consumo, obter_indicadores

router = APIRouter()



@router.get("/consumos")

def listar_consumos():
    return buscar_consumos()





@router.get("/consumos/total")

def obter_consumo_total():

    total = calcular_consumo_total()

    return {
        "consumo_total_kwh": total
    }



@router.get("/consumos/media")

def obter_media_consumo():

    media = calcular_media_consumo()

    return {
          "consumo_media_kwh": media
    }


@router.get("/consumo/maior")

def obter_maior_consumo():

    maior = calcular_maior_consumo()

    return {
        "maior_consumo": maior
    }



@router.get("/consumo/menor")

def obter_menor_consumo():

    menor = calcular_menor_consumo()

    return {
        "menor_consumo": menor
    }

@router.get("/consumo/indicadores")

def obter_indicadores_consumo():
    indicadores = obter_indicadores()

    return indicadores