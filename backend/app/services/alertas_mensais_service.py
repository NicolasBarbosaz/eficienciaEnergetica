from app.services.analise_service import (
    NOMES_MES,
    custo_mes,
    limite_multa,
    listar_picos_mensais,
    recomendacoes,
)


def _rotulo_longo(mes_str):
    """'2017-12' -> 'dezembro de 2017'."""
    ano, mes = mes_str.split('-')
    return f"{NOMES_MES[int(mes) - 1]} de {ano}"


def _fmt_kw(v):
    return f"{v:.1f}".replace('.', ',')


def _fmt_rs(v):
    inteiro, dec = f"{v:.2f}".split('.')
    inteiro_fmt = '{:,}'.format(int(inteiro)).replace(',', '.')
    return f"{inteiro_fmt},{dec}"


def listar_alertas(serie, config, previsao):
    alertas = []

    if previsao['risco'] in ('medio', 'alto'):
        mes_longo = _rotulo_longo(previsao['mes'])
        if previsao['risco'] == 'alto':
            titulo = f"Risco alto de multa em {mes_longo}"
        else:
            titulo = f"Atenção em {mes_longo}"
        alertas.append({
            'id': 'proximo-mes',
            'tipo': 'risco_proximo_mes',
            'nivel': previsao['risco'],
            'titulo': titulo,
            'mensagem': f"{previsao['aviso_sazonal']} Veja as recomendações.",
            'mes': previsao['mes'],
        })

    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    tarifa = config['tarifa_demanda_rs_kw']
    limite = round(limite_multa(contratada, tolerancia), 2)

    picos = listar_picos_mensais(serie, config)
    com_multa = sorted(
        [p for p in picos if p['situacao'] == 'multa'],
        key=lambda p: p['mes'],
        reverse=True,
    )
    for p in com_multa:
        pico = p['pico_kw']
        _, ultrapassagem = custo_mes(contratada, pico, tarifa, tolerancia)
        acima = round(pico - limite, 2)
        alertas.append({
            'id': f"multa-{p['mes']}",
            'tipo': 'multa_registrada',
            'nivel': 'multa',
            'titulo': f"Multa em {_rotulo_longo(p['mes'])}",
            'mensagem': (
                f"Pico de {_fmt_kw(pico)} kW, {_fmt_kw(acima)} kW acima do limite de "
                f"{_fmt_kw(limite)} kW: R$ {_fmt_rs(ultrapassagem)} de ultrapassagem."
            ),
            'mes': p['mes'],
        })

    return alertas


def buscar_alerta(id_, serie, config, previsao):
    alertas = listar_alertas(serie, config, previsao)
    alerta = next((a for a in alertas if a['id'] == id_), None)
    if alerta is None:
        return None

    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    limite = round(limite_multa(contratada, tolerancia), 2)

    if alerta['tipo'] == 'risco_proximo_mes':
        detalhe = {
            'limite_kw': limite,
            'previsao': previsao,
            'recomendacoes': recomendacoes(serie, config),
        }
    else:
        tarifa = config['tarifa_demanda_rs_kw']
        picos = listar_picos_mensais(serie, config)
        do_mes = next(p for p in picos if p['mes'] == alerta['mes'])
        pico = do_mes['pico_kw']
        _, ultrapassagem = custo_mes(contratada, pico, tarifa, tolerancia)
        detalhe = {
            'pico_kw': pico,
            'limite_kw': limite,
            'ultrapassagem_rs': ultrapassagem,
        }
    return {**alerta, 'detalhe': detalhe}
