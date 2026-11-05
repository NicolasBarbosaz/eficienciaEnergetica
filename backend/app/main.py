from fastapi import FastAPI
from app.controllers.demanda_controller import router as demanda_router#registra as rotas do controlle
from app.controllers.consumo_controller import router as consumo_router 
from app.controllers.alerta_controller import router as alerta_router
from app.controllers.importacao_controller import router as importacao_router


app = FastAPI(

    title = 'Antevê API',
    description = 'API para análise e previão de demanda energética',
    version = '1.0.0'
)

app.include_router(demanda_router)
app.include_router(consumo_router)
app.include_router(alerta_router)
app.include_router(importacao_router)

