import csv 
from pathlib import Path #vai ajudar a trabalhar com caminhos de arquivos e pastas.

def buscar_demanda_contratada():
 return 80.0



def listar_consumos():
    caminho_arquivo = Path(__file__).resolve().parents[2] / 'data' / 'consumo.csv'

    with open(caminho_arquivo, mode='r', encoding='utf-8', newline='') as arquivo: #aqui ele abre o arquivo e o with garante que ele será fechado depois de ser usado.

        leitor = csv.DictReader(arquivo) #aqui transforma o arquivo em uma tabela com coluna, como: mes: janeiro, consumo: 1000.0

        return list(leitor)
