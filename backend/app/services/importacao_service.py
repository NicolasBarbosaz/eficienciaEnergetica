import io #permite a leitura dos arquivos em memoria, trata um texto como se fosse um arquivo
import pandas as pd
from fastapi import HTTPException


def ler_csv(conteudo: bytes):
    # lê o csv nos dois formatos aceitos e devolve sempre as colunas timestamp e valor_eletricidade_original
    # formato padrão: timestamp,valor_eletricidade_original
    # formato da distribuidora: Data;Hora;Demanda ativa (kW), com data dd/mm/aaaa e vírgula decimal
    try:
        texto = conteudo.decode("utf-8-sig")  # o utf-8-sig tira o BOM que o Excel coloca no começo
    except UnicodeDecodeError:
        texto = conteudo.decode("latin-1")  # arquivos salvos pelo Excel no Windows

    primeira_linha = texto.split("\n", 1)[0]

    if ";" not in primeira_linha:  # formato padrão, separado por vírgula
        return pd.read_csv(io.StringIO(texto))

    df = pd.read_csv(io.StringIO(texto), sep=";", dtype=str)
    colunas = {coluna.strip().lower(): coluna for coluna in df.columns}
    coluna_kw = next((coluna for nome, coluna in colunas.items() if "(kw)" in nome), None)

    if "data" not in colunas or "hora" not in colunas or coluna_kw is None:
        return df  # a verificação de colunas recusa o arquivo com a mensagem de sempre

    valores = df[coluna_kw].str.strip()
    if valores.str.contains(",", regex=False).any():  # vírgula decimal: tira o ponto do milhar e troca a vírgula
        valores = valores.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)

    return pd.DataFrame({
        "timestamp": pd.to_datetime(
            df[colunas["data"]].str.strip() + " " + df[colunas["hora"]].str.strip(),
            dayfirst=True,
            errors="coerce"
        ),
        "valor_eletricidade_original": valores,
    })


def ler_memoria_massa(conteudo: bytes, unidade: str):

     unidade = unidade.strip().lower()

     if unidade not in ("kw","kwh"):
          raise HTTPException(
               status_code=400,
               detail="unidade de medida inválida. Informe kw ou kwh"
          )
     
     try:  #aqui ele tenta ler o arquivo e informe uma erro caso for vazio ou inválido
         df = ler_csv(conteudo)
     except (pd.errors.ParserError, UnicodeDecodeError, pd.errors.EmptyDataError):
          raise HTTPException(
               status_code=400,
               detail="Não foi possivel ler o csv. Verifique o arquivo enviado"
          )



     colunas_esperadas = ["timestamp", "valor_eletricidade_original"]

     if not all(coluna in df.columns for coluna in colunas_esperadas): #verifica se estao todas as colunas certas.
         
          raise HTTPException(
               status_code=400,
                detail="CSV inválido: colunas esperadas não encontradas."
            )

     
     df["valor_eletricidade_original"] = pd.to_numeric(
               df["valor_eletricidade_original"],
               errors="coerce"
          )

     if df.empty: #verifica se o arquivo não está vazio
          raise HTTPException(
               status_code=400,
               detail="CSV inválido: o arquivo não contém medições."
          )

     quantidade_ausentes = df["valor_eletricidade_original"].isna().sum()

     percentual_ausentes = quantidade_ausentes / len(df)

     print("Percentual de medições ausentes:", percentual_ausentes * 100)

     LIMITE_AUSENTES = 0.01

     if percentual_ausentes > LIMITE_AUSENTES:
          raise HTTPException(
               status_code=400,
               detail="CSV rejeitado: mais de 1% das medicões estão ausentes"
          )



     df = df.dropna(subset=["valor_eletricidade_original"]).copy()  #aqui remove as medições sem valor 

     df["timestamp"] = pd.to_datetime(
          df["timestamp"],
          errors="coerce"
     )


     if df["timestamp"].isna().any(): #verifica se a data é valida
          raise HTTPException(
               status_code=400,
               detail="CSV contém datas inválidas"          
          )

     if (df["valor_eletricidade_original"] < 0).any():
          raise HTTPException(
               status_code = 400,
               detail = "CSV contem valores de consumo negativos"
          )


     if df["timestamp"].duplicated().any():
          raise HTTPException(
               status_code=400,
               detail="O arquivo contém medições repetidas no mesmo horário"
          )


     
     datas_ordenadas = df["timestamp"].sort_values()

     intervalos = datas_ordenadas.diff().dropna() #calcula a diferença entre cada horario

     if intervalos.empty or (intervalos <= pd.Timedelta(0)).any():
          raise HTTPException(
               status_code=400,
               detail="Não foi possivel determinar o intervalo das medições"
          )



     intervalo_padrao = intervalos.mode().iloc[0] #identifica o intervalo com mais frequência no arquivo

     if (intervalos < intervalo_padrao).any():
          raise HTTPException(
               status_code=400,
               detail= "O arquivo contém intervalos menores que o padrão"
          )



     if unidade == "kwh" and intervalo_padrao != pd.Timedelta (hours=1):
          raise HTTPException(
               status_code=400,
               detail="Para arquivos em kwh, as medições devem ser de hora em hora"
          )

     if unidade == "kwh": 
          intervalo_horas = intervalo_padrao / pd.Timedelta(hours = 1) #converte o intervalo entre as leituras para horas
          valores_kw = df["valor_eletricidade_original"] / intervalo_horas

     else:
          valores_kw = df["valor_eletricidade_original"]


     medicoes_demanda_kw = pd.Series(
          valores_kw.to_numpy(),
          index=pd.DatetimeIndex(df["timestamp"], name="data_hora"),
          name = "demanda_kw"
     )
        
     

     return medicoes_demanda_kw


