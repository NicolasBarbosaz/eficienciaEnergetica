from fastapi import FastAPI
from app.controllers.status_controller import router as status_router #registra as rotas do controller
from app.controllers.demanda_controller import router as demanda_router
from app.controllers.consumo_controller import router as consumo_router 



app = FastAPI(

    title = 'Eficiência Energetica API',
    description = 'API para análise e previão de demanda energética',
    version = '1.0.0'
)


app.include_router(status_router)
app.include_router(demanda_router)
app.include_router(consumo_router)

