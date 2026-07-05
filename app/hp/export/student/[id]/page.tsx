import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function ExportStudentPage({ params }: Props) {
  const { id } = await params;
  redirect(`/hp-print/student/${id}`);
}
