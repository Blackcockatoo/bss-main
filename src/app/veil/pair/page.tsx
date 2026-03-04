'use client';

import { useRouter } from 'next/navigation';
import { PairQR } from '@/components/veil';
import { RoleGuard } from '@/components/role/RoleGuard';

export default function PairPage() {
  const router = useRouter();

  return (
    <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
      <PairQR
        onBack={() => router.push('/veil')}
        onPaired={() => router.refresh()}
      />
    </RoleGuard>
  );
}
