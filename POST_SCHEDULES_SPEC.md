# POST /schedules Endpoint Specification

**Status:** ❌ NOT DEPLOYED (404)  
**Priority:** HIGH  
**Last Updated:** December 18, 2025

---

## Endpoint Details

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Endpoint** | `/api/v1/schedules` |
| **Base URL** | `https://sneha-pugqtr4ooq-uc.a.run.app` |
| **Full URL** | `https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules` |
| **Access Level** | Teacher / Admin |
| **Authentication** | Bearer Token (sessionId) |
| **Response Format** | JSON |

---

## Request Headers

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <sessionId>"
}
```

---

## Request Body

```json
{
  "batchId": "string (required)",
  "teacherId": "string (required)",
  "subject": "string (required)",
  "dayOfWeek": "string (required)",
  "startTime": "string (required, HH:mm format)",
  "endTime": "string (required, HH:mm format)",
  "room": "string (required)",
  "recurring": "boolean (optional, default: true)"
}
```

### Field Descriptions

| Field | Type | Required | Validation | Example |
|-------|------|----------|-----------|---------|
| **batchId** | String | ✅ Yes | Must exist in batches collection | `"sLzmSNTuu1E7xGtMABy2"` |
| **teacherId** | String | ✅ Yes | Must exist in users collection | `"Kb68xEL42bM1N9TbqfHo"` |
| **subject** | String | ✅ Yes | Non-empty string | `"Mathematics"` |
| **dayOfWeek** | String | ✅ Yes | One of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday | `"Monday"` |
| **startTime** | String | ✅ Yes | 24-hour HH:mm format, must be < endTime | `"09:00"` |
| **endTime** | String | ✅ Yes | 24-hour HH:mm format, must be > startTime | `"10:30"` |
| **room** | String | ✅ Yes | Non-empty string | `"Room A1"` |
| **recurring** | Boolean | ❌ No | true/false | `true` |

---

## Validation Rules

✅ **Required Fields:**
- batchId cannot be empty
- teacherId cannot be empty
- subject cannot be empty
- dayOfWeek must be valid
- startTime must be in HH:mm format
- endTime must be in HH:mm format
- room cannot be empty

✅ **Time Validation:**
- startTime < endTime (start time must be before end time)
- Both times must be in 24-hour format (00:00 - 23:59)
- No overlap with existing schedules for same teacher

✅ **Data Validation:**
- batchId must exist in sneha_batches collection
- teacherId must exist in sneha_users collection
- dayOfWeek case-insensitive or exact match

---

## Success Response (201 Created)

```json
{
  "ok": true,
  "scheduleId": "unique_schedule_id",
  "message": "Schedule created successfully"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| **ok** | Boolean | true if successful |
| **scheduleId** | String | Unique ID of created schedule |
| **message** | String | Success message |

---

## Error Responses

### 400 Bad Request - Missing Required Field
```json
{
  "ok": false,
  "error": "batchId is required"
}
```

### 400 Bad Request - Invalid Time Format
```json
{
  "ok": false,
  "error": "startTime must be in HH:mm format"
}
```

### 400 Bad Request - Time Logic Error
```json
{
  "ok": false,
  "error": "startTime must be before endTime"
}
```

### 400 Bad Request - Invalid Day
```json
{
  "ok": false,
  "error": "dayOfWeek must be Monday-Sunday"
}
```

### 404 Not Found - Batch Not Found
```json
{
  "ok": false,
  "error": "Batch not found"
}
```

### 404 Not Found - Teacher Not Found
```json
{
  "ok": false,
  "error": "Teacher not found"
}
```

### 403 Forbidden - Insufficient Access
```json
{
  "ok": false,
  "error": "Only teachers and admins can create schedules"
}
```

### 401 Unauthorized - Missing Authentication
```json
{
  "ok": false,
  "error": "Unauthorized: Invalid session"
}
```

---

## Test Command (PowerShell)

### Step 1: Login and Get Session
```powershell
$loginResponse = Invoke-WebRequest -Uri "https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"shrutigaikwad8766@gmail.com","password":"shruti8766"}' `
  -UseBasicParsing

$loginData = $loginResponse.Content | ConvertFrom-Json
$sessionId = $loginData.sessionId
Write-Host "Session ID: $sessionId"
```

### Step 2: Create Schedule
```powershell
$headers = @{
  "Authorization" = "Bearer $sessionId"
  "Content-Type" = "application/json"
}

$body = @{
  "batchId" = "sLzmSNTuu1E7xGtMABy2"
  "teacherId" = "Kb68xEL42bM1N9TbqfHo"
  "subject" = "Mathematics"
  "dayOfWeek" = "Monday"
  "startTime" = "09:00"
  "endTime" = "10:30"
  "room" = "Room A1"
  "recurring" = $true
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -UseBasicParsing

Write-Host "Status: $($response.StatusCode)"
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

---

## Database Schema

The endpoint should create a document in the `sneha_schedules` collection with this structure:

```javascript
{
  "id": "unique_schedule_id",                    // Auto-generated
  "batchId": "sLzmSNTuu1E7xGtMABy2",
  "batchName": "SSC 10th Morning",              // From batch lookup
  "teacherId": "Kb68xEL42bM1N9TbqfHo",
  "teacherName": "John Doe",                    // From teacher lookup
  "subject": "Mathematics",
  "dayOfWeek": "Monday",
  "startTime": "09:00",
  "endTime": "10:30",
  "room": "Room A1",
  "recurring": true,
  "active": true,
  "createdAt": "2025-12-18T10:00:00Z",         // Server timestamp
  "createdBy": "uid_of_logged_in_user",
  "updatedAt": "2025-12-18T10:00:00Z",
  "updatedBy": "uid_of_logged_in_user"
}
```

---

## Additional Notes

### Related Endpoints
- `GET /schedules` - List all schedules
- `GET /schedules/timetable` - Get weekly timetable
- `PUT /schedules/:scheduleId` - Update schedule
- `DELETE /schedules/:scheduleId` - Delete schedule
- `GET /schedules/teacher-availability` - Check availability

### Frontend Integration
This endpoint is used by the Timetable component when creating new schedules. The Timetable.tsx component already has the UI ready to call this endpoint.

### Logging
Should create a log entry in `sneha_logs` collection:
```javascript
{
  "userId": "user_uid",
  "action": "created_schedule",
  "entityType": "schedule",
  "entityId": "schedule_id",
  "entityName": "Mathematics - Monday 09:00",
  "timestamp": "server_timestamp",
  "details": {
    "batchId": "...",
    "teacherId": "...",
    "subject": "...",
    "dayOfWeek": "...",
    "room": "..."
  }
}
```

---

## Implementation Checklist

- [ ] Create `sneha_schedules` collection if not exists
- [ ] Validate all required fields
- [ ] Validate batchId exists
- [ ] Validate teacherId exists
- [ ] Validate dayOfWeek is valid
- [ ] Validate time format (HH:mm)
- [ ] Validate startTime < endTime
- [ ] Check teacher availability (no conflicts)
- [ ] Insert document into sneha_schedules
- [ ] Create audit log entry
- [ ] Return 201 with scheduleId
- [ ] Handle all error cases with proper status codes

---

## Status: ❌ NEEDS IMPLEMENTATION

This endpoint is critical for the timetable system. Priority: HIGH
