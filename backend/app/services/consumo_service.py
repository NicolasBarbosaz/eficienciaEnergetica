from app.repositories.demanda_repository import listar_consumos

def buscar_consumos():
    consumos = listar_consumos()
    return consumos