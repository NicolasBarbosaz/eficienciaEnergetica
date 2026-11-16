// Tipos espelhando o backend (seção 6.2 da spec).

export type Situacao = 'dentro' | 'acima_contratado' | 'multa';
export type SituacaoOuSemDados = Situacao | 'sem_dados';

export type Modalidade = 'verde' | 'azul';
export type FonteDados = 'memoria_massa' | 'iot';

export type EmpresaCorpo = {
  razao_social: string;
  cnpj?: string;
  cidade_uf: string;
  modalidade: Modalidade;
};

export type Configuracao = {
  empresa: EmpresaCorpo;
  demanda_contratada_kw: number;
  tolerancia: number;
  tarifa_demanda_rs_kw: number;
  ponta_inicio: string;
  ponta_fim: string;
  fonte_dados: FonteDados;
  margem_seguranca_kw: number;
};

export type ConfiguracaoComCalculados = Configuracao & {
  limite_multa_kw: number;
  atualizado_em: string;
};

export type ErroDeValidacao = { campo: string; mensagem: string };

export type MedicoesResumo = {
  arquivo: string;
  origem: 'upload' | 'exemplo';
  importado_em: string;
  inicio: string;
  fim: string;
  intervalo_min: number;
  total_leituras: number;
  meses_sem_dados: string[];
};

export type PicoMensal = {
  mes: string;
  rotulo: string;
  pico_kw: number | null;
  pico_em: string | null;
  consumo_kwh: number | null;
  leituras: number;
  situacao: SituacaoOuSemDados;
  faturada_rs: number | null;
  ultrapassagem_rs: number | null;
};

export type AnaliseResumo = {
  inicio: string;
  fim: string;
  meses_no_arquivo: number;
  meses_com_dados: number;
  meses_com_multa: number;
  ultrapassagem_total_rs: number;
  custo_demanda_rs: number;
  contratada_kw: number;
  limite_multa_kw: number;
  tarifa_rs_kw: number;
  maior_pico: { mes: string; pico_kw: number; pico_em: string };
  contrato_recomendado: {
    contratada_kw: number;
    economia_rs: number;
    meses_com_multa: number;
  };
};

export type MapaPicos = {
  limiar_kw: number;
  total_acima: number;
  contagens: number[][]; // [dia 0=seg..6=dom][hora 0..23]
  maior_bloco: {
    dia_inicio: number;
    dia_fim: number;
    hora_inicio: number;
    hora_fim: number;
    contagem: number;
  } | null;
};

export type PrevisaoProximoMes = {
  mes: string;
  consumo_previsto_kwh: number;
  pico_tipico_kw: number;
  pico_tipico_min_kw: number;
  pico_tipico_max_kw: number;
  pico_tipico_em: string;
  risco: 'baixo' | 'medio' | 'alto';
  aviso_sazonal: string;
  meses_historico: { mes: string; pico_kw: number; situacao: Situacao }[];
  modelo: 'lightgbm' | 'baseline';
};

export type Recomendacao = {
  tipo: 'contrato' | 'horario' | 'sazonal';
  titulo: string;
  detalhe: string;
  acao?: { rotulo: string; rota: string };
};

export type PontoContrato = {
  contratada_kw: number;
  custo_rs: number;
  ultrapassagem_rs: number;
  economia_rs: number;
  meses_com_multa: number;
  folga_pior_mes_kw: number;
  folga_minima_kw: number | null;
};

export type NivelAlerta = 'alto' | 'medio' | 'multa';

export type Alerta = {
  id: string;
  tipo: 'risco_proximo_mes' | 'multa_registrada';
  nivel: NivelAlerta;
  titulo: string;
  mensagem: string;
  mes: string;
  detalhe?: {
    pico_kw?: number;
    limite_kw: number;
    ultrapassagem_rs?: number;
    previsao?: PrevisaoProximoMes;
    recomendacoes?: Recomendacao[];
  };
};

export type ContratoIdeal = {
  tarifa_rs_kw: number;
  margem_kw: number;
  meses_analisados: number;
  atual: PontoContrato;
  otimo: PontoContrato;
  recomendado: PontoContrato;
  sem_multa: PontoContrato | null;
  curva: PontoContrato[];
  mes_a_mes: {
    mes: string;
    rotulo: string;
    pico_kw: number | null;
    atual: { situacao: SituacaoOuSemDados; custo_rs: number | null };
    recomendado: { situacao: SituacaoOuSemDados; custo_rs: number | null };
  }[];
};
