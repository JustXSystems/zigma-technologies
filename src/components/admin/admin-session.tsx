'use client';

import { createContext, useContext } from 'react';
import type { AdminScreenKey } from '@/lib/admin-screens';

export type AdminUser = {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  roleId: number | null;
  roleName: string | null;
  screens: AdminScreenKey[] | '*';
};

/** Signed-in admin, provided by the admin layout (null while loading). */
export const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser() {
  return useContext(AdminUserContext);
}
