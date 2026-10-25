from fastapi import FastAPI
from app.controllers.status_controller import router as status_router #registra as rotas do controller

app = FastAPI(

    title = 'Eficiência Energetica API',
    description = 'API para análise e previão de demanda energética',
    version = '1.0.0'
)


app.include_router(status_router)