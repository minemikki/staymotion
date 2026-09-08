'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, homeFor } from '@/src/session/session';

export default function Index() {
  const router = useRouter();
  useEffect(() => { const s = getSession(); router.replace(s ? homeFor(s.role) : '/signin'); }, [router]);
  return <div className="auth"><div className="small">Laster …</div></div>;
}
