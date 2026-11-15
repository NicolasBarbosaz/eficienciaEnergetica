const TIMEOUT_LEITURA_MS = 3_000;
const TIMEOUT_ENVIO_MS = 60_000;

export class ErroDaApi extends Error {
  status: number;
  corpo: unknown;
  constructor(status: number, corpo: unknown, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.corpo = corpo;
  }
}

export class ErroDeRede extends Error {}
export class ErroDeTimeout extends Error {}

type Opcoes = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
  timeoutMs?: number;
};

export async function chamar<T>(rota: string, opcoes: Opcoes = {}): Promise<T> {
  const { body, timeoutMs, headers, ...resto } = opcoes;
  const metodo = resto.method ?? 'GET';
  const isEnvio = metodo !== 'GET' && metodo !== 'HEAD';
  const tempo = timeoutMs ?? (isEnvio ? TIMEOUT_ENVIO_MS : TIMEOUT_LEITURA_MS);

  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), tempo);

  const corpoFinal =
    body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)
      ? JSON.stringify(body)
      : (body as BodyInit | null | undefined);

  const cabecalhos = new Headers(headers);
  if (
    corpoFinal &&
    typeof corpoFinal === 'string' &&
    !cabecalhos.has('Content-Type')
  ) {
    cabecalhos.set('Content-Type', 'application/json');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`/api${rota}`, {
      ...resto,
      headers: cabecalhos,
      body: corpoFinal ?? undefined,
      signal: controlador.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new ErroDeTimeout('A API demorou para responder.');
    }
    throw new ErroDeRede('Falha de rede ao chamar a API.');
  } finally {
    clearTimeout(id);
  }

  if (!resposta.ok) {
    let corpo: unknown = null;
    try {
      corpo = await resposta.json();
    } catch {
      /* resposta sem JSON (ex.: 500 do backend) */
    }
    throw new ErroDaApi(
      resposta.status,
      corpo,
      `API respondeu ${resposta.status} em ${rota}`,
    );
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
