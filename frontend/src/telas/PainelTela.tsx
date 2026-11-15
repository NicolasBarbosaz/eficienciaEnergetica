'use client';

import { AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

import { useConfiguracao } from '@/api/hooks/useConfiguracao';
import { useMedicoesResumo } from '@/api/hooks/useMedicoes';
import { EnvioArquivo } from '@/components/ui/EnvioArquivo';
import { PainelComArquivo } from './PainelComArquivo';

export function PainelTela() {
  const config = useConfiguracao();
  const medicoes = useMedicoesResumo();

  if (config.isPending || medicoes.isPending) {
    return <div className="text-tinta-3">Carregando…</div>;
  }

  if (config.isError) {
    return <AvisoBloco mensagem="API indisponível — não foi possível carregar a configuração." />;
  }

  if (config.data?.status === 'primeiro_acesso') {
    return (
      <AvisoBloco
        tipo="amber"
        mensagem={
          <>
            Cadastre o contrato antes de enviar a memória de massa.{' '}
            <Link href="/configuracoes" className="underline">
              Ir para Configurações
            </Link>
            .
          </>
        }
      />
    );
  }

  if (medicoes.isError) {
    return <AvisoBloco mensagem="API indisponível — não foi possível carregar as medições." />;
  }

  const conf = config.data!.dados;

  if (medicoes.data?.status === 'carregado') {
    return (
      <PainelComArquivo
        medicoes={medicoes.data.dados}
        nomePredio={conf.empresa.razao_social}
        demandaKw={conf.demanda_contratada_kw}
        pontaInicio={conf.ponta_inicio}
        pontaFim={conf.ponta_fim}
      />
    );
  }

  // status === 'vazio'
  return (
    <EnvioArquivo
      nomePredio={conf.empresa.razao_social}
      demandaKw={conf.demanda_contratada_kw}
    />
  );
}

function AvisoBloco({
  tipo = 'multa',
  mensagem,
}: {
  tipo?: 'amber' | 'multa';
  mensagem: React.ReactNode;
}) {
  const classes =
    tipo === 'amber'
      ? 'bg-amber-fundo text-amber-texto border-amber-borda'
      : 'bg-multa-fundo text-multa-texto border-multa-borda';
  const Icone = tipo === 'amber' ? Info : AlertCircle;
  return (
    <div
      role={tipo === 'multa' ? 'alert' : undefined}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${classes}`}
    >
      <Icone aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{mensagem}</div>
    </div>
  );
}
