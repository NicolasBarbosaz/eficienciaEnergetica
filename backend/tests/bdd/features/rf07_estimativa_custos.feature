
# language: pt

@RF07
Funcionalidade: RF07 - Estimar custos de ultrapassagem

  Como gestor de uma empresa
  Quero consultar os custos das ultrapassagens
  Para compreender o impacto financeiro da demanda

  Cenário: Consultar o custo total das ultrapassagens

    Dado que existem medições e uma configuração para calcular custos
    Quando consultar o resumo dos custos de demanda
    Então o sistema deve retornar o resumo financeiro
    E informar custo total de ultrapassagem de 3402,96 reais

  Cenário: Consultar os custos mensais das ultrapassagens

    Dado que existem medições e uma configuração para calcular custos
    Quando consultar os custos mensais da demanda
    Então os meses com multa devem apresentar custo de ultrapassagem positivo
    E os meses sem multa devem apresentar custo de ultrapassagem igual a zero

  Cenário: Consultar custos sem medições

    Dado que existe uma configuração para calcular custos sem medições
    Quando consultar o resumo dos custos de demanda
    Então o sistema deve informar que não existem medições para calcular custos
    E retornar o código HTTP 404
