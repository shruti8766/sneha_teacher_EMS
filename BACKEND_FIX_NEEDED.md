# Backend Fix Required: Batch Student Enrollment

## Issue
The POST `/batches` endpoint is **not saving the `studentIds` field** to the database.

### Current Behavior
1. ✅ Frontend sends: `studentIds: ["SOhbVAs3SA4h6XR5BdGt", "hA8BZlNlyItcgRsx4Ter"]`
2. ✅ Backend accepts the request and creates a batch
3. ❌ Backend saves `studentIds: []` (empty array) to Firestore instead of the actual IDs
4. ❌ When fetching batches, `studentIds` comes back empty

### Result
- Batches show "0 Students enrolled" in the UI
- BatchDetail page shows "No students enrolled yet"
- Student enrollment feature is completely broken

---

## Backend Fix Required

**File to modify:** Firebase Cloud Functions (likely `functions/src/index.ts` or similar)

**Endpoint:** `POST /batches`

### Current Code (BROKEN)
```javascript
// POST /batches endpoint - CURRENT (BROKEN)
app.post('/batches', async (req, res) => {
  const batchData = {
    name: req.body.name,
    board: req.body.board,
    standard: req.body.standard,
    subject: req.body.subject,
    description: req.body.description,
    maxStudents: req.body.maxStudents,
    // studentIds field is MISSING or hardcoded to []
    studentIds: [],  // ← THIS IS THE BUG
    active: true,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const batchRef = await db.collection('batches').add(batchData);
  res.json({ ok: true, batchId: batchRef.id });
});
```

### Fixed Code (REQUIRED)
```javascript
// POST /batches endpoint - FIXED
app.post('/batches', async (req, res) => {
  const batchData = {
    name: req.body.name,
    board: req.body.board,
    standard: req.body.standard,
    subject: req.body.subject,
    description: req.body.description || '',
    maxStudents: req.body.maxStudents || null,
    studentIds: req.body.studentIds || [],  // ← ADD THIS LINE TO FIX
    active: true,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const batchRef = await db.collection('batches').add(batchData);
  res.json({ ok: true, batchId: batchRef.id });
});
```

---

## The Fix
**Add this one line to the `batchData` object:**
```javascript
studentIds: req.body.studentIds || [],
```

This will:
- Accept the `studentIds` array from the request body
- Save it to Firestore when creating a batch
- Return it when fetching batches via GET `/batches`

---


