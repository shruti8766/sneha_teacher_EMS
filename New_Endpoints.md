# List of Required Backend Endpoints

## CRITICAL ISSUES

### Homework Assignment Issue
**Problem**: POST /homework endpoint ignores the `assignTo` field
- When frontend sends specific student IDs in `assignTo` array, the backend is assigning homework to ALL students in the selected board/standard instead
- This defeats the purpose of the "Specific Student" assignment mode
- **Fix Needed**: Backend must check the `assignTo` array and only create assignments for those specific students, NOT auto-assign to all matching board/standard

### Teachers Deletion Issue
- DELETE /teachers/:id returns success but doesn't persist deletion
- Teacher reappears after page refresh

### Test Result API Issue ⚠️ CRITICAL
**Problem**: POST /tests/:id/results endpoint has Firestore error
- Error: `Cannot use "undefined" as a Firestore value (found in field "maxMarks")`
- **Root Cause**: Backend code is adding `maxMarks` field to the Firestore document, but it's undefined
- **Frontend sends**: { studentId, testId, testTitle, subject, marksObtained, totalMarks, remarks? }
- **Backend does**: Receives payload, then tries to add maxMarks: undefined before saving
- **Fix Needed**: 
  1. Backend should NOT manually add maxMarks field, OR
  2. Backend should check if test exists and use test.totalMarks instead of undefined maxMarks, OR
  3. Enable `ignoreUndefinedProperties` in Firestore settings AND remove maxMarks from being added
  4. Alternative: Frontend can send maxMarks: null or omit it entirely (already doing this)

## Students
- PUT /students/:id - Update student details (including schoolName, parentName, parentPhone, parentEmail, parentProfession, parentCompanyName, parentDesignation)

## Teachers
- DELETE /teachers/:id - Currently returns success but doesn't persist deletion (BACKEND BUG)

## Daily Targets
- POST /students/:studentId/daily-targets
- GET /students/:studentId/daily-targets?date=YYYY-MM-DD
- PUT /students/:studentId/daily-targets/:targetId
- DELETE /students/:studentId/daily-targets/:targetId

______________________________________________________________________
## Homework Collection/Table


 Each homework document should have:

{
  // Basic Info
  id: string;                    // Unique homework ID
  title: string;                 // e.g., "Chapter 1 Exercise"
  subject: string;               // e.g., "Maths"
  instructions: string;          // Detailed instructions/description
  dueAt: Date;                   // Due date/time ISO string
  createdAt: Date;               // When homework was created
  createdBy: string;             // Teacher/Admin user ID who created it
  
  // Assignment Info
  assignTo: string[];            // Array of specific student IDs to assign to
  board: string;                 // Optional: Board (for batch assignment reference)
  standard: string;              // Optional: Standard (for batch assignment reference)
  
  // Metadata
  status: string;                // "assigned" | "submitted" | "graded" | "archived"
  attachments: any[];            // Array of attachment objects if needed
  
  // Tracking
  updatedAt: Date;               // Last update timestamp
  updatedBy?: string;            // User who last updated
}
____________________________________________________________________
## HomeworkSubmission Collection (Separate Table)
To track student submissions:


{
  id: string;                    // Unique submission ID
  homeworkId: string;            // FK to Homework
  studentId: string;             // FK to Student
  
  // Submission Info
  submittedAt?: Date;            // When student submitted
  status: string;                // "pending" | "submitted" | "graded"
  submissionText?: string;       // Student's answer/response
  attachments?: any[];           // Student submitted files
  
  // Grading Info
  marksObtained?: number;        // Grade awarded
  totalMarks?: number;           // Total possible marks
  remarks?: string;              // Teacher feedback
  gradedAt?: Date;               // When graded
  gradedBy?: string;             // Teacher who graded
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
___________________________________________________________________________
## Homework

- POST /homework - Create/assign homework (ISSUE: Currently ignores `assignTo` field and assigns to all students in board/standard instead of specific students selected)
  - Expected payload: { title, subject, instructions, assignTo: [studentIds], dueAt, attachments }
  - Issue: Backend should respect the `assignTo` array and only assign to those specific students, not auto-assign to all matching board/standard

1. POST /homework
   - Create homework
   - MUST: Respect assignTo array - only assign to those specific students
   - Should NOT auto-assign based on board/standard unless assignTo is empty

2. PUT /homework/:id
   - Update homework details
   - Can update assignTo to change which students it's assigned to
   - May need to create/delete submission records if assignTo changes

3. DELETE /homework/:id
   - Delete homework and all related submissions

4. GET /homework?limit=100
   - List all homework (for admin/teacher view)
   - Can filter by assignedTo={studentId} to show homework for specific student

5. GET /homework?assignedTo={studentId}&limit=100
   - Get homework assigned to a specific student

6. POST /homework/:id/submit
   - Student submits homework (creates/updates HomeworkSubmission)

7. PUT /homework/:id/submit/:studentId
   - Update student's submission

8. PUT /homework/:id/grade/:studentId
   - Teacher grades a student's submission

9. GET /homework/:id/submissions
   - Get all student submissions for a homework

## Tests & Performance
- POST /tests/:id/results - Add test result for a student ⚠️ BROKEN
  - Incoming payload: { studentId, testId, testTitle, subject, marksObtained, totalMarks, remarks? }
  - Error: Backend adds maxMarks: undefined to document before saving
  - Payloads that have failed:
    - { studentId: '2DTD8A0bI5qDo992UOcO', testId: 'Lh4Ku6dXoH9hIuumRc2Z', testTitle: 'Maths Chapter 1', subject: 'Maths', marksObtained: 24, totalMarks: 50 }
  - **Backend Fix Required**:
    - Option 1: Remove the line that adds `maxMarks` field
    - Option 2: Use test.totalMarks instead of maxMarks when creating result
    - Option 3: Enable `ignoreUndefinedProperties` in Firestore initialization
- GET /tests/:testId
- GET /tests?board={board}&standard={standard}&upcoming=true
- GET /students/:studentId/test-results
- GET /tests/:testId/results?studentId={id}
- DELETE /tests/:id

## Suggestions & Analytics
- GET /students/:studentId/suggestions
- GET /suggestions/study-weak-areas
- GET /suggestions/performance-analysis