'use client';

import { AlertCircle } from 'lucide-react';

import {
  useAnaliseResumo,
  useMapaPicos,
  usePicosMensais,
  useRecomendacoes,
} from '@/api/hooks/useAnalise';
import { usePrevisao } from '@/api/hooks/usePrevisao';
import type {
  AnaliseResumo,
  MapaPicos as MapaPicosTipo,
  MedicoesResumo,
  PicoMensal,
  PrevisaoProximoMes,
  Recomendacao,
} from '@/api/tipos';
import { BarraDemonstracao } from '@/components/BarraDemonstracao';
import { MapaPicos } from '@/components/graficos/MapaPicos';
import { PicosMensais } from '@/components/graficos/PicosMensais';
import { CardArquivo } from '@/components/painel/CardArquivo';
import { CardDestaque } from '@/components/painel/CardDestaque';
import { CardPrevisao } from '@/components/painel/CardPrevisao';
import { CardRecomendacoes } from '@/components/painel/CardRecomendacoes';

type Props = {
  medicoes: MedicoesResumo;
  nomePredio: string;
  demandaKw: number;
  pontaInicio: string;
  pontaFim: string;
};

const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

export function PainelComArquivo({
  medicoes,
  nomePredio,
  demandaKw,
  pontaInicio,
  pontaFim,
}: Props) {
  const resumo = useAnaliseResumo();
  const picos = usePicosMensais();
  const previsao = usePrevisao();
  const mapa = useMapaPicos();
  const recomendacoes = useRecomendacoes();

  return (
    <div className="space-y-6">
      {DEMO && <BarraDemonstracao />}

      <BlocoComConsulta
        consulta={resumo}
        titulo="Resumo do período"
        render={(dados: AnaliseResumo) => <CardDestaque resumo={dados} />}
      />

      <CardArquivo resumo={medicoes} nomePredio={nomePredio} demandaKw={demandaKw} />

      <BlocoComConsulta
        consulta={picos}
        titulo="Pico de demanda por mês"
        render={(dados: PicoMensal[]) => {
          const r = resumo.data;
          if (!r) return null;
          return (
            <PicosMensais
              picos={dados}
              contratadaKw={r.contratada_kw}
              limiteKw={r.limite_multa_kw}
            />
          );
        }}
      />

      <BlocoComConsulta
        consulta={previsao}
        titulo="Previsão para o próximo mês"
        render={(dados: PrevisaoProximoMes) => <CardPrevisao previsao={dados} />}
      />

      <BlocoComConsulta
        consulta={mapa}
        titulo="Horários dos picos"
        render={(dados: MapaPicosTipo) => (
          <MapaPicos dados={dados} pontaInicio={pontaInicio} pontaFim={pontaFim} />
        )}
      />

      <BlocoComConsulta
        consulta={recomendacoes}
        titulo="Recomendações"
        render={(dados: Recomendacao[]) => <CardRecomendacoes recomendacoes={dados} />}
      />
    </div>
  );
}

type UseQueryLike<T> = {
  data?: T;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

function BlocoComConsulta<T>({
  consulta,
  titulo,
  render,
}: {
  consulta: UseQueryLike<T>;
  titulo: string;
  render: (dados: T) => React.ReactNode;
}) {
  if (consulta.isPending) {
    return <Esqueleto titulo={titulo} />;
  }
  if (consulta.isError || !consulta.data) {
    return (
      <section className="rounded-xl border border-multa-borda bg-multa-fundo p-6 text-multa-texto">
        <div className="flex items-start gap-3">
          <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h2 className="text-base font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm">API indisponível para carregar este bloco.</p>
            <button
              type="button"
              onClick={() => consulta.refetch()}
              className="mt-2 inline-flex items-center rounded-md border border-multa-borda bg-superficie px-3 py-1.5 text-xs font-medium text-multa-texto hover:bg-multa-fundo"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </section>
    );
  }
  return <>{render(consulta.data)}</>;
}

function Esqueleto({ titulo }: { titulo: string }) {
  return (
    <section
      aria-busy="true"
      className="rounded-xl border border-borda bg-superficie p-6"
    >
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="mt-4 h-24 animate-pulse rounded-md bg-menu-ativo" />
    </section>
  );
}
