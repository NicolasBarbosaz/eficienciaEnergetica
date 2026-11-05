def test_consumos(cliente):
    resposta = cliente.get("/consumos")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert isinstance(dados, list)
    assert len(dados) > 0
    primeiro = dados[0]
    assert "mes" in primeiro
    assert "consumo_kwh" in primeiro
    assert "demanda_contratada_kw" in primeiro
    assert "demanda_medida_kw" in primeiro


def test_demanda_indicadores(cliente):
    resposta = cliente.get("/demanda/indicadores")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert "quantidade_ultrapassagens" in dados
    assert "maior_ultrapassagem" in dados
