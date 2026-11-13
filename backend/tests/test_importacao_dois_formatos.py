from pathlib import Path


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


def _pasta_exemplos():
    # backend/tests/ -> parents[1] = backend/
    return Path(__file__).resolve().parents[1] / "exemplos"


def _form_base():
    return {
        "nome_predio": "Bobcat_office_Melody",
        "demanda_contratada": "80.0",
    }


def _enviar(cliente, nome, unidade, *, conteudo=None):
    if conteudo is None:
        conteudo = (_pasta_exemplos() / nome).read_bytes()
    return cliente.post(
        "/importacao/memoria-massa",
        files={"arquivo": (nome, conteudo, "text/csv")},
        data={**_form_base(), "unidade": unidade},
    )


def _gerar_distribuidora_15min(horas=24):
    linhas = ["Data;Hora;Demanda ativa (kW)"]
    # 2017-01-02 foi uma segunda; evita confusão de fuso
    base_d = "02/01/2017"
    for h in range(horas):
        for m in (0, 15, 30, 45):
            valor = f"{50 + (h * 0.5):.4f}".replace(".", ",")
            linhas.append(f"{base_d};{h:02d}:{m:02d};{valor}")
    return ("\n".join(linhas) + "\n").encode("utf-8")


def test_bobcat_distribuidora_kw_aceito(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    resposta = _enviar(cliente, "memoria_massa_bobcat.csv", "kw")
    assert resposta.status_code == 200, resposta.text
    dados = resposta.json()
    assert dados["total_registros"] == 13932
    assert dados["Unidade"] == "kw"


def test_bobcat_padrao_kwh_aceito(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    resposta = _enviar(cliente, "memoria_massa_bobcat_importacao.csv", "kwh")
    assert resposta.status_code == 200, resposta.text
    dados = resposta.json()
    assert dados["total_registros"] == 13932
    assert dados["Unidade"] == "kwh"


def test_dois_formatos_produzem_mesmo_picos_mensais(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    assert _enviar(cliente, "memoria_massa_bobcat.csv", "kw").status_code == 200
    picos_kw = cliente.get("/analise/picos-mensais").json()

    assert _enviar(cliente, "memoria_massa_bobcat_importacao.csv", "kwh").status_code == 200
    picos_kwh = cliente.get("/analise/picos-mensais").json()

    assert picos_kw == picos_kwh


def test_distribuidora_15min_com_kw_aceito(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    conteudo = _gerar_distribuidora_15min(horas=24)
    resposta = _enviar(cliente, "exemplo_15min.csv", "kw", conteudo=conteudo)
    assert resposta.status_code == 200, resposta.text


def test_distribuidora_15min_com_kwh_e_recusado(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    conteudo = _gerar_distribuidora_15min(horas=24)
    resposta = _enviar(cliente, "exemplo_15min.csv", "kwh", conteudo=conteudo)
    assert resposta.status_code == 400
    assert resposta.json() == {
        "detail": "Para arquivos em kwh, as medições devem ser de hora em hora"
    }


def test_unidade_mwh_recusada(cliente):
    assert cliente.put("/configuracao", json=_config_base()).status_code == 200

    resposta = _enviar(cliente, "memoria_massa_bobcat.csv", "mwh")
    assert resposta.status_code == 400
    assert resposta.json() == {"detail": "informe a unidade kw ou kwh"}
