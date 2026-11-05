import pandas as pd
import pytest

from app.services.analise_service import simular_contrato, situacao as situacao_ref


def _config_base():
    return {
        "empresa": {
            "razao_social": "Distribuidora Exemplo Ltda.",
            "cidade_uf": "Recife/PE",
            "modalidade": "verde",
        },
        "demanda_contratada_kw": 80.0,
        "tolerancia": 0.05,
        "tarifa_demanda_rs_kw": 12.89,
        "ponta_inicio": "17:30",
        "ponta_fim": "20:30",
        "fonte_dados": "memoria_massa",
        "margem_seguranca_kw": 1.0,
    }


@pytest.fixture
def cliente_com_exemplo(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200
    assert cliente.post("/medicoes/exemplo").status_code == 200
    return cliente


# --- Valores do model/README.md (contratada 80 kW, tarifa R$ 12,89, margem 1,0 kW) ---

def test_analise_resumo_bate_com_readme(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/analise/resumo")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["meses_no_arquivo"] == 24
    assert dados["meses_com_dados"] == 21
    assert dados["meses_com_multa"] == 8
    assert dados["ultrapassagem_total_rs"] == 3402.96
    assert dados["custo_demanda_rs"] == 26894.99
    assert dados["contratada_kw"] == 80.0
    assert dados["limite_multa_kw"] == 84.0
    assert dados["tarifa_rs_kw"] == 12.89
    rec = dados["contrato_recomendado"]
    assert rec["contratada_kw"] == 87
    assert rec["economia_rs"] == 315.80
    assert rec["meses_com_multa"] == 5


def test_contrato_ideal_bate_com_readme(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/analise/contrato-ideal")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["otimo"]["contratada_kw"] == 86
    assert dados["otimo"]["custo_rs"] == 26514.74
    assert dados["otimo"]["economia_rs"] == 380.25
    assert dados["otimo"]["meses_com_multa"] == 5
    assert dados["otimo"]["folga_minima_kw"] == 0.80
    assert dados["recomendado"]["contratada_kw"] == 87
    assert dados["recomendado"]["custo_rs"] == 26579.19
    assert dados["recomendado"]["economia_rs"] == 315.80
    assert dados["recomendado"]["folga_minima_kw"] == 1.85
    assert dados["sem_multa"] is not None
    assert dados["sem_multa"]["contratada_kw"] == 111
    assert dados["sem_multa"]["custo_rs"] == 30099.83
    assert dados["sem_multa"]["meses_com_multa"] == 0
    assert dados["sem_multa"]["folga_minima_kw"] == 1.42


def test_picos_mensais_cobre_24_meses_com_3_sem_dados(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/analise/picos-mensais")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert len(dados) == 24
    sem_dados = [p for p in dados if p["situacao"] == "sem_dados"]
    assert [p["mes"] for p in sem_dados] == ["2016-04", "2016-05", "2016-06"]


def test_mapa_picos_tem_7x24_e_maior_bloco(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/analise/mapa-picos")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["limiar_kw"] == 80.0
    assert dados["total_acima"] > 0
    assert len(dados["contagens"]) == 7
    assert all(len(linha) == 24 for linha in dados["contagens"])
    bloco = dados["maior_bloco"]
    assert bloco is not None
    assert bloco["dia_fim"] - bloco["dia_inicio"] == 2  # 3 dias
    assert bloco["hora_fim"] - bloco["hora_inicio"] == 1  # 2 horas
    assert 0 <= bloco["dia_inicio"] <= 2  # dias úteis
    assert bloco["contagem"] > 0


def test_recomendacoes_tem_contrato_horario_e_sazonal(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/analise/recomendacoes")
    assert resposta.status_code == 200
    recos = resposta.json()
    tipos = [r["tipo"] for r in recos]
    assert "contrato" in tipos
    assert "horario" in tipos
    reco_contrato = next(r for r in recos if r["tipo"] == "contrato")
    assert "87" in reco_contrato["titulo"]
    assert reco_contrato["acao"] == {"rotulo": "Simular contrato", "rota": "/contrato-ideal"}


def test_verificar_risco_concorda_com_situacao_em_todo_bobcat(cliente_com_exemplo):
    """Com 80 kW configurados, a classificação de cada mês pela `verificar_risco()` do Nicolas
    bate com a `situacao()` da referência (tolerância 5%)."""
    from app.services.demanda_service import verificar_risco

    picos = cliente_com_exemplo.get("/analise/picos-mensais").json()
    for mes in picos:
        if mes["pico_kw"] is None:
            continue
        pico = mes["pico_kw"]
        esperado = situacao_ref(pico, contratada=80.0, tolerancia=0.05)
        res = verificar_risco(pico)
        if res["risco"]:
            atual = "multa"
        elif res["diferenca_kw"] > 0:
            atual = "acima_contratado"
        else:
            atual = "dentro"
        assert atual == esperado, f"{mes['mes']}: {atual} != {esperado}"


# --- Picos do protótipo (seção 9.2) ---

def test_simular_contrato_com_picos_do_prototipo():
    picos = {
        pd.Period('2025-09', 'M'): 76.1,
        pd.Period('2025-10', 'M'): 78.8,
        pd.Period('2025-11', 'M'): 88.7,
        pd.Period('2025-12', 'M'): 89.9,
        pd.Period('2026-01', 'M'): None,
        pd.Period('2026-02', 'M'): 86.7,
        pd.Period('2026-03', 'M'): 87.5,
        pd.Period('2026-04', 'M'): 90.89,
        pd.Period('2026-05', 'M'): 77.3,
        pd.Period('2026-06', 'M'): 77.5,
        pd.Period('2026-07', 'M'): 74.9,
    }
    sim = simular_contrato(picos, contratada_atual=80, tarifa=14.43,
                           margem=1.0, faixa=range(75, 96))
    atual = sim['atual']
    assert atual['custo_rs'] == 13435.34
    assert atual['ultrapassagem_rs'] == 1260.89
    assert atual['meses_com_multa'] == 5
    assert sim['otimo']['contratada_kw'] == 87
    assert sim['otimo']['custo_rs'] == 12683.83
    assert sim['recomendado']['contratada_kw'] == 88
    assert sim['recomendado']['custo_rs'] == 12777.62


# --- Erros ---

def test_analise_sem_medicoes_devolve_404(cliente):
    cliente.put("/configuracao", json=_config_base())
    for rota in ("/analise/resumo", "/analise/picos-mensais", "/analise/mapa-picos",
                 "/analise/contrato-ideal", "/analise/recomendacoes"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 404, rota
        assert resposta.json() == {"detail": "Nenhuma memória de massa enviada"}


def test_analise_sem_configuracao_devolve_409(cliente):
    cliente.post("/medicoes/exemplo")
    for rota in ("/analise/resumo", "/analise/picos-mensais", "/analise/mapa-picos",
                 "/analise/contrato-ideal", "/analise/recomendacoes"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 409, rota
        assert resposta.json() == {"detail": "Cadastre o contrato em Configurações"}
