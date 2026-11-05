import io #permite a leitura dos arquivos em memoria, trata um texto como se fosse um arquivo
import pandas as pd
from fastapi import HTTPException


def ler_memoria_massa(conteudo: bytes):

     df = pd.read_csv(io.BytesIO(conteudo))
     colunas_esperadas = ["timestamp", "valor_eletricidade_original"]

     if not all(coluna in df.columns for coluna in colunas_esperadas):
         
          raise HTTPException(
               status_code=400,
                detail="CSV inválido: colunas esperadas não encontradas."
            )
     df["valor_eletricidade_original"] = pd.to.numeric(
          df["Valor_eletricidade_original"],
          errors="coerce"
     )

     if df["Valor_eletricidade_original"].isna().any():
          raise HTTPException(
               status_code=400,
               detail="CSV contém medições ausentes ou inválidas"  
                 )

     registros = df.to_dict(orient='records')

     return registros


