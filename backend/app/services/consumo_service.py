from app.repositories.demanda_repository import listar_consumos

def buscar_consumos():
    consumos = listar_consumos()
   


    for consumo in consumos:  #aqui percorre a lista de consumo e converte tudo para float, pois antes eram tudo string

     consumo['consumo_kwh'] = float(consumo['consumo_kwh'])
     consumo['demanda_contratada_kw'] = float(consumo['demanda_contratada_kw'])
     consumo['demanda_medida_kw'] = float(consumo['demanda_medida_kw'])

    return consumos



def calcular_consumo_total():
    consumos = buscar_consumos()
    total = 0

    for consumo in consumos:
        total += consumo['consumo_kwh']

    return total



def calcular_media_consumo():

   consumos = buscar_consumos()
   total = calcular_consumo_total()

   quantidade_meses = len(consumos) # o len busca a quantidade de elementos que existe na lista de consumo, no caso a quantidade de meses q tem la 

   if quantidade_meses > 0:

     media = total / quantidade_meses

   else:
        
        media = 0

    
   return round(media, 2) #o round arredonda o valor para a quantidade de casas decimais (no caso 2 casas)



def calcular_maior_consumo():
    consumos = buscar_consumos()

    if not consumos:  # verificar se a lista de consumos está vazia
   
     return None

    maior = max(consumos, key=lambda consumo: consumo["consumo_kwh"]) # o key serve para dizer qual campo da lista ele vai comparar e o lambda pega os valores do campo e compara

    return maior



def calcular_menor_consumo():
   consumos = buscar_consumos()

   if not consumos:
      return None

   menor = min(consumos, key=lambda consumo: consumo["consumo_kwh"])

   return menor

def obter_indicadores():

   total = calcular_consumo_total()
   media = calcular_media_consumo()
   maior = calcular_maior_consumo()
   menor = calcular_menor_consumo()

   return {


      "consumo_total_kwh": total,
      "consumo_media_kwh": media,
      "maior_consumo_kwh": maior,
      "menor_consumo_kwh": menor
   }