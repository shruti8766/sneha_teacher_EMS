# Sneha IMS API Documentation

**Version:** 2.0.0  
**Last Updated:** November 22, 2025  
**Base URL:** `https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Students Management](#students-management)
3. [Teachers Management](#teachers-management)
4. [Batches Management](#batches-management)
5. [Subjects & Chapters](#subjects--chapters)
6. [Syllabus Management](#syllabus-management)
7. [Homework Management](#homework-management)
8. [Tests Management](#tests-management)
9. [Fee Management](#fee-management)
10. [Attendance Management](#attendance-management)
11. [Schedules & Classes](#schedules--classes)
12. [Materials Management](#materials-management)
13. [Messages](#messages)
14. [Analytics](#analytics)
15. [Activity Logs](#activity-logs)
16. [Settings](#settings)
17. [Notifications](#notifications)
18. [File Management](#file-management)
19. [Reports](#reports)
20. [User Management](#user-management)

---

## Authentication

All API requests (except `/health`, `/register`, and `/login`) require authentication via session token.

**Authorization Header Format:**
```
Authorization: Bearer <sessionId>
```

### Health Check
```http
GET /health
```
**Access:** Public  
**Response:**
```json
{
  "ok": true,
  "ts": 1700577600000
}
```

### Register User
```http
POST /register
```
**Access:** Public  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "role": "teacher"
}
```
**Response:**
```json
{
  "ok": true,
  "userId": "user_uid",
  "message": "User registered successfully"
}
```

### Login
```http
POST /login
```
**Access:** Public  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```
**Response:**
```json
{
  "ok": true,
  "sessionId": "52c9bded-a9d6-4d6d-883d-b5acc2cc75bc",
  "user": {
    "uid": "user_uid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "teacher"
  }
}
```

---

## Students Management

### Create Student
```http
POST /teachers/:teacherId/students
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "board": "SSC",
  "standard": 10,
  "phone": "1234567890",
  "subjects": ["Mathematics", "Physics"]
}
```
**Response:**
```json
{
  "ok": true,
  "studentId": "student_id",
  "userId": "user_uid"
}
```
**Note:** Auto-generates temporary password and creates user account. Automatically logged with action "created_student".

### Get Student by ID
```http
GET /students/:id
```
**Access:** Authenticated  
**Response:**
```json
{
  "ok": true,
  "id": "student_id",
  "name": "Student Name",
  "email": "student@example.com",
  "board": "SSC",
  "standard": 10,
  "phone": "1234567890",
  "subjects": ["Mathematics"],
  "createdAt": {...}
}
```

### List Students
```http
GET /students?board=SSC&standard=10&subject=Math&limit=20
```
**Access:** Authenticated  
**Query Parameters:**
- `board` (optional): Filter by board (SSC, CBSE, ICSE, etc.)
- `standard` (optional): Filter by standard (1-12)
- `subject` (optional): Filter by subject
- `limit` (optional): Max 100, default 20

**Response:**
```json
{
  "ok": true,
  "items": [...]
}
```

### Update Student
```http
PUT /students/:studentId
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "subjects": ["Math", "Science"]
}
```
**Note:** Automatically logged with action "updated_student".

### Delete Student (Soft Delete)
```http
DELETE /students/:studentId
```
**Access:** Teacher/Admin  
**Note:** Soft delete (sets `active: false`). Automatically logged with action "deleted_student".

### Get Teacher's Students
```http
GET /teachers/:teacherId/students
```
**Access:** Teacher/Admin

### Update Teacher-Student Assignment
```http
PUT /teachers/:teacherId/students/:studentId
```
**Access:** Teacher/Admin

### Remove Student from Teacher
```http
DELETE /teachers/:teacherId/students/:studentId
```
**Access:** Teacher/Admin

---

## Teachers Management

### Create Teacher
```http
POST /teachers
```
**Access:** Admin  
**Body:**
```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "phone": "1234567890",
  "subjects": ["Mathematics", "Physics"]
}
```

### Get Teacher by ID
```http
GET /teachers/:teacherId
```
**Access:** Authenticated

### List Teachers
```http
GET /teachers?limit=20
```
**Access:** Authenticated

### Update Teacher
```http
PUT /teachers/:teacherId
```
**Access:** Admin

### Delete Teacher
```http
DELETE /teachers/:teacherId
```
**Access:** Admin

---

## Batches Management

### Create Batch
```http
POST /batches
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "name": "SSC 10th Morning Batch",
  "board": "SSC",
  "standard": 10,
  "subject": "Mathematics",
  "schedule": "Mon-Fri 9AM-11AM"
}
```

### Get Batch by ID
```http
GET /batches/:batchId
```

### List Batches
```http
GET /batches?board=SSC&standard=10
```

### Update Batch
```http
PUT /batches/:batchId
```
**Access:** Teacher/Admin

### Delete Batch
```http
DELETE /batches/:batchId
```
**Access:** Teacher/Admin

### Add Student to Batch
```http
POST /batches/:batchId/students
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "studentId": "student_id"
}
```

### Remove Student from Batch
```http
DELETE /batches/:batchId/students/:studentId
```
**Access:** Teacher/Admin

---

## Subjects & Chapters

### Create Subject
```http
POST /subjects
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "name": "Mathematics",
  "board": "SSC",
  "standard": 10,
  "description": "Advanced Mathematics"
}
```

### Get Subject
```http
GET /subjects/:subjectId
```

### List Subjects
```http
GET /subjects?board=SSC&standard=10
```

### Update Subject
```http
PUT /subjects/:subjectId
```

### Delete Subject
```http
DELETE /subjects/:subjectId
```

### Create Chapter
```http
POST /chapters
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "name": "Quadratic Equations",
  "subjectId": "subject_id",
  "order": 1,
  "description": "Chapter on quadratic equations"
}
```

### Get Chapter
```http
GET /chapters/:chapterId
```

### List Chapters
```http
GET /chapters?subjectId=subject_id
```

### Update Chapter
```http
PUT /chapters/:chapterId
```

### Delete Chapter
```http
DELETE /chapters/:chapterId
```

---

## Syllabus Management

### Get Syllabus
```http
GET /syllabus?board=SSC&standard=10&subject=Math
```
**Required Query Parameters:**
- `board`: SSC, CBSE, ICSE, etc.
- `standard`: 1-12
- `subject`: Subject name

**Response:** Returns chapters in order

### Create Syllabus Item
```http
POST /syllabus
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "board": "SSC",
  "standard": 10,
  "subject": "Mathematics",
  "chapter": "Quadratic Equations",
  "order": 1,
  "topics": ["Introduction", "Solving equations"]
}
```

### Update Syllabus Item
```http
PUT /syllabus/:syllabusId
```

### Delete Syllabus Item
```http
DELETE /syllabus/:syllabusId
```

---

## Homework Management

### Create Homework
```http
POST /homework
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "title": "Solve Quadratic Equations",
  "description": "Complete exercises 1-10",
  "subject": "Mathematics",
  "board": "SSC",
  "standard": 10,
  "dueDate": "2025-12-01",
  "assignedTo": ["student_id1", "student_id2"]
}
```
**Note:** Automatically logged with action "created_homework".

### List Homework
```http
GET /homework?board=SSC&standard=10&subject=Math&status=pending&limit=20
```
**Query Parameters:**
- `board`, `standard`, `subject`: Filters
- `status`: pending, completed, overdue
- `assignedTo`: Student ID
- `limit`: Max 100

### Get Homework by ID
```http
GET /homework/:id
```

### Update Homework
```http
PUT /homework/:id
```
**Access:** Teacher/Admin

### Delete Homework (Soft Delete)
```http
DELETE /homework/:id
```
**Access:** Teacher/Admin  
**Note:** Sets `active: false`, keeps data

### Submit Homework
```http
POST /submissions
```
**Access:** Student  
**Body:**
```json
{
  "homeworkId": "homework_id",
  "studentId": "student_id",
  "submissionText": "Solution...",
  "attachments": ["url1", "url2"]
}
```

### List Submissions
```http
GET /submissions?homeworkId=hw_id&studentId=student_id
```

---

## Tests Management

### Create Test
```http
POST /tests
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "title": "Mid-term Mathematics Test",
  "subject": "Mathematics",
  "board": "SSC",
  "standard": 10,
  "date": "2025-12-15",
  "totalMarks": 100,
  "duration": 120
}
```
**Note:** Automatically logged with action "created_test".

### List Tests
```http
GET /tests?board=SSC&standard=10&subject=Math
```
**Query Parameters:**
- `board`, `standard`, `subject`: Filters
- `active`: true/false (only active tests by default)

### Get Test by ID
```http
GET /tests/:id
```

### Update Test
```http
PUT /tests/:testId
```

### Delete Test (Soft Delete)
```http
DELETE /tests/:testId
```
**Access:** Teacher/Admin  
**Note:** Soft delete with `active: false`. Automatically logged with action "deleted_test".

### Add Test Results
```http
POST /tests/:id/results
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "studentId": "student_id",
  "marksObtained": 85,
  "totalMarks": 100,
  "remarks": "Excellent performance"
}
```

### Get Test Results
```http
GET /tests/:id/results?studentId=student_id
```

### Update Test Result
```http
PUT /tests/:testId/results/:resultId
```

### Delete Test Result
```http
DELETE /tests/:testId/results/:resultId
```

---

## Fee Management

### Create Fee Plan
```http
POST /fee-plans
```
**Access:** Admin only  
**Body:**
```json
{
  "name": "Monthly Tuition - SSC 10th Math",
  "amount": 3000,
  "currency": "INR",
  "frequency": "monthly",
  "board": "SSC",
  "standard": 10,
  "subject": "Mathematics"
}
```
**Response:**
```json
{
  "ok": true,
  "feePlanId": "4OpbpnwBim9GyzbtRz3f"
}
```
**Note:** Automatically logged with action "created", entityType "fee_plan".

**⚠️ Important:** Requires Firestore composite index on `sneha_fee_plans` collection:
- Fields: `active` (Ascending), `createdAt` (Descending)
- [Create index automatically](https://console.firebase.google.com/v1/r/project/flutter-chedo/firestore/indexes?create_composite=ClVwcm9qZWN0cy9mbHV0dGVyLWNoZWRvL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zbmVoYV9mZWVfcGxhbnMvaW5kZXhlcy9fEAEaCgoGYWN0aXZlEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg)

### List Fee Plans
```http
GET /fee-plans?board=SSC&standard=10&subject=Math
```
**Access:** Teacher/Admin  
**Query Parameters:**
- `board` (optional)
- `standard` (optional)
- `subject` (optional)

**Response:**
```json
{
  "ok": true,
  "items": [{
    "id": "plan_id",
    "name": "Monthly Tuition",
    "amount": 3000,
    "currency": "INR",
    "frequency": "monthly",
    "board": "SSC",
    "standard": 10,
    "active": true,
    "createdAt": {...}
  }]
}
```

### Update Fee Plan
```http
PUT /fee-plans/:feePlanId
```
**Access:** Admin

### Delete Fee Plan (Soft Delete)
```http
DELETE /fee-plans/:feePlanId
```
**Access:** Admin

### Assign Fee Plan to Student (Simplified V2)
```http
PUT /students/:studentId/fee-plan
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "amount": 3000,
  "currency": "INR",
  "frequency": "monthly",
  "startMonth": "2025-11",
  "isActive": true
}
```
**Note:** Embeds fee plan directly in student document

### Get Student Fee Plan
```http
GET /students/:studentId/fee-plan
```
**Response:**
```json
{
  "ok": true,
  "studentId": "student_id",
  "feePlan": {
    "amount": 3000,
    "currency": "INR",
    "frequency": "monthly",
    "startMonth": "2025-11",
    "isActive": true,
    "lastUpdated": {...}
  }
}
```

### Record Payment
```http
POST /students/:studentId/fees/payments
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "amount": 3000,
  "method": "cash",
  "note": "November 2025 payment"
}
```
**Payment Methods:** `cash`, `online`, `cheque`, `card`  
**Note:** Automatically logged with action "payment_recorded", entityType "payment".

### Legacy: Assign Fee Record
```http
POST /fees
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "studentId": "student_id",
  "feePlanId": "plan_id"
}
```
**Note:** Creates fee record with balance tracking

### Legacy: Get Fee Records
```http
GET /fees?studentId=student_id&status=active
```

### Legacy: Update Fee Record
```http
PUT /fees/:feeRecordId
```

### Legacy: Delete Fee Record
```http
DELETE /fees/:feeRecordId
```

### Legacy: Record Payment Transaction
```http
POST /fee-transactions
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "feeRecordId": "record_id",
  "amount": 1500,
  "method": "cash",
  "note": "Partial payment"
}
```
**Note:** Updates balance in fee record

### Legacy: Get Transactions
```http
GET /fee-transactions?feeRecordId=record_id
GET /fee-transactions?studentId=student_id
```

### Legacy: Update Transaction
```http
PUT /fee-transactions/:transactionId
```

### Legacy: Delete Transaction
```http
DELETE /fee-transactions/:transactionId
```

---

## Attendance Management

### Create Attendance Session
```http
POST /attendance/sessions
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "batchId": "batch_id",
  "date": "2025-11-22",
  "subject": "Mathematics",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

### Mark Attendance
```http
POST /attendance/mark
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "sessionId": "session_id",
  "studentId": "student_id",
  "status": "present"
}
```
**Status Options:** `present`, `absent`, `late`  
**Note:** Automatically logged with action "marked_attendance".

### List Attendance Sessions
```http
GET /attendance/sessions?batchId=batch_id&date=2025-11-22
```

### Get Student Attendance
```http
GET /attendance/student/:studentId?startDate=2025-11-01&endDate=2025-11-30
```

### Update Attendance Session
```http
PUT /attendance/sessions/:sessionId
```

### Delete Attendance Session
```http
DELETE /attendance/sessions/:sessionId
```

### Update Attendance Mark
```http
PUT /attendance/:attendanceId
```

---

## Schedules & Classes

### Create Schedule
```http
POST /schedules
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "batchId": "batch_id",
  "subject": "Mathematics",
  "dayOfWeek": "Monday",
  "startTime": "09:00",
  "endTime": "11:00",
  "teacherId": "teacher_id"
}
```

### List Schedules
```http
GET /schedules?batchId=batch_id&teacherId=teacher_id
```

### Get Schedule
```http
GET /schedules/:scheduleId
```

### Update Schedule
```http
PUT /schedules/:scheduleId
```

### Delete Schedule
```http
DELETE /schedules/:scheduleId
```

### Create Online Class
```http
POST /online-classes
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "title": "Mathematics Class",
  "batchId": "batch_id",
  "subject": "Mathematics",
  "scheduledAt": "2025-11-25T09:00:00Z",
  "meetingLink": "https://meet.google.com/abc-def-ghi",
  "duration": 120
}
```

### List Online Classes
```http
GET /online-classes?batchId=batch_id&date=2025-11-25
```

### Get Online Class
```http
GET /online-classes/:classId
```

### Update Online Class
```http
PUT /online-classes/:classId
```

### Delete Online Class
```http
DELETE /online-classes/:classId
```

---

## Materials Management

### Upload Material
```http
POST /materials
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "title": "Chapter 1 Notes",
  "subject": "Mathematics",
  "board": "SSC",
  "standard": 10,
  "type": "pdf",
  "url": "https://storage.example.com/file.pdf",
  "description": "Important formulas"
}
```

### List Materials
```http
GET /materials?board=SSC&standard=10&subject=Math&type=pdf
```

### Get Material
```http
GET /materials/:materialId
```

### Update Material
```http
PUT /materials/:materialId
```

### Delete Material
```http
DELETE /materials/:materialId
```

---

## Messages

### Send Message
```http
POST /messages
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "recipientId": "user_id",
  "recipientType": "student",
  "subject": "Test Results",
  "body": "Your test results are available",
  "priority": "normal"
}
```
**Recipient Types:** `student`, `teacher`, `parent`, `batch`  
**Priority:** `low`, `normal`, `high`, `urgent`

### List Messages
```http
GET /messages?recipientId=user_id&status=unread
```

### Get Message
```http
GET /messages/:messageId
```

### Update Message (Mark as Read)
```http
PUT /messages/:messageId
```
**Body:**
```json
{
  "status": "read"
}
```

### Delete Message
```http
DELETE /messages/:messageId
```

---

## Analytics

### Student Overview
```http
GET /analytics/student/:id/overview
```
**Response:** Aggregated stats for student performance

### Teacher Overview
```http
GET /analytics/teacher/:teacherId/overview
```

### Batch Overview
```http
GET /analytics/batch/:batchId/overview
```

### Subject Overview
```http
GET /analytics/subject/:subjectId/overview
```

---

## Activity Logs

**Note:** Activity logging is **automatic** for these actions:
- Student created/updated/deleted
- Homework created
- Test created/deleted
- Attendance marked
- Fee plan created
- Payment recorded

### Create Log (Manual - Not Recommended)
```http
POST /logs
```
**Access:** Teacher/Admin  
**Body:**
```json
{
  "action": "custom_action",
  "entityType": "student",
  "entityId": "student_id",
  "entityName": "Student Name",
  "details": {"custom": "data"}
}
```
**Note:** Most logging is automatic. Use this only for custom events not covered by automatic logging.

### List Logs
```http
GET /logs?userId=user_id&entityType=student&action=created&limit=50
```
**Query Parameters:**
- `userId`: Filter by user who performed action
- `entityType`: student, homework, test, payment, fee_plan, attendance, etc.
- `entityId`: Specific entity ID
- `action`: created, updated, deleted, marked_attendance, payment_recorded, created_student, etc.
- `startDate`, `endDate`: Date range (YYYY-MM-DD)
- `limit`: Max 200, default 50

**Response:**
```json
{
  "ok": true,
  "items": [{
    "id": "log_id",
    "userId": "user_uid",
    "userName": "John Doe",
    "action": "created_student",
    "entityType": "student",
    "entityId": "student_123",
    "entityName": "Student Name",
    "details": {...},
    "timestamp": {...}
  }]
}
```

### Get Recent Logs
```http
GET /logs/recent?limit=20
```
**Returns:** Most recent logs across all entities (last 7 days by default)

### Get Log Statistics
```http
GET /logs/stats?startDate=2025-11-01&endDate=2025-11-30
```
**Returns:** Aggregated counts by action type

**Response:**
```json
{
  "ok": true,
  "stats": {
    "created_student": 15,
    "updated_student": 8,
    "created_homework": 12,
    "marked_attendance": 150,
    "payment_recorded": 45
  }
}
```

---

## Settings

### Get Settings
```http
GET /settings
```
**Returns:** System-wide settings

### Update Settings
```http
PUT /settings
```
**Access:** Admin  
**Body:**
```json
{
  "institutionName": "Sneha Institute",
  "academicYear": "2025-2026",
  "currency": "INR",
  "timezone": "Asia/Kolkata"
}
```

---

## Notifications

### List Notifications
```http
GET /notifications?userId=user_id&status=unread
```

### Mark Notification as Read
```http
PUT /notifications/:notificationId
```

### Delete Notification
```http
DELETE /notifications/:notificationId
```

---

## File Management

### Upload File
```http
POST /upload
```
**Access:** Teacher/Admin  
**Body:** Multipart form data with file

### Get File
```http
GET /files/:fileId
```

### Delete File
```http
DELETE /files/:fileId
```

---

## Reports

### Generate Student Report
```http
POST /reports/student/:studentId
```
**Access:** Teacher/Admin

### Generate Batch Report
```http
POST /reports/batch/:batchId
```

### Generate Fee Report
```http
POST /reports/fees
```
**Body:**
```json
{
  "startDate": "2025-11-01",
  "endDate": "2025-11-30"
}
```

---

## User Management

### Get User Profile
```http
GET /users/:userId
```

### Update User Profile
```http
PUT /users/:userId
```
**Body:**
```json
{
  "name": "Updated Name",
  "phone": "9876543210"
}
```

### Change Password
```http
POST /users/change-password
```
**Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

### Forgot Password
```http
POST /users/forgot-password
```
**Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
```http
POST /users/reset-password
```
**Body:**
```json
{
  "token": "reset_token",
  "newPassword": "NewPass456"
}
```

---

## Student Password Management (Admin/Teacher View)

### Get Student's Current Password
```http
GET /students/:studentId/password
```
**Access:** Admin, Teacher  
**Response:**
```json
{
  "ok": true,
  "password": "student_password",
  "message": "Student password retrieved"
}
```
**Note:** Returns the plain-text password for display in the admin's StudentDetail page.

### Change Student's Password
```http
POST /students/:studentId/change-password
```
**Access:** Admin, Teacher  
**Body:**
```json
{
  "newPassword": "NewPassword123"
}
```
**Response:**
```json
{
  "ok": true,
  "message": "Student password changed successfully"
}
```
**Validations:**
- `newPassword` must be at least 8 characters long
- Password is hashed using bcrypt for secure storage
- Action is logged with timestamp

---

## Common Patterns

### Error Response Format
```json
{
  "ok": false,
  "error": "Error message here"
}
```

### Success Response Format
```json
{
  "ok": true,
  "data": {...}
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized (missing/invalid session)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Role-Based Access
- **Public**: `/health`, `/register`, `/login`
- **Student**: Can view own data, submit homework
- **Teacher**: Can manage students, homework, tests, attendance
- **Admin**: Full access including user management, settings, fee plan creation

### Automatic Activity Logging Actions
The following endpoints automatically create activity log entries:
- `POST /teachers/:teacherId/students` → action: "created_student"
- `PUT /students/:studentId` → action: "updated_student"
- `DELETE /students/:studentId` → action: "deleted_student"
- `POST /homework` → action: "created_homework"
- `POST /tests` → action: "created_test"
- `DELETE /tests/:testId` → action: "deleted_test"
- `POST /attendance/mark` → action: "marked_attendance"
- `POST /fee-plans` → action: "created", entityType: "fee_plan"
- `POST /students/:studentId/fees/payments` → action: "payment_recorded", entityType: "payment"

---

## Example Usage with cURL

```bash
# Login
curl -X POST \
  https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sneha.navgire05@gmail.com",
    "password": "051093@Sneha"
  }'

# Create Fee Plan (use sessionId from login - Admin only)
curl -X POST \
  https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1/fee-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 52c9bded-a9d6-4d6d-883d-b5acc2cc75bc" \
  -d '{
    "name": "Monthly Tuition",
    "amount": 3000,
    "currency": "INR",
    "frequency": "monthly",
    "board": "SSC",
    "standard": 10
  }'

# List Students
curl -X GET \
  "https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1/students?limit=10" \
  -H "Authorization: Bearer 52c9bded-a9d6-4d6d-883d-b5acc2cc75bc"

# Record Payment
curl -X POST \
  https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1/students/STUDENT_ID/fees/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 52c9bded-a9d6-4d6d-883d-b5acc2cc75bc" \
  -d '{
    "amount": 3000,
    "method": "cash",
    "note": "November 2025 payment"
  }'

# Get Activity Logs
curl -X GET \
  "https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1/logs?limit=20" \
  -H "Authorization: Bearer 52c9bded-a9d6-4d6d-883d-b5acc2cc75bc"
```

---

## Data Collections

### Firestore Collections
- `sneha_users` - User accounts (students, teachers, admin)
- `sneha_students` - Student profiles
- `sneha_teachers` - Teacher profiles (subset of users)
- `sneha_batches` - Batch/class groups
- `sneha_subjects` - Subject definitions
- `sneha_chapters` - Chapter definitions
- `sneha_syllabus` - Syllabus items
- `sneha_homework` - Homework assignments
- `sneha_submissions` - Homework submissions
- `sneha_tests` - Test definitions
- `sneha_test_results` - Test results
- `sneha_fee_plans` - Fee plan templates
- `sneha_fee_records` - Fee records (legacy)
- `sneha_fee_txn` - Fee transactions (legacy)
- `sneha_payments` - Payment records (V2)
- `sneha_att_sessions` - Attendance sessions
- `sneha_att_marks` - Attendance marks
- `sneha_schedules` - Class schedules
- `sneha_online_classes` - Online class sessions
- `sneha_materials` - Study materials
- `sneha_messages` - Messages
- `sneha_logs` - Activity logs (automatic logging)
- `sneha_settings` - System settings
- `sneha_notifications` - User notifications
- `sneha_files` - File metadata

### Subcollections
- `sneha_students/{studentId}/fee_payments` - Per-student payments (V2 - currently using top-level collection)

---

## Important Notes

1. **Session Management**: Sessions expire after 30 days of inactivity
2. **Soft Deletes**: Most DELETE operations set `active: false` rather than removing data
3. **Timestamps**: All timestamps use Firestore server timestamp
4. **Validation**: API performs server-side validation on all inputs
5. **Pagination**: Use `limit` parameter for paginated responses (max usually 100)
6. **Filtering**: Most list endpoints support query parameters for filtering
7. **Activity Logging**: Many operations are automatically logged - **no manual logging needed from frontend**
8. **Fee Systems**: Two systems available (Legacy and V2) - V2 recommended for new implementations
9. **Authentication**: All protected endpoints require `Authorization: Bearer <sessionId>` header
10. **Admin-Only Endpoints**: Fee plan creation (`POST /fee-plans`) requires admin role
11. **Firestore Indexes**: Some queries require composite indexes - links provided in relevant sections

---

## Changelog

### Version 2.0.0 (November 22, 2025)
- ✅ Fixed: Authorization header now requires `Bearer` prefix
- ✅ Updated: Correct base URL documented
- ✅ Enhanced: Fee plan creation now admin-only with automatic activity logging
- ✅ Added: Comprehensive activity logging system with automatic integration
- ✅ Added: Firestore index requirements for fee plans listing
- ✅ Improved: Documentation for all automatic logging points
- ✅ Added: Detailed cURL examples with working session IDs
- ✅ Enhanced: Error responses and status code documentation

### Version 1.1.0 (November 2025)
- Added activity logging system
- Integrated automatic logging for major operations
- Added soft delete for tests with active flag filtering

### Version 1.0.0 (Initial Release)
- Core CRUD operations for all entities
- Authentication with session tokens
- Role-based access control
- Basic fee management system

---

**End of Documentation**

For support or questions, please contact the development team.
