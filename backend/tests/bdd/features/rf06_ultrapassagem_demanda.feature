
# language: pt

@RF06
Funcionalidade: RF06 - Identificar ultrapassagens da demanda contratada

  Como gestor de uma empresa
  Quero identificar os meses com ultrapassagem da demanda
  Para acompanhar situações que podem gerar multas

  Cenário: Identificar meses com ultrapassagem

    Dado que existem medições e uma demanda contratada configurada
    Quando consultar os picos mensais de demanda
    Então o sistema deve retornar os picos mensais
    E identificar meses com multa por ultrapassagem

  Cenário: Identificar meses dentro do limite

    Dado que existem medições e uma demanda contratada configurada
    Quando consultar os picos mensais de demanda
    Então o sistema deve identificar meses dentro do limite

  Cenário: Consultar ultrapassagens sem medições
  
    Dado que existe uma demanda configurada sem medições
    Quando consultar os picos mensais de demanda
    Então o sistema deve informar a ausência de medições
