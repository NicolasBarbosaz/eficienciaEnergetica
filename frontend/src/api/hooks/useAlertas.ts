'use client';

import { useQuery } from '@tanstack/react-query';

import { ErroDaApi, chamar } from '@/api/cliente';
import type { Alerta } from '@/api/tipos';

export const CHAVE_ALERTAS = ['alertas'] as const;

export function useAlertas() {
  return useQuery<Alerta[]>({
    queryKey: CHAVE_ALERTAS,
    queryFn: () => chamar<Alerta[]>('/alertas'),
  });
}

export type EstadoAlerta =
  | { status: 'carregado'; dados: Alerta }
  | { status: 'nao_encontrado' };

export function useAlerta(id: string) {
  return useQuery<EstadoAlerta>({
    queryKey: [...CHAVE_ALERTAS, id],
    queryFn: async () => {
      try {
        const dados = await chamar<Alerta>(`/alertas/${encodeURIComponent(id)}`);
        return { status: 'carregado', dados };
      } catch (e) {
        if (e instanceof ErroDaApi && e.status === 404) {
          return { status: 'nao_encontrado' };
        }
        throw e;
      }
    },
  });
}
