import { redirect } from 'next/navigation';

// Primeiro acesso: busca /configuracao direto no FastAPI (sem passar pelo proxy)
// e decide a rota. force-dynamic + cache no-store garantem que roda a cada requisição.
export const dynamic = 'force-dynamic';

const API_URL = process.env.API_URL ?? 'http://localhost:8000';

export default async function Home() {
  // redirect() lança uma exceção, então fica fora do try/catch (seção 7.4).
  let status: number | 'erro' = 'erro';
  try {
    const resposta = await fetch(`${API_URL}/configuracao`, { cache: 'no-store' });
    status = resposta.status;
  } catch {
    status = 'erro';
  }

  if (status === 404) redirect('/configuracoes');
  redirect('/painel');
}
