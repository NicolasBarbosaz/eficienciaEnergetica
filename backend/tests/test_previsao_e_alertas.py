import pytest


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


@pytest.fixture(autouse=True)
def limpar_caches():
    """Garante que o cache de previsão e de modelos não vaze entre testes."""
    try:
        from app.services import previsao_service
        previsao_service._cache_previsao.clear()
        previsao_service._cache_modelos.clear()
    except Exception:
        pass
    yield


@pytest.fixture
def cliente_com_exemplo(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200
    assert cliente.post("/medicoes/exemplo").status_code == 200
    return cliente


# --- Previsão com LightGBM: valores do model/README.md (tolerância ±0,1) ---

def _approx(valor, alvo, tol=0.1):
    return abs(valor - alvo) <= tol


def test_previsao_com_lightgbm_bate_com_readme(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/previsao/proximo-mes")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["modelo"] == "lightgbm"
    assert dados["mes"] == "2018-01"
    assert _approx(dados["consumo_previsto_kwh"], 42561.7, tol=1.0)
    assert _approx(dados["pico_tipico_kw"], 65.3)
    assert _approx(dados["pico_tipico_min_kw"], 63.2)
    assert _approx(dados["pico_tipico_max_kw"], 67.7)
    assert dados["pico_tipico_em"].startswith("2018-01-29T10:00:00")
    assert dados["risco"] == "alto"
    assert "Janeiro passou do limite" in dados["aviso_sazonal"]
    assert "96,5 kW em 2016" in dados["aviso_sazonal"]
    assert "85,0 kW em 2017" in dados["aviso_sazonal"]
    # meses_historico com os 2 janeiros
    hist = dados["meses_historico"]
    assert [h["mes"] for h in hist] == ["2016-01", "2017-01"]
    assert all(h["situacao"] == "multa" for h in hist)


# --- Baseline: ANTEVE_MODEL_DIR vazio ---

def test_baseline_quando_nao_ha_modelos(cliente, tmp_path, monkeypatch):
    modelos_vazio = tmp_path / "sem_modelo"
    modelos_vazio.mkdir()
    monkeypatch.setenv("ANTEVE_MODEL_DIR", str(modelos_vazio))

    cliente.put("/configuracao", json=_config_base())
    cliente.post("/medicoes/exemplo")

    resposta = cliente.get("/previsao/proximo-mes")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["modelo"] == "baseline"
    assert dados["mes"] == "2018-01"
    # Faixa consistente: pico_min <= pico <= pico_max
    assert dados["pico_tipico_min_kw"] <= dados["pico_tipico_kw"] <= dados["pico_tipico_max_kw"]
    # Risco ainda vem do histórico: janeiro passou em 2/2 anos → alto
    assert dados["risco"] == "alto"


# --- Alertas ---

def test_alertas_comeca_com_proximo_mes_seguido_de_multas(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/alertas")
    assert resposta.status_code == 200
    alertas = resposta.json()
    # proximo-mes + 8 multas = 9
    assert len(alertas) == 9
    assert alertas[0]["id"] == "proximo-mes"
    assert alertas[0]["tipo"] == "risco_proximo_mes"
    assert alertas[0]["nivel"] == "alto"

    multas = alertas[1:]
    assert all(a["tipo"] == "multa_registrada" for a in multas)
    assert all(a["nivel"] == "multa" for a in multas)
    # Mais recente primeiro
    assert multas[0]["id"] == "multa-2017-12"
    assert multas[-1]["id"] == "multa-2016-01"
    # Os 8 meses com multa do README
    ids = [a["id"] for a in multas]
    assert ids == [
        "multa-2017-12", "multa-2017-11", "multa-2017-08",
        "multa-2017-02", "multa-2017-01",
        "multa-2016-12", "multa-2016-08", "multa-2016-01",
    ]


def test_alerta_detalhe_proximo_mes(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/alertas/proximo-mes")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["id"] == "proximo-mes"
    assert "detalhe" in dados
    det = dados["detalhe"]
    assert det["limite_kw"] == 84.0
    assert det["previsao"]["mes"] == "2018-01"
    assert isinstance(det["recomendacoes"], list)
    assert len(det["recomendacoes"]) > 0


def test_alerta_detalhe_multa(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/alertas/multa-2017-12")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["tipo"] == "multa_registrada"
    det = dados["detalhe"]
    assert det["limite_kw"] == 84.0
    assert det["pico_kw"] > 84.0
    assert det["ultrapassagem_rs"] > 0


def test_alerta_inexistente_devolve_404(cliente_com_exemplo):
    resposta = cliente_com_exemplo.get("/alertas/nao-existe")
    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Alerta não encontrado"}


def test_previsao_sem_medicoes_devolve_404(cliente):
    cliente.put("/configuracao", json=_config_base())
    for rota in ("/previsao/proximo-mes", "/alertas", "/alertas/proximo-mes"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 404, rota


def test_previsao_sem_configuracao_devolve_409(cliente):
    cliente.post("/medicoes/exemplo")
    for rota in ("/previsao/proximo-mes", "/alertas", "/alertas/proximo-mes"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 409, rota
