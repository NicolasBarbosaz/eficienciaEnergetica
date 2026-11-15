'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErroDaApi, ErroDeRede, ErroDeTimeout, chamar } from '@/api/cliente';
import type { MedicoesResumo } from '@/api/tipos';
import { CHAVES_INVALIDADAS_AO_SALVAR } from './useConfiguracao';

export const CHAVE_MEDICOES = ['medicoes'] as const;

export type EstadoMedicoes =
  | { status: 'carregado'; dados: MedicoesResumo }
  | { status: 'vazio' };

export class ErroDeEnvio extends Error {
  readonly mensagem: string;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeEnvio';
    this.mensagem = mensagem;
  }
}

export function useMedicoesResumo() {
  return useQuery<EstadoMedicoes>({
    queryKey: CHAVE_MEDICOES,
    queryFn: async () => {
      try {
        const dados = await chamar<MedicoesResumo>('/medicoes/resumo');
        return { status: 'carregado', dados };
      } catch (e) {
        if (e instanceof ErroDaApi && e.status === 404) {
          return { status: 'vazio' };
        }
        throw e;
      }
    },
  });
}

function invalidarTudo(qc: ReturnType<typeof useQueryClient>) {
  for (const chave of CHAVES_INVALIDADAS_AO_SALVAR) {
    qc.invalidateQueries({ queryKey: chave });
  }
}

type EntradaEnvio = {
  arquivo: File;
  nomePredio: string;
  demandaKw: number;
  unidade: 'kw' | 'kwh';
};

export function useEnviarArquivo() {
  const qc = useQueryClient();
  return useMutation<unknown, ErroDeEnvio, EntradaEnvio>({
    mutationFn: async ({ arquivo, nomePredio, demandaKw, unidade }) => {
      const form = new FormData();
      form.append('arquivo', arquivo);
      form.append('nome_predio', nomePredio);
      form.append('demanda_contratada', String(demandaKw));
      form.append('unidade', unidade);
      try {
        return await chamar<unknown>('/importacao/memoria-massa', {
          method: 'POST',
          body: form,
        });
      } catch (e) {
        throw mapearErroDeEnvio(e);
      }
    },
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useImportarExemplo() {
  const qc = useQueryClient();
  return useMutation<MedicoesResumo, ErroDeEnvio, void>({
    mutationFn: async () => {
      try {
        return await chamar<MedicoesResumo>('/medicoes/exemplo', { method: 'POST' });
      } catch (e) {
        throw mapearErroDeEnvio(e);
      }
    },
    onSuccess: () => invalidarTudo(qc),
  });
}

function mapearErroDeEnvio(e: unknown): ErroDeEnvio {
  if (e instanceof ErroDaApi) {
    // Sem corpo JSON (500, HTML, etc.)
    if (e.corpo === null || e.corpo === undefined) {
      return new ErroDeEnvio('Erro no servidor ao ler o arquivo.');
    }
    const corpo = e.corpo as { detail?: unknown };
    if (typeof corpo.detail === 'string') {
      return new ErroDeEnvio(corpo.detail);
    }
    if (Array.isArray(corpo.detail)) {
      return new ErroDeEnvio('Não foi possível enviar o arquivo.');
    }
    return new ErroDeEnvio('Erro no servidor ao ler o arquivo.');
  }
  if (e instanceof ErroDeTimeout) {
    return new ErroDeEnvio('A API demorou para responder.');
  }
  if (e instanceof ErroDeRede) {
    return new ErroDeEnvio('API indisponível.');
  }
  return new ErroDeEnvio('Erro inesperado ao enviar o arquivo.');
}
