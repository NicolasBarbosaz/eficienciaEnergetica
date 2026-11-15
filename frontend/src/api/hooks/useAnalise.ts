'use client';

import { useQuery } from '@tanstack/react-query';

import { chamar } from '@/api/cliente';
import type {
  AnaliseResumo,
  ContratoIdeal,
  MapaPicos,
  PicoMensal,
  Recomendacao,
} from '@/api/tipos';

export const CHAVE_ANALISE = ['analise'] as const;

export function useAnaliseResumo() {
  return useQuery<AnaliseResumo>({
    queryKey: [...CHAVE_ANALISE, 'resumo'],
    queryFn: () => chamar<AnaliseResumo>('/analise/resumo'),
  });
}

export function usePicosMensais() {
  return useQuery<PicoMensal[]>({
    queryKey: [...CHAVE_ANALISE, 'picos-mensais'],
    queryFn: () => chamar<PicoMensal[]>('/analise/picos-mensais'),
  });
}

export function useMapaPicos() {
  return useQuery<MapaPicos>({
    queryKey: [...CHAVE_ANALISE, 'mapa-picos'],
    queryFn: () => chamar<MapaPicos>('/analise/mapa-picos'),
  });
}

export function useRecomendacoes() {
  return useQuery<Recomendacao[]>({
    queryKey: [...CHAVE_ANALISE, 'recomendacoes'],
    queryFn: () => chamar<Recomendacao[]>('/analise/recomendacoes'),
  });
}

export function useContratoIdeal() {
  return useQuery<ContratoIdeal>({
    queryKey: [...CHAVE_ANALISE, 'contrato-ideal'],
    queryFn: () => chamar<ContratoIdeal>('/analise/contrato-ideal'),
  });
}
