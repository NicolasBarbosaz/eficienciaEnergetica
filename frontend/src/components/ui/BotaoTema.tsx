'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function BotaoTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // Padrão recomendado pelo next-themes para detectar mount no cliente e
    // evitar mismatch de hidratação, já que resolvedTheme só existe após o mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  if (!montado) {
    // Antes de montar no cliente, render vazio do mesmo tamanho para não divergir do SSR.
    return <span aria-hidden className="inline-block h-10 w-10" />;
  }

  const escuro = resolvedTheme === 'dark';
  const rotulo = escuro ? 'Ativar modo claro' : 'Ativar modo escuro';
  const Icone = escuro ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(escuro ? 'light' : 'dark')}
      aria-label={rotulo}
      title={rotulo}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-borda bg-superficie text-tinta hover:bg-menu-ativo"
    >
      <Icone aria-hidden className="h-5 w-5" />
    </button>
  );
}
