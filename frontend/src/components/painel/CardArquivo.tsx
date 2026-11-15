'use client';

import { AlertCircle, FileText, UploadCloud } from 'lucide-react';
import { useRef } from 'react';

import { useEnviarArquivo, useImportarExemplo } from '@/api/hooks/useMedicoes';
import type { MedicoesResumo } from '@/api/tipos';
import { unidadeDoArquivo } from '@/lib/arquivo';
import { formatData, rotuloMes } from '@/lib/format';

type Props = {
  resumo: MedicoesResumo;
  nomePredio: string;
  demandaKw: number;
};

export function CardArquivo({ resumo, nomePredio, demandaKw }: Props) {
  const enviar = useEnviarArquivo();
  const exemplo = useImportarExemplo();
  const inputRef = useRef<HTMLInputElement>(null);
  const ocupado = enviar.isPending || exemplo.isPending;
  const erro = enviar.error?.mensagem ?? exemplo.error?.mensagem ?? null;

  async function escolherArquivo(arquivo: File) {
    enviar.reset();
    exemplo.reset();
    const primeiraLinha = (await arquivo.slice(0, 1024).text()).split(/\r?\n/)[0] ?? '';
    const unidade = unidadeDoArquivo(primeiraLinha);
    await enviar.mutateAsync({ arquivo, nomePredio, demandaKw, unidade }).catch(() => {});
  }

  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Arquivo de medição</h2>
          <p className="mt-1 text-sm text-tinta-2">
            <strong>{resumo.arquivo}</strong>{' '}
            <span className="text-tinta-3">
              ({resumo.origem === 'exemplo' ? 'exemplo' : 'enviado'})
            </span>
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-tinta-2 md:grid-cols-[auto_1fr]">
            <dt className="text-tinta-3">Período</dt>
            <dd>
              {formatData(resumo.inicio)} a {formatData(resumo.fim)}
            </dd>
            <dt className="text-tinta-3">Intervalo</dt>
            <dd>{resumo.intervalo_min} min</dd>
            <dt className="text-tinta-3">Leituras</dt>
            <dd className="tabular-nums">{resumo.total_leituras.toLocaleString('pt-BR')}</dd>
            <dt className="text-tinta-3">Importado em</dt>
            <dd>{formatData(resumo.importado_em)}</dd>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-md border border-borda bg-superficie px-3 py-2 text-sm font-medium text-tinta hover:bg-menu disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud aria-hidden className="h-4 w-4" />
            Enviar outro arquivo
          </button>
          <button
            type="button"
            onClick={() => {
              enviar.reset();
              exemplo.reset();
              exemplo.mutate();
            }}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-md border border-borda bg-superficie px-3 py-2 text-sm font-medium text-tinta hover:bg-menu disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText aria-hidden className="h-4 w-4" />
            Usar arquivo de exemplo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void escolherArquivo(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {resumo.meses_sem_dados.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-borda bg-amber-fundo px-4 py-3 text-sm text-amber-texto">
          <strong>Meses sem dados:</strong>{' '}
          {resumo.meses_sem_dados.map((m) => rotuloMes(m)).join(' · ')}
        </div>
      )}

      {ocupado && (
        <div className="mt-4 text-sm text-tinta-3" role="status">
          Lendo o arquivo…
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-md border border-multa-borda bg-multa-fundo px-4 py-3 text-sm text-multa-texto"
        >
          <AlertCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p>{erro}</p>
            <button
              type="button"
              onClick={() => {
                enviar.reset();
                exemplo.reset();
              }}
              className="mt-2 inline-flex items-center rounded-md border border-multa-borda bg-superficie px-3 py-1.5 text-xs font-medium text-multa-texto hover:bg-multa-fundo"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
