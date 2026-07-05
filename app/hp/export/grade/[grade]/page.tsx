import { redirect } from 'next/navigation';

type Props = { params: Promise<{ grade: string }> };

export default async function ExportGradePage({ params }: Props) {
  const { grade } = await params;
  redirect(`/hp-print/grade/${grade}`);
}
