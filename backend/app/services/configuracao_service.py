from datetime import datetime, timezone

from app.repositories.configuracao_repository import (
    buscar_configuracao,
    salvar_configuracao,
)


class ErroValidacao(Exception):
    def __init__(self, erros):
        self.erros = erros
        super().__init__(f"{len(erros)} erro(s) de validação")


def obter_configuracao():
    dados = buscar_configuracao()
    if dados is None:
        return None
    return _com_calculados(dados)


def atualizar_configuracao(dados):
    erros = _validar(dados)
    if erros:
        raise ErroValidacao(erros)
    dados = {**dados, 'atualizado_em': datetime.now(timezone.utc).isoformat()}
    salvar_configuracao(dados)
    return _com_calculados(dados)


def _com_calculados(dados):
    contratada = float(dados.get('demanda_contratada_kw', 0))
    tolerancia = float(dados.get('tolerancia', 0))
    limite = round(contratada * (1 + tolerancia), 2)
    return {**dados, 'limite_multa_kw': limite}


def _validar(dados):
    erros = []

    def adicionar(campo, mensagem):
        erros.append({'campo': campo, 'mensagem': mensagem})

    empresa = dados.get('empresa') or {}
    if not empresa.get('razao_social'):
        adicionar('empresa.razao_social', 'Informe a razão social')
    if not empresa.get('cidade_uf'):
        adicionar('empresa.cidade_uf', 'Informe a cidade e UF')
    if empresa.get('modalidade') not in ('verde', 'azul'):
        adicionar('empresa.modalidade', "Modalidade deve ser 'verde' ou 'azul'")

    try:
        contratada = float(dados.get('demanda_contratada_kw'))
        if contratada <= 0:
            adicionar('demanda_contratada_kw', 'A demanda contratada deve ser maior que zero')
    except (TypeError, ValueError):
        adicionar('demanda_contratada_kw', 'Informe uma demanda válida')

    try:
        tolerancia = float(dados.get('tolerancia'))
        if tolerancia < 0 or tolerancia > 0.2:
            adicionar('tolerancia', 'A tolerância deve estar entre 0 e 0,2')
    except (TypeError, ValueError):
        adicionar('tolerancia', 'Informe uma tolerância válida')

    try:
        tarifa = float(dados.get('tarifa_demanda_rs_kw'))
        if tarifa <= 0:
            adicionar('tarifa_demanda_rs_kw', 'A tarifa deve ser maior que zero')
    except (TypeError, ValueError):
        adicionar('tarifa_demanda_rs_kw', 'Informe uma tarifa válida')

    inicio = dados.get('ponta_inicio')
    fim = dados.get('ponta_fim')
    inicio_ok = _hora_valida(inicio)
    fim_ok = _hora_valida(fim)
    if not inicio_ok:
        adicionar('ponta_inicio', 'Horário em formato HH:MM')
    if not fim_ok:
        adicionar('ponta_fim', 'Horário em formato HH:MM')
    if inicio_ok and fim_ok and inicio == fim:
        adicionar('ponta_fim', 'O fim da ponta deve ser diferente do início')

    if dados.get('fonte_dados') not in ('memoria_massa', 'iot'):
        adicionar('fonte_dados', "Fonte deve ser 'memoria_massa' ou 'iot'")

    try:
        margem = float(dados.get('margem_seguranca_kw'))
        if margem < 0:
            adicionar('margem_seguranca_kw', 'A margem de segurança não pode ser negativa')
    except (TypeError, ValueError):
        adicionar('margem_seguranca_kw', 'Informe uma margem válida')

    return erros


def _hora_valida(texto):
    if not isinstance(texto, str) or len(texto) != 5 or texto[2] != ':':
        return False
    try:
        horas = int(texto[:2])
        minutos = int(texto[3:])
    except ValueError:
        return False
    return 0 <= horas < 24 and 0 <= minutos < 60
