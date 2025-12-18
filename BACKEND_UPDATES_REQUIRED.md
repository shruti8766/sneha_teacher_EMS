# Backend Updates Required for Schedule Management

**Date:** December 18, 2025  
**Status:** CRITICAL - Frontend blocking issues  
**Priority:** HIGH  

---

## Summary

Two schedule endpoints require critical fixes:
1. **GET /schedules/timetable** - Missing required fields in response
2. **PUT /schedules/:scheduleId** - Not persisting data to Firestore

---

## Issue 1: GET /schedules/timetable - Missing IDs in Response

### Current Behavior ❌
The endpoint returns schedules with **names only**, missing the ID fields:

```json
{
  "ok": true,
  "week": "2025-W51",
  "schedules": {
    "Monday": [
      {
        "id": "DXuB9EnutnTjPhFpD5qo",
        "batchName": "Class 10-Maths",
        "subject": "Math",
        "teacherName": "Mock Teacher 2",
        "startTime": "09:00",
        "endTime": "10:30",
        "room": "A1"
        // MISSING: batchId, teacherId
      }
    ]
  }
}
```

### Problem
- Frontend form dropdowns can't pre-select values without IDs
- Edit form shows empty dropdowns even when batch/teacher should be pre-selected
- Users must re-select batch and teacher every time they edit

### Required Fix
The response MUST include `batchId` and `teacherId`:

```json
{
  "ok": true,
  "week": "2025-W51",
  "schedules": {
    "Monday": [
      {
        "id": "DXuB9EnutnTjPhFpD5qo",
        "batchId": "sLzmSNTuu1E7xGtMABy2",           // ← ADD THIS
        "batchName": "Class 10-Maths",
        "teacherId": "RYBT5OVAGkujeNKvqhjf",        // ← ADD THIS
        "teacherName": "Mock Teacher 2",
        "subject": "Math",
        "dayOfWeek": "Monday",
        "startTime": "09:00",
        "endTime": "10:30",
        "room": "A1",
        "recurring": true,
        "createdAt": "2025-12-18T10:30:00Z",
        "updatedAt": "2025-12-18T10:30:00Z"
      }
    ]
  }
}
```

### Implementation Steps

**In your Express backend code:**

```javascript
router.get('/schedules/timetable', async (req, res) => {
  try {
    const schedulesRef = admin.firestore().collection('sneha_schedules');
    const snapshot = await schedulesRef.get();
    
    const schedulesByDay = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    
    snapshot.forEach(doc => {
      const schedule = doc.data();
      const day = schedule.dayOfWeek;
      
      if (schedulesByDay[day]) {
        // IMPORTANT: Include all fields including IDs
        schedulesByDay[day].push({
          id: doc.id,
          batchId: schedule.batchId,              // ← ENSURE THIS IS INCLUDED
          batchName: schedule.batchName,
          teacherId: schedule.teacherId,         // ← ENSURE THIS IS INCLUDED
          teacherName: schedule.teacherName,
          subject: schedule.subject,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          room: schedule.room || '',
          recurring: schedule.recurring || false,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        });
      }
    });
    
    // Sort each day's schedules by start time
    Object.keys(schedulesByDay).forEach(day => {
      schedulesByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    res.json({
      ok: true,
      week: getWeekNumber(new Date()),
      schedules: schedulesByDay
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch schedules' });
  }
});
```

---

## Issue 2: PUT /schedules/:scheduleId - Not Persisting Updates

### Current Behavior ❌
The endpoint returns success **without actually updating** the Firestore document:

**Request sent by frontend:**
```json
PUT /schedules/acn4HfLivSCxB8zlUZSC
{
  "batchId": "sLzmSNTuu1E7xGtMABy2",
  "teacherId": "jSwPy4Xg2wGAEXrjM9QP",    // ← Changed from UQ9D5qWESsilgxCh5CjU
  "subject": "Science",
  "dayOfWeek": "Tuesday",
  "startTime": "14:00",
  "endTime": "15:30",
  "room": "A1",
  "recurring": true
}
```

**Response (fake success):**
```json
{
  "ok": true,
  "message": "Schedule updated successfully"
}
```

**What happens:**
- ✅ API returns success
- ❌ Firestore document is NOT updated
- ❌ Teacher ID still shows original value (UQ9D5qWESsilgxCh5CjU) instead of new (jSwPy4Xg2wGAEXrjM9QP)

### Problem
The endpoint is likely a stub that doesn't implement the update:

```javascript
// WRONG - Just returns success without updating
router.put('/schedules/:scheduleId', (req, res) => {
  res.json({ ok: true, message: 'Schedule updated successfully' });
  // Missing: actual Firestore update!
});
```

### Required Fix
Implement actual Firestore document update:

```javascript
router.put('/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { batchId, teacherId, subject, dayOfWeek, startTime, endTime, room, recurring } = req.body;
    
    // Validate required fields
    if (!batchId || !teacherId || !subject || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: batchId, teacherId, subject, dayOfWeek, startTime, endTime' 
      });
    }
    
    // Fetch batch name from batches collection
    const batchDoc = await admin.firestore().collection('sneha_batches').doc(batchId).get();
    const batchName = batchDoc.exists ? batchDoc.data().name : '';
    
    // Fetch teacher name from teachers collection
    const teacherDoc = await admin.firestore().collection('sneha_teachers').doc(teacherId).get();
    const teacherName = teacherDoc.exists ? teacherDoc.data().name : '';
    
    // Update the schedule document in Firestore
    await admin.firestore().collection('sneha_schedules').doc(scheduleId).update({
      batchId,
      batchName,
      teacherId,
      teacherName,
      subject,
      dayOfWeek,
      startTime,
      endTime,
      room: room || '',
      recurring: recurring !== false,
      updatedAt: new Date()
    });
    
    res.json({ 
      ok: true, 
      message: 'Schedule updated successfully',
      schedule: {
        id: scheduleId,
        batchId,
        batchName,
        teacherId,
        teacherName,
        subject,
        dayOfWeek,
        startTime,
        endTime,
        room: room || '',
        recurring: recurring !== false
      }
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ ok: false, error: 'Failed to update schedule' });
  }
});
```

---

## Testing After Updates

### Test GET /schedules/timetable

```bash
curl -H "Authorization: Bearer YOUR_SESSION_ID" \
  https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules/timetable
```

**Verify response includes:**
- ✅ `batchId` field for each schedule
- ✅ `teacherId` field for each schedule
- ✅ All schedule details (subject, times, room, etc.)

### Test PUT /schedules/:scheduleId

1. **Get a schedule ID** from GET /schedules/timetable response (e.g., `acn4HfLivSCxB8zlUZSC`)
2. **Note the original teacherId** (e.g., `UQ9D5qWESsilgxCh5CjU`)
3. **Update it to a different teacher:**

```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "sLzmSNTuu1E7xGtMABy2",
    "teacherId": "jSwPy4Xg2wGAEXrjM9QP",
    "subject": "Science",
    "dayOfWeek": "Tuesday",
    "startTime": "14:00",
    "endTime": "15:30",
    "room": "A1",
    "recurring": true
  }' \
  https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules/acn4HfLivSCxB8zlUZSC
```

4. **Verify the change persisted:**

```bash
curl -H "Authorization: Bearer YOUR_SESSION_ID" \
  https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules/timetable
```

**The schedule should now show:**
- Teacher changed to `jSwPy4Xg2wGAEXrjM9QP` (CHETAN SUNIL DONGARSANE)
- Not the original `UQ9D5qWESsilgxCh5CjU` (Sneha)

---

## Frontend Workaround (Already Implemented)

While waiting for backend fixes, the frontend has implemented a workaround:

```typescript
// In Timetable.tsx - Enrich schedules with IDs by looking up names
const enrichedSchedules = schedulesList.map((schedule: any) => {
  const batch = batchesRes.items?.find((b: any) => b.name === schedule.batchName);
  const teacher = teachersRes.items?.find((t: any) => t.name === schedule.teacherName);
  
  return {
    ...schedule,
    batchId: schedule.batchId || batch?.id || '',
    teacherId: schedule.teacherId || teacher?.id || ''
  };
});
```

**This workaround:**
- ✅ Allows form pre-fill to work (dropdowns show selected values)
- ❌ Cannot be relied on permanently (what if names don't match exactly?)
- ❌ Adds unnecessary frontend complexity

**The backend fix is still required for production quality.**

---

## Summary of Changes

| Endpoint | Current Status | Required Change |
|----------|---|---|
| **GET /schedules/timetable** | Returns partial data | Add `batchId` and `teacherId` to response |
| **PUT /schedules/:scheduleId** | Returns fake success | Implement actual Firestore update |

---

## Files to Modify

- `index_new.js` or your main Express router file
  - Search for: `router.get('/schedules/timetable'`
  - Search for: `router.put('/schedules/:scheduleId'`

---

## Estimated Effort

- **GET /schedules/timetable fix:** 5-10 minutes
- **PUT /schedules/:scheduleId fix:** 10-15 minutes
- **Testing both endpoints:** 5-10 minutes
- **Total:** ~30 minutes

---

## Contact

If you have questions about the implementation, refer to the code examples above or check the existing working endpoints in your codebase for reference patterns.
