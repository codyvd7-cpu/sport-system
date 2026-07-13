import { redirect } from 'next/navigation';

export default function PlayerPage() {
  redirect('/player/auth');
}
