def test_importar_exemplo_devolve_resumo_do_bobcat(cliente):
    resposta = cliente.post("/medicoes/exemplo")
    assert resposta.status_code == 200
    dados = resposta.json()
    # Valores do model/README.md, escritos direto no teste.
    assert dados["total_leituras"] == 13932
    assert dados["intervalo_min"] == 60
    assert dados["inicio"].startswith("2016-01-01T00:00:00")
    assert dados["fim"].startswith("2017-12-31T23:00:00")
    assert dados["meses_sem_dados"] == ["2016-04", "2016-05", "2016-06"]
    assert dados["origem"] == "exemplo"
    assert dados["arquivo"] == "memoria_massa_bobcat.csv"


def test_get_resumo_sem_medicoes_devolve_404(cliente):
    resposta = cliente.get("/medicoes/resumo")
    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Nenhuma memória de massa enviada"}


def test_get_resumo_depois_do_exemplo(cliente):
    cliente.post("/medicoes/exemplo")
    resposta = cliente.get("/medicoes/resumo")
    assert resposta.status_code == 200
    assert resposta.json()["total_leituras"] == 13932


def test_resumo_com_medicoes_gravadas_no_contrato_sem_json(cliente, anteve_data_dir):
    # Simula a importação do Nicolas que grava só o medicoes.csv (contrato
    # da seção 5.2), sem o medicoes_info.json. A nossa parte lê certo.
    csv_path = anteve_data_dir / "medicoes.csv"
    linhas = [
        "data_hora,demanda_kw",
        "2026-01-01T00:00:00,10.0",
        "2026-01-01T01:00:00,12.5",
        "2026-01-01T02:00:00,13.0",
    ]
    csv_path.write_text("\n".join(linhas), encoding="utf-8")

    resposta = cliente.get("/medicoes/resumo")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["arquivo"] == "arquivo enviado"
    assert dados["origem"] == "upload"
    assert dados["total_leituras"] == 3
    assert "importado_em" in dados
