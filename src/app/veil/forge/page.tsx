'use client';

import { useRouter } from 'next/navigation';
import { BlessingForge } from '@/components/veil';
import { RoleGuard } from '@/components/role/RoleGuard';

export default function ForgePage() {
  const router = useRouter();

  return (
    <RoleGuard requiredRole="teacher" redirectTo="/veil/kid">
      <BlessingForge
        onBack={() => router.push('/veil')}
      />
    </RoleGuard>
  );
}
