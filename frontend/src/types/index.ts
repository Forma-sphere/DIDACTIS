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

export interface LessonCompetency {
  competencyId: string;
  competency: { id: string; code: string; name: string; domain: string };
}

export interface Lesson {
  id: string;
  sequenceId: string;
  sequence?: {
    id: string; title: string;
    progression?: {
      id: string; title: string;
      school?: { id: string; name: string };
    };
  };
  classId: string;
  class?: {
    id: string; name: string; level: Level; cycle: Cycle;
    teacher?: { id: string; firstName: string; lastName: string };
  };
  title: string;
  objective: string;
  content: string;
  duration: number;
  order: number;
  competencies: LessonCompetency[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLesson {
  lessonId: string;
  startTime: string;
  endTime: string;
  order: number;
  lesson: {
    id: string; title: string; duration: number;
    sequence?: { id: string; title: string };
  };
}

export interface JournalDay {
  id: string;
  classId: string;
  class?: {
    id: string; name: string; level: Level; cycle: Cycle;
    teacher?: { id: string; firstName: string; lastName: string };
  };
  date: string;
  notes: string | null;
  lessons: JournalLesson[];
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 'PDF' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER';

export interface LessonResource {
  lessonId: string;
  resourceId: string;
  lesson: { id: string; title: string };
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  filePath: string;
  tags: string[];
  lessons: LessonResource[];
  createdAt: string;
  updatedAt: string;
}

export type AssessmentStatus = 'NOT_EVALUATED' | 'IN_PROGRESS' | 'ACQUIRED' | 'EXCEEDED';

export interface AssessmentCompetency {
  competencyId: string;
  competency: { id: string; code: string; name: string; domain: string };
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  student: { id: string; firstName: string; lastName: string };
  competencyId: string;
  competency: { id: string; code: string; name: string; domain: string };
  status: AssessmentStatus;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  classId: string;
  class?: {
    id: string; name: string; level: Level; cycle: Cycle;
    teacher?: { id: string; firstName: string; lastName: string };
  };
  title: string;
  description: string | null;
  date: string;
  competencies: AssessmentCompetency[];
  results: AssessmentResult[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'PDF' | 'WORD';

export type SourceModule = 'LESSON' | 'SEQUENCE' | 'PROGRESSION' | 'JOURNAL' | 'ASSESSMENT';

export interface DocumentItem {
  id: string;
  title: string;
  type: DocumentType;
  sourceModule: SourceModule;
  sourceId: string;
  filePath: string;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

export type MessageRole = 'USER' | 'ASSISTANT';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'LESSON' | 'SEQUENCE' | 'PROGRESSION' | 'ASSESSMENT';

export interface DashboardActiveClass {
  id: string;
  name: string;
  level: Level;
  cycle: Cycle;
  studentCount: number;
  school: { id: string; name: string };
  schoolYear: { id: string; name: string; isCurrent: boolean };
}

export interface DashboardScheduleItem {
  lessonId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  sequence: { id: string; title: string } | null;
  className: string;
}

export interface DashboardActivity {
  id: string;
  title: string;
  type: ActivityType;
  updatedAt: string;
}

export interface DashboardNotification {
  type: string;
  message: string;
}

export interface DashboardShortcut {
  label: string;
  path: string;
  icon: string;
}

export interface DashboardData {
  user: { firstName: string; lastName: string; role: string };
  activeClass: DashboardActiveClass | null;
  todaySchedule: DashboardScheduleItem[];
  recentActivities: DashboardActivity[];
  notifications: DashboardNotification[];
  shortcuts: DashboardShortcut[];
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
