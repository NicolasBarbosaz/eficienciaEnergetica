# language: pt

@RF012
Funcionalidade: RF012 - Dashboards

  Cenário: Resumo do painel bate com as medições
    Dado que existem medições de janeiro a março com contratada de 80 kW
    Quando consultar o resumo do painel
    Então o limite de multa deve ser 84 kW
    E o painel deve mostrar 1 mês com multa
    E o maior pico deve ser 90 kW em fevereiro