'use client';

import { usePrevisao } from '@/api/hooks/usePrevisao';
import { useStatusApi } from '@/api/hooks/useStatusApi';

export function BarraDemonstracao() {
  const status = useStatusApi();
  const previsao = usePrevisao();

  const online = status.data === 'online';
  const modelo =
    previsao.data?.modelo === 'lightgbm'
      ? 'modelo LightGBM'
      : previsao.data?.modelo === 'baseline'
        ? 'previsão simples'
        : '—';

  return (
    <div
      role="status"
      className="rounded-md border border-dashed border-tinta-3 bg-superficie px-4 py-2 text-xs text-tinta-3"
    >
      <span className="font-medium uppercase tracking-wide">Demonstração</span>
      <span className="mx-2">·</span>
      <span>
        API{' '}
        <strong className={online ? 'text-dentro-texto' : 'text-multa-texto'}>
          {online ? 'conectada' : 'offline'}
        </strong>
      </span>
      <span className="mx-2">·</span>
      <span>
        Previsão em uso: <strong className="text-tinta-2">{modelo}</strong>
      </span>
    </div>
  );
}
