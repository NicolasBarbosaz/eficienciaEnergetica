def verificar_risco(demanda_prevista, demanda_contratada):
    if demanda_prevista > demanda_contratada:
        return 'Alerta: a demanda prevista excede a contratada. Possivel Risco de ultrapassagem'

    return 'Dentro do limite'