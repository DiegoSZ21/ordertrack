export type Role = 'ADMIN' | 'ATENCION' | 'COCINA' | 'CLIENTE';

export const Role = {
  ADMIN: 'ADMIN' as Role,
  ATENCION: 'ATENCION' as Role,
  COCINA: 'COCINA' as Role,
  CLIENTE: 'CLIENTE' as Role,
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

