from fastapi import APIRouter

router = APIRouter() #aqui cria o objeto para agrupar as rotas do controller

@router.get('/status')
def verificar_status():
    return {'message': 'API de Eficiência Energetica está funcionando'}

