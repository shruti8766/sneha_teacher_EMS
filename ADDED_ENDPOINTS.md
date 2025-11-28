# List of Required Backend Endpoints

## Students
- GET /students/:id - Get student details
- PUT /students/:id - Update student details (including schoolName, parentName, parentPhone)
- DELETE /students/:id - Delete student

## Teachers
- DELETE /teachers/:id - Delete teacher (currently not persisting)

## Batches
- DELETE /batches/:id - Delete batch

## Fees & Payments
- POST /students/:studentId/fees/payments - Record payment
- PUT /students/:studentId/fee-plan - Assign fee plan to student
- GET /students/:studentId/fee-plan - Get fee plan for student
- GET /fees/summary?period={YYYY-MM} - Get fee summary for period

## Attendance
- POST /attendance/sessions - Create attendance session
- GET /attendance/sessions - Get attendance sessions
- POST /attendance/marks - Record attendance mark
- GET /attendance/marks?sessionId={sessionId} - Get marks for session

## Notes
- Students fields that need to be supported: schoolName, parentName, parentPhone
- DELETE /teachers/:id - Currently returns success but doesn't persist deletion (BACKEND BUG)

