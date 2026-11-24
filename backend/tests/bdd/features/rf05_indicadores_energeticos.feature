
# language: pt

@RF05
Funcionalidade: RF05 - Consultar indicadores energéticos

  Como gestor de uma empresa
  Quero consultar os indicadores históricos
  Para acompanhar o comportamento energético da empresa

  Cenário: Consultar indicadores com dados disponíveis
    Dado que existem medições energéticas e uma configuração cadastrada
    Quando consultar o resumo dos indicadores energéticos
    Então o sistema deve retornar os indicadores com sucesso
    E informar 24 meses no histórico e 21 meses com dados

  Cenário: Verificar os indicadores de demanda

    Dado que existem medições energéticas e uma configuração cadastrada
    Quando consultar o resumo dos indicadores energéticos
    Então o sistema deve informar demanda contratada de 80 kW
    E informar limite de ultrapassagem de 84 kW

  Cenário: Consultar indicadores sem medições
    Dado que existe uma configuração sem medições cadastradas
    Quando consultar o resumo dos indicadores energéticos
    Então o sistema deve informar que não existem medições
