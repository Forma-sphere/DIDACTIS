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

export type SchoolType = 'MATERNELLE' | 'ELEMENTAIRE' | 'PRIMAIRE';

export interface School {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  uaiCode: string | null;
  type: SchoolType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  schoolYears?: SchoolYear[];
}

export interface SchoolYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  periods?: Period[];
}

export interface Period {
  id: string;
  schoolYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}
