import { AlertaTela } from '@/telas/AlertaTela';

export default async function AlertaDetalhePage({
  params,
}: PageProps<'/alertas/[id]'>) {
  const { id } = await params;
  return <AlertaTela id={id} />;
}
