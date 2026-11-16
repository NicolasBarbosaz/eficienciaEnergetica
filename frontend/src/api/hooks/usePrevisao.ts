'use client';

import { useQuery } from '@tanstack/react-query';

import { chamar } from '@/api/cliente';
import type { PrevisaoProximoMes } from '@/api/tipos';

export const CHAVE_PREVISAO = ['previsao'] as const;

export function usePrevisao() {
  return useQuery<PrevisaoProximoMes>({
    queryKey: CHAVE_PREVISAO,
    queryFn: () => chamar<PrevisaoProximoMes>('/previsao/proximo-mes'),
    // A previsão com modelo real leva alguns segundos; vale cachear por mais tempo.
    staleTime: 60_000,
  });
}
