import { create } from 'zustand';

type Role = 'admin' | 'user';

interface AuthState {
  userId?: string;
  name?: string;
  role?: Role;
  login: (userId: string, role: Role) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: undefined,
  name: undefined,
  role: undefined,
  login: (userId, role) => set({ userId, role }),
  logout: () => set({ userId: undefined, name: undefined, role: undefined }),
}));
