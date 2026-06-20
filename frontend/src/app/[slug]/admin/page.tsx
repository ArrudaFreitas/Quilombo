'use client'

import { AdminShell } from '@/components/admin/admin-shell'
import { AuthGuard } from '@/components/auth/auth-guard'

/**
 * Área administrativa do tenant (`{slug}.dominio/admin`). O `AuthGuard` garante
 * a sessão (loading/redirect/forbidden); autenticado, renderiza o painel.
 */
export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminShell />
    </AuthGuard>
  )
}
