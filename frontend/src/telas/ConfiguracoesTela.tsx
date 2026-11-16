'use client';

import { AlertCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

import {
  useConfiguracao,
  useSalvarConfiguracao,
} from '@/api/hooks/useConfiguracao';
import type { Configuracao, ErroDeValidacao } from '@/api/tipos';
import { formatKw, formatRs } from '@/lib/format';
import { limiteMulta } from '@/lib/regras';

const SUGESTAO: Configuracao = {
  empresa: {
    razao_social: 'Distribuidora Exemplo Ltda.',
    cidade_uf: 'Recife/PE',
    modalidade: 'verde',
  },
  demanda_contratada_kw: 80,
  tolerancia: 0.05,
  tarifa_demanda_rs_kw: 12.89,
  ponta_inicio: '17:30',
  ponta_fim: '20:30',
  fonte_dados: 'memoria_massa',
  margem_seguranca_kw: 1,
};

function semComputados(dados: Configuracao): Configuracao {
  // Backend devolve limite_multa_kw e atualizado_em; aqui ficamos só com o corpo editável.
  return {
    empresa: { ...dados.empresa },
    demanda_contratada_kw: dados.demanda_contratada_kw,
    tolerancia: dados.tolerancia,
    tarifa_demanda_rs_kw: dados.tarifa_demanda_rs_kw,
    ponta_inicio: dados.ponta_inicio,
    ponta_fim: dados.ponta_fim,
    fonte_dados: dados.fonte_dados,
    margem_seguranca_kw: dados.margem_seguranca_kw,
  };
}

export function ConfiguracoesTela() {
  const consulta = useConfiguracao();

  if (consulta.isPending) {
    return <div className="text-tinta-3">Carregando…</div>;
  }

  const apiIndisponivel = consulta.isError;
  const inicial =
    consulta.data?.status === 'carregado'
      ? semComputados(consulta.data.dados)
      : SUGESTAO;

  return (
    <Formulario
      key={consulta.data?.status ?? 'inicial'}
      inicial={inicial}
      apiIndisponivel={apiIndisponivel}
    />
  );
}

function Formulario({
  inicial,
  apiIndisponivel,
}: {
  inicial: Configuracao;
  apiIndisponivel: boolean;
}) {
  const router = useRouter();
  const salvar = useSalvarConfiguracao();

  const [empresa, setEmpresa] = useState(inicial.empresa);
  const [demandaTexto, setDemandaTexto] = useState(numeroParaTexto(inicial.demanda_contratada_kw));
  const [tarifaTexto, setTarifaTexto] = useState(numeroParaTexto(inicial.tarifa_demanda_rs_kw));
  const [pontaInicio, setPontaInicio] = useState(inicial.ponta_inicio);
  const [pontaFim, setPontaFim] = useState(inicial.ponta_fim);
  const [margemTexto, setMargemTexto] = useState(numeroParaTexto(inicial.margem_seguranca_kw));
  const [errosFrente, setErrosFrente] = useState<ErroDeValidacao[]>([]);

  const errosBackend = salvar.error?.erros ?? [];
  const erroIndisponivel = salvar.error?.indisponivel ?? false;
  const erroDe = (campo: string) =>
    [...errosFrente, ...errosBackend].find((e) => e.campo === campo)?.mensagem;

  const demandaKw = parsearNumero(demandaTexto);
  const limiteKw = demandaKw && demandaKw > 0 ? limiteMulta(demandaKw) : null;
  const duracao = duracaoPonta(pontaInicio, pontaFim);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (apiIndisponivel) return;

    const valor: Configuracao = {
      empresa: {
        razao_social: empresa.razao_social.trim(),
        cnpj: empresa.cnpj?.trim() || undefined,
        cidade_uf: empresa.cidade_uf.trim(),
        modalidade: empresa.modalidade,
      },
      demanda_contratada_kw: parsearNumero(demandaTexto) ?? Number.NaN,
      tolerancia: 0.05,
      tarifa_demanda_rs_kw: parsearNumero(tarifaTexto) ?? Number.NaN,
      ponta_inicio: pontaInicio,
      ponta_fim: pontaFim,
      fonte_dados: 'memoria_massa',
      margem_seguranca_kw: parsearNumero(margemTexto) ?? Number.NaN,
    };

    const erros = validar(valor);
    setErrosFrente(erros);
    if (erros.length > 0) return;

    salvar.mutate(valor, {
      onSuccess: () => router.push('/painel'),
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-tinta-3">
          Cadastre os dados da empresa e do contrato para o Antevê começar a
          analisar a memória de massa.
        </p>
      </header>

      {apiIndisponivel && (
        <Aviso tipo="amber" icone={AlertCircle}>
          <strong>API indisponível.</strong> Confira se o backend está rodando
          em <code>localhost:8000</code> antes de salvar.
        </Aviso>
      )}
      {erroIndisponivel && (
        <Aviso tipo="multa" icone={AlertCircle}>
          Não foi possível salvar — a API respondeu com erro. Tente de novo.
        </Aviso>
      )}

      <Secao numero={1} titulo="Dados da empresa">
        <Campo rotulo="Razão social" erro={erroDe('empresa.razao_social')}>
          <input
            type="text"
            value={empresa.razao_social}
            onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })}
            className={estiloInput(erroDe('empresa.razao_social'))}
            required
          />
        </Campo>
        <Campo rotulo="CNPJ (opcional)" erro={erroDe('empresa.cnpj')}>
          <input
            type="text"
            value={empresa.cnpj ?? ''}
            onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
            className={estiloInput(erroDe('empresa.cnpj'))}
            inputMode="numeric"
          />
        </Campo>
        <Campo rotulo="Cidade / UF" erro={erroDe('empresa.cidade_uf')}>
          <input
            type="text"
            value={empresa.cidade_uf}
            onChange={(e) => setEmpresa({ ...empresa, cidade_uf: e.target.value })}
            className={estiloInput(erroDe('empresa.cidade_uf'))}
            required
          />
        </Campo>
        <Campo rotulo="Modalidade" erro={erroDe('empresa.modalidade')}>
          <div className="flex gap-4">
            {(['verde', 'azul'] as const).map((valor) => (
              <label key={valor} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="modalidade"
                  value={valor}
                  checked={empresa.modalidade === valor}
                  onChange={() => setEmpresa({ ...empresa, modalidade: valor })}
                  className="h-4 w-4 accent-tinta"
                />
                <span className="capitalize">{valor}</span>
              </label>
            ))}
          </div>
        </Campo>
      </Secao>

      <Secao numero={2} titulo="Contrato de demanda">
        <Campo rotulo="Demanda contratada (kW)" erro={erroDe('demanda_contratada_kw')}>
          <input
            type="text"
            inputMode="decimal"
            value={demandaTexto}
            onChange={(e) => setDemandaTexto(e.target.value)}
            className={estiloInput(erroDe('demanda_contratada_kw'))}
            required
            aria-describedby="demanda-previa"
          />
          <p id="demanda-previa" className="mt-2 text-sm text-tinta-2">
            {limiteKw !== null ? (
              <>
                Limite de multa: <strong>{formatKw(limiteKw)}</strong>
              </>
            ) : (
              'Digite a demanda para ver o limite de multa.'
            )}
          </p>
          <BarraZonas contratadaKw={demandaKw && demandaKw > 0 ? demandaKw : null} />
        </Campo>

        <div className="rounded-md border border-divisoria bg-menu px-4 py-3 text-sm text-tinta-2">
          <Info aria-hidden className="mr-2 inline h-4 w-4 align-text-bottom" />
          Tolerância: <strong>5% (regra da ANEEL)</strong>.
        </div>

        <Campo rotulo="Tarifa de demanda (R$/kW)" erro={erroDe('tarifa_demanda_rs_kw')}>
          <input
            type="text"
            inputMode="decimal"
            value={tarifaTexto}
            onChange={(e) => setTarifaTexto(e.target.value)}
            className={estiloInput(erroDe('tarifa_demanda_rs_kw'))}
            required
          />
          {parsearNumero(tarifaTexto) !== null && (
            <p className="mt-2 text-sm text-tinta-3">{formatRs(parsearNumero(tarifaTexto)!)} por kW.</p>
          )}
        </Campo>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Campo rotulo="Início do horário de ponta" erro={erroDe('ponta_inicio')}>
            <input
              type="time"
              value={pontaInicio}
              onChange={(e) => setPontaInicio(e.target.value)}
              className={estiloInput(erroDe('ponta_inicio'))}
              required
            />
          </Campo>
          <Campo rotulo="Fim do horário de ponta" erro={erroDe('ponta_fim')}>
            <input
              type="time"
              value={pontaFim}
              onChange={(e) => setPontaFim(e.target.value)}
              className={estiloInput(erroDe('ponta_fim'))}
              required
            />
          </Campo>
          <div className="self-end pb-1 text-sm text-tinta-3">
            Duração: <strong>{duracao}</strong>
          </div>
        </div>

        <details className="rounded-md border border-divisoria">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-tinta-2">
            Opções avançadas
          </summary>
          <div className="border-t border-divisoria p-4">
            <Campo
              rotulo="Margem de segurança do contrato recomendado (kW)"
              erro={erroDe('margem_seguranca_kw')}
            >
              <input
                type="text"
                inputMode="decimal"
                value={margemTexto}
                onChange={(e) => setMargemTexto(e.target.value)}
                className={estiloInput(erroDe('margem_seguranca_kw'))}
                required
              />
              <p className="mt-2 text-sm text-tinta-3">
                Folga mínima exigida do contrato recomendado em cada mês.
              </p>
            </Campo>
          </div>
        </details>
      </Secao>

      <Secao numero={3} titulo="Fonte de dados">
        <div className="grid gap-3 md:grid-cols-2">
          <CardFonte
            selecionado
            titulo="Memória de massa"
            descricao="Envio de arquivo da distribuidora (CSV)."
          />
          <CardFonte
            desabilitado
            titulo="Medidor IoT (tempo real)"
            descricao="Proposta apresentada na parte teórica."
            selo="Em breve"
          />
        </div>
      </Secao>

      <footer className="flex items-center justify-end gap-3 border-t border-divisoria pt-4">
        <button
          type="submit"
          disabled={apiIndisponivel || salvar.isPending}
          className="rounded-md bg-tinta px-4 py-2 text-sm font-semibold text-pagina hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvar.isPending ? 'Salvando…' : 'Salvar e ir para o painel'}
        </button>
      </footer>
    </form>
  );
}

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-borda bg-superficie p-6">
      <header className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-full border border-borda text-sm font-semibold text-tinta-2"
        >
          {numero}
        </span>
        <h2 className="text-base font-semibold">{titulo}</h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-tinta-2">
        {rotulo}
      </label>
      <div id={id} className="mt-1">
        {children}
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-sm text-multa-texto">
          {erro}
        </p>
      )}
    </div>
  );
}

function estiloInput(erro?: string) {
  const base =
    'w-full rounded-md border bg-superficie px-3 py-2 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-tinta';
  return `${base} ${erro ? 'border-multa-borda' : 'border-borda'}`;
}

function CardFonte({
  titulo,
  descricao,
  selecionado = false,
  desabilitado = false,
  selo,
}: {
  titulo: string;
  descricao: string;
  selecionado?: boolean;
  desabilitado?: boolean;
  selo?: string;
}) {
  const classes = [
    'rounded-lg border p-4 text-left transition-colors',
    desabilitado
      ? 'cursor-not-allowed border-divisoria bg-menu opacity-70'
      : selecionado
      ? 'border-tinta bg-menu-ativo'
      : 'border-borda bg-superficie hover:bg-menu',
  ].join(' ');
  return (
    <div className={classes} aria-disabled={desabilitado || undefined} aria-pressed={selecionado || undefined}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <strong className="text-sm">{titulo}</strong>
        {selo && (
          <span className="rounded-full border border-borda bg-superficie px-2 py-0.5 text-xs text-tinta-3">
            {selo}
          </span>
        )}
      </div>
      <p className="text-sm text-tinta-3">{descricao}</p>
    </div>
  );
}

function BarraZonas({ contratadaKw }: { contratadaKw: number | null }) {
  // Visual: Dentro 100 unidades, Tolerância 5, Multa 20 (para o segmento final ter alguma
  // presença). Larguras em porcentagem da soma.
  const [p1, p2, p3] = [100, 5, 20];
  const total = p1 + p2 + p3;
  const w1 = (p1 / total) * 100;
  const w2 = (p2 / total) * 100;
  const w3 = (p3 / total) * 100;

  const limite = contratadaKw ? limiteMulta(contratadaKw) : null;

  return (
    <div className="mt-3" aria-hidden>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-borda">
        <span style={{ width: `${w1}%`, background: 'var(--dentro-preenchimento)' }} />
        <span style={{ width: `${w2}%`, background: 'var(--amber-preenchimento)' }} />
        <span style={{ width: `${w3}%`, background: 'var(--multa-preenchimento)' }} />
      </div>
      <div
        className="mt-2 grid gap-2 text-xs text-tinta-3"
        style={{ gridTemplateColumns: `${w1}% ${w2}% ${w3}%` }}
      >
        <span>
          Dentro {contratadaKw ? `· até ${formatKw(contratadaKw)}` : ''}
        </span>
        <span className="text-center">
          Tolerância {limite ? `· até ${formatKw(limite)}` : ''}
        </span>
        <span className="text-right">Multa</span>
      </div>
    </div>
  );
}

function Aviso({
  tipo,
  icone: Icone,
  children,
}: {
  tipo: 'amber' | 'multa';
  icone: typeof AlertCircle;
  children: React.ReactNode;
}) {
  const classes =
    tipo === 'amber'
      ? 'bg-amber-fundo text-amber-texto border-amber-borda'
      : 'bg-multa-fundo text-multa-texto border-multa-borda';
  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${classes}`} role="alert">
      <Icone aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function parsearNumero(texto: string): number | null {
  const normal = texto.trim().replace(',', '.');
  if (!normal) return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

function numeroParaTexto(n: number): string {
  // Mostra com vírgula decimal, até 2 casas, sem casas sobrando.
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function duracaoPonta(inicio: string, fim: string): string {
  if (!horaValida(inicio) || !horaValida(fim)) return '—';
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  let minutos = hf * 60 + mf - (hi * 60 + mi);
  if (minutos <= 0) minutos += 24 * 60;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function horaValida(h: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
}

function validar(v: Configuracao): ErroDeValidacao[] {
  const erros: ErroDeValidacao[] = [];

  if (!v.empresa.razao_social) {
    erros.push({ campo: 'empresa.razao_social', mensagem: 'Informe a razão social' });
  }
  if (!v.empresa.cidade_uf) {
    erros.push({ campo: 'empresa.cidade_uf', mensagem: 'Informe a cidade e UF' });
  }

  if (!(v.demanda_contratada_kw > 0)) {
    erros.push({
      campo: 'demanda_contratada_kw',
      mensagem: 'A demanda contratada deve ser maior que zero',
    });
  }
  if (!(v.tarifa_demanda_rs_kw > 0)) {
    erros.push({
      campo: 'tarifa_demanda_rs_kw',
      mensagem: 'A tarifa deve ser maior que zero',
    });
  }
  if (!horaValida(v.ponta_inicio)) {
    erros.push({ campo: 'ponta_inicio', mensagem: 'Horário em formato HH:MM' });
  }
  if (!horaValida(v.ponta_fim)) {
    erros.push({ campo: 'ponta_fim', mensagem: 'Horário em formato HH:MM' });
  }
  if (
    horaValida(v.ponta_inicio) &&
    horaValida(v.ponta_fim) &&
    v.ponta_inicio === v.ponta_fim
  ) {
    erros.push({ campo: 'ponta_fim', mensagem: 'O fim da ponta deve ser diferente do início' });
  }
  if (!(v.margem_seguranca_kw >= 0)) {
    erros.push({
      campo: 'margem_seguranca_kw',
      mensagem: 'A margem de segurança não pode ser negativa',
    });
  }

  return erros;
}
