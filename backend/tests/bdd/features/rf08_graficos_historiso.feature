# language: pt

@RF08
Funcionalidade: RF08 - Gráficos históricos

  Cenário: Pico de cada mês corresponde às medições
    Dado que existem medições de janeiro a março com contratada de 80 kW
    Quando consultar os picos mensais
    Então o pico de janeiro deve ser 70 kW e a situação dentro
    E o pico de fevereiro deve ser 90 kW e a situação multa
    E o pico de março deve ser 82 kW e a situação acima_contratado

    
  Cenário: Mês sem medições aparece como sem dados
    Dado que existem medições em janeiro e março, sem nenhuma em fevereiro
    Quando consultar os picos mensais
    Então a lista deve ter 3 meses
    E o mês de fevereiro deve aparecer como sem_dados