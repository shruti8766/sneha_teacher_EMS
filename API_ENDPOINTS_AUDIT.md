# API Endpoints Audit Report

**Date:** November 25, 2025  
**Base URL:** `https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1`

---

## Summary

This document tracks all API endpoints referenced in the frontend application and identifies which are implemented in the backend.

---

## Backend Implementation Status

### ✅ IMPLEMENTED ENDPOINTS

#### Authentication
- **POST** `/register` - Register new user
  - Frontend: Not directly called (used in authentication flow)
  - Backend: ✅ Implemented (line 115-145)
  
- **POST** `/login` - User login
  - Frontend: Not directly called (used in authentication flow)
  - Backend: ✅ Implemented (line 147-177)

#### Health Check
- **GET** `/health` - Health check endpoint
  - Frontend: Not actively used in UI
  - Backend: ✅ Implemented (line 110)

#### Students
- **POST** `/teachers/:teacherId/students` - Create student
  - Frontend: ✅ Called in `Students.tsx` (line 75)
  - Backend: ✅ Implemented (line 330-353)

- **GET** `/students` - List all students (with filters)
  - Frontend: ✅ Called in multiple pages (`StudentDetail.tsx`, `Fees.tsx`, `Dashboard.tsx`)
  - Backend: ✅ Implemented (line 355-365)

- **DELETE** `/students/:id` - Delete/deactivate student
  - Frontend: ✅ Called in `Students.tsx` (line 55)
  - Backend: ✅ Implemented (line 367-376)

#### Teachers
- **GET** `/teachers` - List all teachers
  - Frontend: Not directly called from pages
  - Backend: ✅ Implemented (line 378-391)

- **POST** `/teachers` - Create teacher (Admin only)
  - Frontend: ✅ Called in `Teachers.tsx` (line 51)
  - Backend: ✅ Implemented (line 393-410)

#### Batches
- **POST** `/batches` - Create batch
  - Frontend: ✅ Called in `Batches.tsx` (line 54)
  - Backend: ✅ Implemented (line 412-423)

- **GET** `/batches` - List all batches
  - Frontend: ✅ Called in `Dashboard.tsx`
  - Backend: ✅ Implemented (line 425-433)

#### Homework
- **POST** `/homework` - Create/assign homework
  - Frontend: ✅ Called in `Homework.tsx` (line 82)
  - Backend: ✅ Implemented (line 435-450)

- **GET** `/homework` - List all homework
  - Frontend: ✅ Called in `Homework.tsx`, `StudentDetail.tsx` (line 115)
  - Backend: ✅ Implemented (line 452-461)

#### Attendance
- **POST** `/attendance/sessions` - Create attendance session
  - Frontend: ✅ Called in `Attendance.tsx` (line 60)
  - Backend: ✅ Implemented (line 463-472)

- **GET** `/attendance/sessions` - List attendance sessions
  - Frontend: Called in `Attendance.tsx`
  - Backend: ✅ Implemented (line 474-482)

- **POST** `/attendance/mark` - Mark attendance for student
  - Frontend: ✅ Called in `Attendance.tsx` (line 96)
  - Backend: ✅ Implemented (line 484-494)

#### Tests
- **POST** `/tests` - Create test
  - Frontend: ✅ Called in `Tests.tsx` (line 57)
  - Backend: ✅ Implemented (line 496-507)

- **GET** `/tests` - List all tests
  - Frontend: ✅ Called in `Tests.tsx`, `StudentDetail.tsx`, `Dashboard.tsx`
  - Backend: ✅ Implemented (line 509-517)

#### Fee Management
- **POST** `/fee-plans` - Create fee plan
  - Frontend: ✅ Called in `Fees.tsx` (line 125)
  - Backend: ✅ Implemented (line 179-201)

- **GET** `/fee-plans` - List all fee plans
  - Frontend: ✅ Called in `Fees.tsx`
  - Backend: ✅ Implemented (line 203-225)

- **PUT** `/students/:studentId/fee-plan` - Set student fee plan
  - Frontend: ✅ Called in `Fees.tsx` (line 171)
  - Backend: ✅ Implemented (line 227-246)

- **POST** `/students/:studentId/fees/payments` - Record payment
  - Frontend: ✅ Called in `Fees.tsx` (line 142)
  - Backend: ✅ Implemented (line 248-299)

- **GET** `/fees/summary` - Get fee summary for dashboard
  - Frontend: ✅ Called in `Fees.tsx`, `StudentDetail.tsx` (line 97)
  - Backend: ✅ Implemented (line 301-328)

- **GET** `/students/:studentId/fees/payments` - List payments for student
  - Frontend: Called in `StudentDetail.tsx` (implied)
  - Backend: ✅ Implemented (line 330-340)

#### Activity Logs
- **GET** `/logs/recent` - Get recent activity logs
  - Frontend: ✅ Called in `Dashboard.tsx`
  - Backend: ✅ Implemented (line 519-527)

---

## ❌ MISSING ENDPOINTS

These endpoints are referenced in the frontend but **NOT** implemented in the backend:

### Test Results
- **POST** `/tests/:testId/results` - Submit/record test result for student
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 250)
  - Backend: ❌ **NOT IMPLEMENTED**
  - Description: Students/teachers submit test results with marks

- **GET** `/tests/:testId/results` - Get test results for a test
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 131)
  - Backend: ❌ **NOT IMPLEMENTED**
  - Description: Fetch all results for a specific test

### DELETE Operations (Missing)
- **DELETE** `/homework/:id` - Delete homework
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 201)
  - Backend: ❌ **NOT IMPLEMENTED**
  - Description: Delete/deactivate homework entry

- **DELETE** `/tests/:id` - Delete test
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 291)
  - Backend: ❌ **NOT IMPLEMENTED**
  - Description: Delete/deactivate test entry

### PUT Operations (Edit/Update - Missing)
- **PUT** `/homework/:id` - Update homework
  - Frontend: ✅ Handler exists in `StudentDetail.tsx` (line 186) but currently disabled with "Edit functionality not available yet"
  - Backend: ❌ **NOT IMPLEMENTED**
  - Description: Update homework title, subject, dueDate, description, and assignedTo list
  - Frontend Status: UI prepared but endpoint validation pending

### Homework Filtering
- **GET** `/homework?assignedTo={studentId}` - Get homework assigned to specific student
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 115)
  - Backend: ✅ Partially Supported (basic `/homework` exists but filtering by `assignedTo` not tested)
  - Issue: Backend endpoint doesn't implement the `assignedTo` query parameter

### Student Fee Plan (Specific Endpoint)
- **GET** `/students/:id/fee-plan` - Get student's fee plan
  - Frontend: ✅ Called in `StudentDetail.tsx` (line 88)
  - Backend: ❌ **NOT IMPLEMENTED**
  - Workaround: Frontend uses fallback to `/fees/summary` endpoint

---

## Summary Table

| Endpoint Category | Total Endpoints | Implemented | Missing |
|-------------------|-----------------|-------------|---------|
| Authentication    | 2               | 2           | 0       |
| Students          | 3               | 3           | 0       |
| Teachers          | 2               | 2           | 0       |
| Batches           | 2               | 2           | 0       |
| Homework          | 4*              | 1*          | 3*      |
| Attendance        | 3               | 3           | 0       |
| Tests             | 3*              | 2*          | 1*      |
| Test Results      | 2               | 0           | 2       |
| Fee Management    | 6               | 6           | 0       |
| Logs              | 1               | 1           | 0       |
| **TOTAL**         | **28**          | **22**      | **6**   |

\* Changes: Added DELETE endpoints for homework and tests; Added PUT endpoint for homework update

---

## Implementation Priority

### 🔴 Critical (Missing Core Functionality)
1. **POST** `/tests/:testId/results` - Record test results
2. **GET** `/tests/:testId/results` - Retrieve test results
3. **DELETE** `/homework/:id` - Delete homework (Frontend expects this)
4. **DELETE** `/tests/:id` - Delete tests (Frontend expects this)
5. **PUT** `/homework/:id` - Update homework (Frontend UI prepared, handler exists)

### 🟡 Medium (Partial Implementation)
6. **GET** `/homework?assignedTo={studentId}` - Filter homework by student

### 🟢 Low (Optional/Workarounds Exist)
- GET `/students/:id/fee-plan` (Frontend has fallback to `/fees/summary`)

---

## Detailed API Endpoint Reference

### Test Results Endpoints (MISSING)

#### POST /tests/:testId/results
**Purpose:** Record/submit test result for a student  
**Method:** POST  
**Authentication:** Required (Bearer token)  
**Path Parameters:**
- `testId` (string): The test ID

**Request Body:**
```json
{
  "studentId": "string",
  "marks": "number",
  "totalMarks": "number",
  "remarks": "string (optional)",
  "sectionWise": "object (optional)"
}
```

**Expected Response:**
```json
{
  "ok": true,
  "testResultId": "string"
}
```

**Frontend Usage:** `StudentDetail.tsx` line 250-264

---

#### GET /tests/:testId/results
**Purpose:** Get all test results for a specific test  
**Method:** GET  
**Authentication:** Required (Bearer token)  
**Path Parameters:**
- `testId` (string): The test ID

**Query Parameters:**
- `studentId` (string, optional): Filter by specific student

**Expected Response:**
```json
{
  "ok": true,
  "items": [
    {
      "id": "string",
      "testId": "string",
      "studentId": "string",
      "marks": "number",
      "totalMarks": "number",
      "remarks": "string",
      "sectionWise": "object"
    }
  ]
}
```

**Frontend Usage:** `StudentDetail.tsx` line 131

---

---

#### DELETE /homework/:id
**Purpose:** Delete/deactivate homework entry  
**Method:** DELETE  
**Authentication:** Required (Bearer token)  
**Path Parameters:**
- `id` (string): The homework ID

**Expected Response:**
```json
{
  "ok": true,
  "message": "Deleted"
}
```

**Frontend Usage:** `StudentDetail.tsx` line 201

---

#### DELETE /tests/:id
**Purpose:** Delete/deactivate test entry  
**Method:** DELETE  
**Authentication:** Required (Bearer token)  
**Path Parameters:**
- `id` (string): The test ID

**Expected Response:**
```json
{
  "ok": true,
  "message": "Deleted"
}
```

**Frontend Usage:** `StudentDetail.tsx` line 291

---

#### PUT /homework/:id
**Purpose:** Update homework entry  
**Method:** PUT  
**Authentication:** Required (Bearer token)  
**Path Parameters:**
- `id` (string): The homework ID

**Request Body:**
```json
{
  "title": "string",
  "subject": "string",
  "instructions": "string",
  "dueAt": "ISO 8601 datetime string",
  "assignTo": ["studentId1", "studentId2"],
  "attachments": []
}
```

**Expected Response:**
```json
{
  "ok": true,
  "homeworkId": "string",
  "message": "Homework updated"
}
```

**Frontend Usage:** `StudentDetail.tsx` line 186 (currently disabled)

---

## Recommendations

1. **Implement Missing Test Results Endpoints** - These are actively used by the frontend for core functionality
2. **Implement DELETE Endpoints** - Critical for homework and test management:
   - `DELETE /homework/:id`
   - `DELETE /tests/:id`
3. **Implement PUT Endpoint for Homework** - Frontend UI is prepared and ready:
   - `PUT /homework/:id`
4. **Add Homework Filtering** - Implement `assignedTo` query parameter in GET `/homework`
5. **Consider Adding Student Fee Plan Endpoint** - While there's a workaround, a direct endpoint would improve API design
6. **Add Query Parameter Support** - Implement filtering/search parameters where needed:
   - Tests: filter by board, standard, dateTime range
   - Homework: filter by studentId, board, standard
   - Students: already has board/standard filtering

---

## Notes

- All endpoints require authentication via Bearer token (except `/register`, `/login`, `/health`)
- Base URL: `https://us-central1-flutter-chedo.cloudfunctions.net/sneha/api/v1`
- Timestamps are returned in Firebase Firestore format
- All list endpoints return paginated results with a limit parameter (max 100)
