export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'teacher' | 'admin' | 'student';
}

export interface LoginResponse {
  ok: boolean;
  message: string;
  sessionId: string;
  user: User;
  error?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  board: string;
  standard: number;
  phone?: string;
  subjects?: string[];
  active: boolean;
  joinedAt: string;
  userId?: string;
  schoolName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentProfession?: string;
  parentCompanyName?: string;
  parentDesignation?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
  active?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  board: string;
  standard: number;
  subject: string;
  studentIds: string[];
  maxStudents?: number;
  description?: string;
}

export interface Test {
  id: string;
  title?: string;
  subject: string;
  board: string;
  standard: number;
  date?: string;
  dateTime?: string;
  totalMarks: number;
  maxMarks?: number; // Legacy field for backwards compatibility
  duration: number;
  durationMin?: number; // Legacy field for backwards compatibility
  description?: string;
  active?: boolean;
}

export interface HealthResponse {
  ok: boolean;
  ts: number;
}

export interface ApiListResponse<T> {
  ok: boolean;
  items: T[];
  error?: string;
}

export interface StudentFilters {
  board: string;
  standard: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: {
    _seconds: number;
    _nanoseconds: number;
  } | string;
  details?: any;
}

export interface AnalyticsOverview {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalBatches: number;
  totalTests: number;
  totalHomework: number;
  pendingFees: number;
  collectedFees: number;
  attendanceRate: number;
}

export interface StudentAnalytics {
  id: string;
  name: string;
  attendanceRate: number;
  testAverage: number;
  totalTests: number;
  homeworkCompleted: number;
  totalHomework: number;
  feesPaid: number;
  feesPending: number;
}

export interface BatchAnalytics {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
  averageAttendance: number;
  averageTestScore: number;
  sessionsCompleted: number;
}

export interface SubjectAnalytics {
  subject: string;
  totalStudents: number;
  totalBatches: number;
  averageScore: number;
  totalTests: number;
}

export interface AttendanceAnalytics {
  date: string;
  present: number;
  absent: number;
  late: number;
  totalStudents: number;
  attendanceRate: number;
}

export interface LogStats {
  [key: string]: number;
}

export interface AttendanceSession {
  id: string;
  batchId: string;
  batchIds?: string[];
  date: string;
  subject: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  createdAt?: any;
}

export interface AttendanceMark {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  markedAt: any;
}

export interface DailyAttendance {
  id: string;
  sessionId: string;
  date: string;
  studentId: string;
  status: 'present' | 'absent' | 'late';
  markedAt: any;
  updatedAt?: any;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  marksObtained: number;
  totalMarks: number;
  remarks?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  subject: string;
  board: string;
  standard: number;
  dueDate: string;
  assignedTo: string[];
  active?: boolean;
  createdAt?: any;
}

export interface FeePlan {
  id?: string;
  amount: number;
  currency: string;
  frequency: string;
  startMonth?: string;
  isActive?: boolean;
}

export interface Message {
  id: string;
  title: string;
  content: string;
  type: 'notice' | 'announcement' | 'alert' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientType: 'all' | 'batch' | 'student' | 'standard' | 'board';
  recipientIds?: string[];
  batchId?: string;
  studentId?: string;
  board?: string;
  standard?: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  expiresAt?: string;
  isActive: boolean;
  readBy?: string[];
}