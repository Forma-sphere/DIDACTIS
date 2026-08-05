export type Role = 'ADMIN' | 'DIRECTOR' | 'TEACHER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  schoolId: string | null;
  school?: { id: string; name: string } | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export type Level = 'TPS' | 'PS' | 'MS' | 'GS' | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2';

export type Cycle = 'CYCLE_1' | 'CYCLE_2' | 'CYCLE_3';

export type Gender = 'M' | 'F';

export interface Student {
  id: string;
  schoolId: string;
  school?: { id: string; name: string };
  classId: string;
  class?: {
    id: string; name: string; level: Level; cycle: Cycle;
    teacher?: { id: string; firstName: string; lastName: string };
  };
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  code: string;
  name: string;
  domain: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressionCompetency {
  competencyId: string;
  order: number;
  competency: { id: string; code: string; name: string; domain: string };
}

export interface Progression {
  id: string;
  schoolId: string;
  school?: { id: string; name: string };
  classId: string;
  class?: { id: string; name: string; level: Level; cycle: Cycle };
  schoolYearId: string;
  schoolYear?: {
    id: string; name: string;
    periods?: Period[];
  };
  title: string;
  description: string | null;
  competencies: ProgressionCompetency[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceCompetency {
  competencyId: string;
  order: number;
  competency: { id: string; code: string; name: string; domain: string };
}

export interface Sequence {
  id: string;
  progressionId: string;
  progression?: {
    id: string; title: string;
    school?: { id: string; name: string };
    class?: { id: string; name: string };
    schoolYear?: { id: string; name: string };
  };
  title: string;
  description: string | null;
  order: number;
  competencies: SequenceCompetency[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassItem {
  id: string;
  name: string;
  schoolId: string;
  school?: { id: string; name: string };
  schoolYearId: string;
  schoolYear?: { id: string; name: string };
  teacherId: string;
  teacher?: { id: string; firstName: string; lastName: string; email: string };
  level: Level;
  cycle: Cycle;
  capacity: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
