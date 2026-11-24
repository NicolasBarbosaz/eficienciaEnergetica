# language: pt

@RF013
Funcionalidade: RF013 - Persistência dos dados

  Cenário: Configuração continua salva após reiniciar a API
    Dado que a configuração foi salva com demanda de 80 kW
    Quando a API for reiniciada
    Então a configuração consultada deve ter demanda de 80 kW

  Cenário: Consultar sem configuração salva
    Dado que nenhuma configuração foi salva
    Quando consultar a configuração
    Então o sistema deve informar que não existe configuração