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
  assignedTeachers?: AssignedTeacher[];
}

export interface AssignedTeacher {
  teacherId: string;
  teacherName: string;
  subjects?: string[];
  assignedAt?: string;
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
  teacherId?: string;
  teacherName?: string;
  schedule?: BatchSchedule;
}

export interface BatchSchedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
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

// New types for enhanced features

export interface Notification {
  id: string;
  userId: string;
  type: 'homework' | 'test' | 'fee' | 'message' | 'attendance' | 'announcement' | 'leave' | 'result';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

export interface Schedule {
  id: string;
  batchId: string;
  batchName?: string;
  teacherId: string;
  teacherName?: string;
  subject: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  room?: string;
  recurring: boolean;
  createdAt?: any;
}

export interface Leave {
  id: string;
  studentId: string;
  studentName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: 'student' | 'parent';
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  supportingDocument?: string;
}

export interface DiscussionThread {
  id: string;
  batchId: string;
  subject: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'student' | 'teacher';
  createdAt: string;
  status: 'open' | 'resolved';
  tags: string[];
  replyCount: number;
  viewCount: number;
  attachments?: string[];
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'student' | 'teacher';
  createdAt: string;
  likes: number;
  attachments?: string[];
}

export interface Material {
  id: string;
  title: string;
  subject: string;
  board: string;
  standard: number;
  chapter?: string;
  topic?: string;
  type: 'notes' | 'question_bank' | 'solutions' | 'video';
  fileUrl: string;
  fileType: string;
  tags: string[];
  description?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  downloadCount?: number;
  viewCount?: number;
  accessControl?: {
    type: 'all' | 'batch' | 'student';
    batchIds?: string[];
    studentIds?: string[];
  };
}

export interface ProgressReport {
  studentId: string;
  studentName: string;
  board: string;
  standard: number;
  period: {
    startDate: string;
    endDate: string;
  };
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  academicPerformance: {
    tests: Array<{
      subject: string;
      totalTests: number;
      average: number;
      best: number;
      worst: number;
      trend: 'improving' | 'declining' | 'stable';
    }>;
    overallAverage: number;
  };
  homework: {
    assigned: number;
    completed: number;
    completionRate: number;
    onTimeSubmission: number;
  };
  strengths: string[];
  needsImprovement: string[];
  teacherRemarks?: string;
}

export interface FeeInstallment {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAmount?: number;
  paidDate?: string;
  lateFee?: number;
  description?: string;
}