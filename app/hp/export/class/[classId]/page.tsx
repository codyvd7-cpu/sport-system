import { redirect } from 'next/navigation';

type Props = { params: Promise<{ classId: string }> };

export default async function ExportClassPage({ params }: Props) {
  const { classId } = await params;
  redirect(`/hp-print/class/${classId}`);
}
