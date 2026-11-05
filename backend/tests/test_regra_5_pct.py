def test_alerta_risco_82_eh_normal(cliente):
    resposta = cliente.get("/alerta/risco", params={"demanda_prevista": 82})
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["nivel"] == "normal"


def test_alerta_risco_84_no_limite_eh_normal(cliente):
    resposta = cliente.get("/alerta/risco", params={"demanda_prevista": 84})
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["nivel"] == "normal"


def test_alerta_risco_86_3_eh_critico(cliente):
    resposta = cliente.get("/alerta/risco", params={"demanda_prevista": 86.3})
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["nivel"] == "critico"
    assert dados["tipo"] == "risco_ultrapassagem"


def test_ultrapassagens_segue_com_fevereiro_e_marco(cliente):
    resposta = cliente.get("/demanda/ultrapassagens")
    assert resposta.status_code == 200
    dados = resposta.json()
    meses = [linha["mes"] for linha in dados]
    assert meses == ["fevereiro", "marco"]
