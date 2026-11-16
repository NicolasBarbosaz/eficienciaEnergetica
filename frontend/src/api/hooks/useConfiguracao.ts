'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErroDaApi, chamar } from '@/api/cliente';
import type {
  Configuracao,
  ConfiguracaoComCalculados,
  ErroDeValidacao,
} from '@/api/tipos';

export const CHAVE_CONFIG = ['configuracao'] as const;
export const CHAVES_INVALIDADAS_AO_SALVAR = [
  ['configuracao'],
  ['medicoes'],
  ['analise'],
  ['previsao'],
  ['alertas'],
] as const;

export type EstadoConfiguracao =
  | { status: 'carregado'; dados: ConfiguracaoComCalculados }
  | { status: 'primeiro_acesso' };

export class ErroDeSalvar extends Error {
  readonly erros: ErroDeValidacao[];
  readonly indisponivel: boolean;

  constructor(opts: { erros?: ErroDeValidacao[]; indisponivel?: boolean } = {}) {
    super('Erro ao salvar configuração');
    this.name = 'ErroDeSalvar';
    this.erros = opts.erros ?? [];
    this.indisponivel = opts.indisponivel ?? false;
  }
}

export function useConfiguracao() {
  return useQuery<EstadoConfiguracao>({
    queryKey: CHAVE_CONFIG,
    queryFn: async () => {
      try {
        const dados = await chamar<ConfiguracaoComCalculados>('/configuracao');
        return { status: 'carregado', dados };
      } catch (e) {
        if (e instanceof ErroDaApi && e.status === 404) {
          return { status: 'primeiro_acesso' };
        }
        throw e;
      }
    },
  });
}

export function useSalvarConfiguracao() {
  const qc = useQueryClient();
  return useMutation<ConfiguracaoComCalculados, ErroDeSalvar, Configuracao>({
    mutationFn: async (corpo) => {
      try {
        return await chamar<ConfiguracaoComCalculados>('/configuracao', {
          method: 'PUT',
          body: corpo,
        });
      } catch (e) {
        if (e instanceof ErroDaApi && e.status === 422) {
          throw new ErroDeSalvar({ erros: normalizarErros422(e.corpo) });
        }
        throw new ErroDeSalvar({ indisponivel: true });
      }
    },
    onSuccess: () => {
      for (const chave of CHAVES_INVALIDADAS_AO_SALVAR) {
        qc.invalidateQueries({ queryKey: chave });
      }
    },
  });
}

/** 422 do backend: aceita tanto `[{campo, mensagem}]` (nosso) quanto `[{loc, msg}]` (FastAPI). */
function normalizarErros422(corpo: unknown): ErroDeValidacao[] {
  if (!corpo || typeof corpo !== 'object' || !('detail' in corpo)) return [];
  const detail = (corpo as { detail: unknown }).detail;
  if (!Array.isArray(detail)) return [];

  return detail.map((item): ErroDeValidacao => {
    if (!item || typeof item !== 'object') return { campo: '', mensagem: 'Erro desconhecido' };

    if ('campo' in item && 'mensagem' in item) {
      return {
        campo: String((item as { campo: unknown }).campo),
        mensagem: String((item as { mensagem: unknown }).mensagem),
      };
    }

    if ('loc' in item && 'msg' in item) {
      const loc = (item as { loc: unknown[] }).loc;
      const partes = loc
        .filter((p) => p !== 'body')
        .map((p) => String(p));
      return {
        campo: partes.join('.'),
        mensagem: String((item as { msg: unknown }).msg),
      };
    }

    return { campo: '', mensagem: 'Erro desconhecido' };
  });
}
