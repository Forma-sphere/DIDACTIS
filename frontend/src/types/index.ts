export type Role = 'ADMIN' | 'DIRECTOR' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
}
