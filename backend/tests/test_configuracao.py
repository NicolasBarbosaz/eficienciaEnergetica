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


def test_get_sem_configuracao_devolve_404(cliente):
    resposta = cliente.get("/configuracao")
    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Contrato ainda não cadastrado"}


def test_put_valido_devolve_limite_84(cliente):
    resposta = cliente.put("/configuracao", json=_config_base())
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["limite_multa_kw"] == 84.0
    assert dados["demanda_contratada_kw"] == 80.0
    assert "atualizado_em" in dados


def test_get_depois_de_salvar_devolve_mesmos_dados(cliente):
    cliente.put("/configuracao", json=_config_base())
    resposta = cliente.get("/configuracao")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["limite_multa_kw"] == 84.0
    assert dados["empresa"]["razao_social"] == "Distribuidora Exemplo Ltda."


def test_put_invalido_devolve_422_com_campo_e_mensagem(cliente):
    corpo = _config_base()
    corpo["demanda_contratada_kw"] = 0
    corpo["tarifa_demanda_rs_kw"] = -1
    resposta = cliente.put("/configuracao", json=corpo)
    assert resposta.status_code == 422
    detalhe = resposta.json()["detail"]
    assert isinstance(detalhe, list)
    campos = [item["campo"] for item in detalhe]
    assert "demanda_contratada_kw" in campos
    assert "tarifa_demanda_rs_kw" in campos
    for item in detalhe:
        assert item["mensagem"]


def test_buscar_demanda_contratada_sem_configuracao(anteve_data_dir):
    from app.repositories.demanda_repository import buscar_demanda_contratada
    assert buscar_demanda_contratada() == 80.0


def test_buscar_demanda_contratada_com_configuracao(cliente):
    corpo = _config_base()
    corpo["demanda_contratada_kw"] = 100.0
    assert cliente.put("/configuracao", json=corpo).status_code == 200

    from app.repositories.demanda_repository import buscar_demanda_contratada
    assert buscar_demanda_contratada() == 100.0


def test_alerta_risco_usa_contratada_salva(cliente):
    corpo = _config_base()
    corpo["demanda_contratada_kw"] = 100.0
    cliente.put("/configuracao", json=corpo)

    resposta = cliente.get("/alerta/risco", params={"demanda_prevista": 86.3})
    assert resposta.status_code == 200
    assert resposta.json()["nivel"] == "normal"
