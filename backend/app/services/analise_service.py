import math

import pandas as pd

from app.services.demanda_service import verificar_risco


TOLERANCIA = 0.05
NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
             'setembro', 'outubro', 'novembro', 'dezembro']
_MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
DIAS_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']


# --- Cópia direta de referencia.py (seção 5.3) ---

def arred(v):
    """Centavos, como na fatura."""
    return round(v + 1e-9, 2)


def limite_multa(contratada, tolerancia=TOLERANCIA):
    return contratada * (1 + tolerancia)


def situacao(pico, contratada, tolerancia=TOLERANCIA):
    """'dentro' (até a contratada), 'acima_contratado' (até o limite, sem multa) ou 'multa'."""
    if round(pico, 3) > round(limite_multa(contratada, tolerancia), 3):
        return 'multa'
    if round(pico, 3) > round(contratada, 3):
        return 'acima_contratado'
    return 'dentro'


def custo_mes(contratada, pico, tarifa, tolerancia=TOLERANCIA):
    """(demanda faturada, ultrapassagem) em R$."""
    faturada = arred(max(contratada, pico) * tarifa)
    multa = situacao(pico, contratada, tolerancia) == 'multa'
    ultrapassagem = arred((pico - contratada) * 2 * tarifa) if multa else 0.0
    return faturada, ultrapassagem


def picos_mensais(serie):
    por_mes = serie.groupby(serie.index.to_period('M')).max()
    meses = pd.period_range(por_mes.index.min(), por_mes.index.max(), freq='M')
    return {m: (float(por_mes[m]) if m in por_mes.index else None) for m in meses}


def _intervalo_min(serie):
    return int(round(serie.index.to_series().diff().median() / pd.Timedelta(minutes=1)))


def consumo_mensal_kwh(serie):
    horas = _intervalo_min(serie) / 60
    return (serie * horas).groupby(serie.index.to_period('M')).sum().round(1).to_dict()


def simular_contrato(picos, contratada_atual, tarifa, margem=1.0, tolerancia=TOLERANCIA, faixa=None):
    validos = [p for p in picos.values() if p is not None]
    if faixa is None:
        c_min = math.floor(min(validos))
        c_max = math.ceil((max(validos) + margem) / (1 + tolerancia)) + 5
        faixa = range(c_min, c_max + 1)

    def calcular(c):
        faturada = ultrapassagem = 0.0
        multas = 0
        for p in validos:
            f, u = custo_mes(c, p, tarifa, tolerancia)
            faturada += f
            ultrapassagem += u
            multas += u > 0
        folgas = [limite_multa(c, tolerancia) - p for p in validos if situacao(p, c, tolerancia) != 'multa']
        return {
            'contratada_kw': c,
            'custo_rs': arred(faturada + ultrapassagem),
            'ultrapassagem_rs': arred(ultrapassagem),
            'meses_com_multa': int(multas),
            'folga_pior_mes_kw': round(limite_multa(c, tolerancia) - max(validos), 2),
            'folga_minima_kw': round(min(folgas), 2) if folgas else None,
        }

    atual = calcular(contratada_atual)
    curva = [calcular(c) for c in faixa]
    for r in curva + [atual]:
        r['economia_rs'] = arred(atual['custo_rs'] - r['custo_rs'])
    otimo = min(curva, key=lambda r: (r['custo_rs'], r['contratada_kw']))
    recomendado = next(
        (r for r in curva
         if otimo['contratada_kw'] <= r['contratada_kw'] <= otimo['contratada_kw'] + 5
         and r['folga_minima_kw'] is not None and r['folga_minima_kw'] >= margem),
        otimo,
    )
    sem_multa = next(
        (r for r in curva if r['meses_com_multa'] == 0
         and r['folga_minima_kw'] is not None and r['folga_minima_kw'] >= margem),
        None,
    )
    return {'atual': atual, 'otimo': otimo, 'recomendado': recomendado, 'sem_multa': sem_multa,
            'curva': curva}


# --- Serviços novos ---

def _rotulo(periodo):
    return f"{_MES_ABREV[periodo.month - 1]}/{periodo.year % 100:02d}"


def _classificar_atual(pico):
    """Classifica o mês com a contratada vigente, via verificar_risco do Nicolas."""
    resultado = verificar_risco(pico)
    if resultado['risco']:
        return 'multa'
    if resultado['diferenca_kw'] > 0:
        return 'acima_contratado'
    return 'dentro'


def listar_picos_mensais(serie, config):
    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    tarifa = config['tarifa_demanda_rs_kw']

    por_mes = picos_mensais(serie)
    consumos = consumo_mensal_kwh(serie)
    leituras = serie.groupby(serie.index.to_period('M')).size().to_dict()
    picos_em = (
        serie.groupby(serie.index.to_period('M'))
        .apply(lambda g: g.idxmax().isoformat() if len(g) > 0 else None)
        .to_dict()
    )

    linhas = []
    for p, pico in por_mes.items():
        rotulo = _rotulo(p)
        if pico is None:
            linhas.append({
                'mes': str(p),
                'rotulo': rotulo,
                'pico_kw': None,
                'pico_em': None,
                'consumo_kwh': None,
                'leituras': 0,
                'situacao': 'sem_dados',
                'faturada_rs': None,
                'ultrapassagem_rs': None,
            })
        else:
            faturada, ultrapassagem = custo_mes(contratada, pico, tarifa, tolerancia)
            linhas.append({
                'mes': str(p),
                'rotulo': rotulo,
                'pico_kw': round(pico, 2),
                'pico_em': picos_em.get(p),
                'consumo_kwh': float(consumos.get(p, 0.0)),
                'leituras': int(leituras.get(p, 0)),
                'situacao': _classificar_atual(pico),
                'faturada_rs': faturada,
                'ultrapassagem_rs': ultrapassagem,
            })
    return linhas


def resumo_analise(serie, config):
    picos_lista = listar_picos_mensais(serie, config)
    com_dados = [p for p in picos_lista if p['pico_kw'] is not None]
    maior = max(com_dados, key=lambda p: p['pico_kw'])

    por_mes = picos_mensais(serie)
    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    tarifa = config['tarifa_demanda_rs_kw']
    margem = config.get('margem_seguranca_kw', 1.0)
    simulacao = simular_contrato(por_mes, contratada, tarifa, margem=margem, tolerancia=tolerancia)
    atual = simulacao['atual']
    recomendado = simulacao['recomendado']

    return {
        'inicio': serie.index[0].isoformat(),
        'fim': serie.index[-1].isoformat(),
        'meses_no_arquivo': len(picos_lista),
        'meses_com_dados': len(com_dados),
        'meses_com_multa': atual['meses_com_multa'],
        'ultrapassagem_total_rs': atual['ultrapassagem_rs'],
        'custo_demanda_rs': atual['custo_rs'],
        'contratada_kw': contratada,
        'limite_multa_kw': round(limite_multa(contratada, tolerancia), 2),
        'tarifa_rs_kw': tarifa,
        'maior_pico': {
            'mes': maior['mes'],
            'pico_kw': maior['pico_kw'],
            'pico_em': maior['pico_em'],
        },
        'contrato_recomendado': {
            'contratada_kw': recomendado['contratada_kw'],
            'economia_rs': recomendado['economia_rs'],
            'meses_com_multa': recomendado['meses_com_multa'],
        },
    }


def mapa_picos(serie, config):
    contratada = config['demanda_contratada_kw']
    acima = serie[serie > contratada]

    contagens = [[0] * 24 for _ in range(7)]
    for ts in acima.index:
        contagens[ts.day_of_week][ts.hour] += 1

    maior_bloco = None
    maior_contagem = 0
    for dia_i in range(3):  # 3 dias úteis consecutivos: início em 0, 1 ou 2
        for hora_i in range(23):
            contagem = sum(
                contagens[d][h]
                for d in range(dia_i, dia_i + 3)
                for h in range(hora_i, hora_i + 2)
            )
            if contagem > maior_contagem:
                maior_contagem = contagem
                maior_bloco = {
                    'dia_inicio': dia_i,
                    'dia_fim': dia_i + 2,
                    'hora_inicio': hora_i,
                    'hora_fim': hora_i + 1,
                    'contagem': contagem,
                }

    return {
        'limiar_kw': round(float(contratada), 2),
        'total_acima': int(len(acima)),
        'contagens': contagens,
        'maior_bloco': maior_bloco,
    }


def contrato_ideal(serie, config):
    por_mes = picos_mensais(serie)
    contratada = config['demanda_contratada_kw']
    tolerancia = config['tolerancia']
    tarifa = config['tarifa_demanda_rs_kw']
    margem = config.get('margem_seguranca_kw', 1.0)

    simulacao = simular_contrato(por_mes, contratada, tarifa, margem=margem, tolerancia=tolerancia)
    recomendado_kw = simulacao['recomendado']['contratada_kw']

    mes_a_mes = []
    for p, pico in por_mes.items():
        rotulo = _rotulo(p)
        if pico is None:
            mes_a_mes.append({
                'mes': str(p),
                'rotulo': rotulo,
                'pico_kw': None,
                'atual': {'situacao': 'sem_dados', 'custo_rs': None},
                'recomendado': {'situacao': 'sem_dados', 'custo_rs': None},
            })
        else:
            f_a, u_a = custo_mes(contratada, pico, tarifa, tolerancia)
            f_r, u_r = custo_mes(recomendado_kw, pico, tarifa, tolerancia)
            mes_a_mes.append({
                'mes': str(p),
                'rotulo': rotulo,
                'pico_kw': round(pico, 2),
                'atual': {
                    'situacao': _classificar_atual(pico),
                    'custo_rs': arred(f_a + u_a),
                },
                'recomendado': {
                    'situacao': situacao(pico, recomendado_kw, tolerancia),
                    'custo_rs': arred(f_r + u_r),
                },
            })

    validos = [p for p in por_mes.values() if p is not None]
    return {
        'tarifa_rs_kw': tarifa,
        'margem_kw': margem,
        'meses_analisados': len(validos),
        'atual': simulacao['atual'],
        'otimo': simulacao['otimo'],
        'recomendado': simulacao['recomendado'],
        'sem_multa': simulacao['sem_multa'],
        'curva': simulacao['curva'],
        'mes_a_mes': mes_a_mes,
    }


def recomendacoes(serie, config):
    recos = []

    ci = contrato_ideal(serie, config)
    atual = ci['atual']
    rec = ci['recomendado']
    if rec['contratada_kw'] != atual['contratada_kw'] and rec['economia_rs'] > 0:
        recos.append({
            'tipo': 'contrato',
            'titulo': f"Ajustar a demanda contratada para {rec['contratada_kw']} kW",
            'detalhe': (
                f"Economia estimada de R$ {_fmt_rs(rec['economia_rs'])} no período. "
                f"Meses com multa: {atual['meses_com_multa']} hoje, "
                f"{rec['meses_com_multa']} com o novo contrato."
            ),
            'acao': {'rotulo': 'Simular contrato', 'rota': '/contrato-ideal'},
        })
    else:
        recos.append({
            'tipo': 'contrato',
            'titulo': 'Seu contrato já está no ponto de menor custo',
            'detalhe': 'Nenhum valor de contrato na faixa reduz o custo no período analisado.',
        })

    mp = mapa_picos(serie, config)
    if mp['maior_bloco']:
        b = mp['maior_bloco']
        dias = f"{DIAS_SEMANA[b['dia_inicio']]} a {DIAS_SEMANA[b['dia_fim']]}"
        horas = f"{b['hora_inicio']}h–{b['hora_fim'] + 1}h"
        recos.append({
            'tipo': 'horario',
            'titulo': f"Evitar cargas pesadas juntas de {dias}, {horas}",
            'detalhe': f"{b['contagem']} leituras acima da contratada ficaram nesse bloco.",
        })

    lim = limite_multa(config['demanda_contratada_kw'], config['tolerancia'])
    por_mes = picos_mensais(serie)
    por_calendario = {}
    for p, pico in por_mes.items():
        if pico is not None:
            por_calendario.setdefault(p.month, []).append(pico)
    meses_estouraram = [
        m for m, picos in sorted(por_calendario.items())
        if len(picos) >= 2 and all(pico > lim for pico in picos)
    ]
    if meses_estouraram:
        nomes = [NOMES_MES[m - 1].capitalize() for m in meses_estouraram]
        if len(nomes) == 1:
            titulo = f"{nomes[0]} passou do limite em todos os anos do arquivo"
        elif len(nomes) == 2:
            titulo = f"{nomes[0]} e {nomes[1]} passaram do limite em todos os anos do arquivo"
        else:
            titulo = f"{', '.join(nomes[:-1])} e {nomes[-1]} passaram do limite em todos os anos do arquivo"
        recos.append({
            'tipo': 'sazonal',
            'titulo': titulo,
            'detalhe': 'Considere planejar cargas com antecedência nesses meses.',
        })

    return recos


def _fmt_rs(v):
    inteiro, dec = f"{v:.2f}".split('.')
    inteiro_fmt = '{:,}'.format(int(inteiro)).replace(',', '.')
    return f"{inteiro_fmt},{dec}"
