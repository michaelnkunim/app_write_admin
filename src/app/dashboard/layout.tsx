'use client';

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import LoadingFallback from '@/components/LoadingFallback';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard fallback={<LoadingFallback />}>
      {children}
    </AuthGuard>
  );
} 