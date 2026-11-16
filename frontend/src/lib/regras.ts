import { AlertTriangle, CheckCircle2, Minus, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Situacao } from '@/api/tipos';

export const TOLERANCIA_PADRAO = 0.05;

/** Limite de multa (contratada × (1 + tolerância)), com 2 casas — igual ao backend (seção 5.1). */
export function limiteMulta(contratada: number, tolerancia = TOLERANCIA_PADRAO): number {
  return Math.round(contratada * (1 + tolerancia) * 100) / 100;
}

export type Risco = 'baixo' | 'medio' | 'alto';

export type EstiloVisual = {
  rotulo: string;
  Icone: LucideIcon;
  /** Classes utilitárias para chips e textos. */
  classes: { chip: string; texto: string };
  /** Variáveis CSS para componentes que precisam da cor crua (Recharts, grades CSS). */
  vars: { preenchimento: string; texto: string; fundo: string; borda: string; linha?: string };
};

export const estiloSituacao: Record<Situacao | 'sem_dados', EstiloVisual> = {
  dentro: {
    rotulo: 'Dentro do contratado',
    Icone: CheckCircle2,
    classes: {
      chip: 'bg-dentro-fundo text-dentro-texto border border-dentro-borda',
      texto: 'text-dentro-texto',
    },
    vars: {
      preenchimento: 'var(--dentro-preenchimento)',
      texto: 'var(--dentro-texto)',
      fundo: 'var(--dentro-fundo)',
      borda: 'var(--dentro-borda)',
    },
  },
  acima_contratado: {
    rotulo: 'Acima do contratado',
    Icone: ShieldAlert,
    classes: {
      chip: 'bg-amber-fundo text-amber-texto border border-amber-borda',
      texto: 'text-amber-texto',
    },
    vars: {
      preenchimento: 'var(--amber-preenchimento)',
      linha: 'var(--amber-linha)',
      texto: 'var(--amber-texto)',
      fundo: 'var(--amber-fundo)',
      borda: 'var(--amber-borda)',
    },
  },
  multa: {
    rotulo: 'Multa',
    Icone: AlertTriangle,
    classes: {
      chip: 'bg-multa-fundo text-multa-texto border border-multa-borda',
      texto: 'text-multa-texto',
    },
    vars: {
      preenchimento: 'var(--multa-preenchimento)',
      linha: 'var(--multa-linha)',
      texto: 'var(--multa-texto)',
      fundo: 'var(--multa-fundo)',
      borda: 'var(--multa-borda)',
    },
  },
  sem_dados: {
    rotulo: 'Sem dados',
    Icone: Minus,
    classes: {
      chip: 'bg-sem-dados text-tinta-3 border border-borda',
      texto: 'text-tinta-3',
    },
    vars: {
      preenchimento: 'var(--sem-dados)',
      texto: 'var(--tinta-3)',
      fundo: 'var(--sem-dados)',
      borda: 'var(--borda)',
    },
  },
};

export const estiloRisco: Record<Risco, EstiloVisual> = {
  baixo: { ...estiloSituacao.dentro, rotulo: 'Risco baixo' },
  medio: { ...estiloSituacao.acima_contratado, rotulo: 'Risco médio' },
  alto: { ...estiloSituacao.multa, rotulo: 'Risco alto' },
};
