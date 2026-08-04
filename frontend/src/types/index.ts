export type Role = 'ADMIN' | 'DIRECTOR' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
}
