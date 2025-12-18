/* eslint-env node */
"use strict";

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const functions = require("firebase-functions/v2/https");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Initialize Firebase Admin
try {
  admin.app();
} catch (error) {
  admin.initializeApp();
}

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

/* ----------------------------- helpers ---------------------------------- */

function ok(res, data) {
  const payload = { ok: true };
  if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      payload[key] = data[key];
    });
  }
  return res.status(200).json(payload);
}

function bad(res, code, message) {
  return res.status(code || 400).json({
    ok: false,
    error: message || "Bad Request",
  });
}

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message || "Invalid");
    error.isBad = true;
    throw error;
  }
}

function parseIntSafe(value, defaultValue) {
  const number = parseInt(value, 10);
  return Number.isFinite(number) ? number : (typeof defaultValue === "number" ? defaultValue : 0);
}

function parseLimit(value, defaultValue, maxValue) {
  const defaultVal = typeof defaultValue === "number" ? defaultValue : 20;
  const maxVal = typeof maxValue === "number" ? maxValue : 100;
  let number = parseIntSafe(value, defaultVal);
  if (number < 1) number = 1;
  if (number > maxVal) number = maxVal;
  return number;
}

function isTeacherOrAdmin(role) {
  return role === "teacher" || role === "admin";
}

async function ownsStudent(studentId, uid) {
  const snapshot = await db.collection("sneha_students").doc(studentId).get();
  return snapshot.exists && snapshot.data().userId === uid;
}

// Helper to sort Firestore results in memory (avoids composite index errors)
const sortByCreatedAtDesc = (a, b) => {
  const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
  const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
  return tB - tA;
};

/* ----------------------------- auth middleware -------------------------- */

async function authRequired(req, res, next) {
  try {
    const authHeader = (req.headers && req.headers.authorization) || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    assert(match && match[1], "Missing Authorization: Bearer <sessionId>");

    const sessionId = match[1];
    const usersRef = db.collection("sneha_users");
    const snapshot = await usersRef.where("sessionId", "==", sessionId).limit(1).get();

    assert(!snapshot.empty, "Unauthorized: Invalid session");

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const sessionExpiresAt = user.sessionExpiresAt ? user.sessionExpiresAt.toDate() : null;
    if (sessionExpiresAt && sessionExpiresAt < new Date()) {
      throw new Error("Unauthorized: Session expired");
    }

    req.user = { uid: user.uid, role: user.role, name: user.name };
    next();
  } catch (error) {
    return bad(res, 401, error.isBad ? error.message : "Unauthorized");
  }
}

/* ----------------------------- sneha router ------------------------------ */

// eslint-disable-next-line new-cap
const sneha = express.Router();

// Health check
sneha.get("/health", (req, res) => ok(res, { ts: Date.now() }));

/* --- Authentication --- */

sneha.post("/register", async (req, res) => {
  try {
    const { email, password, name, role = "teacher" } = req.body;
    assert(email && password && name, "email, password, and name are required");
    assert(password.length >= 8, "Password must be at least 8 characters long");

    const userSnapshot = await db.collection("sneha_users").where("email", "==", email.toLowerCase()).get();
    assert(userSnapshot.empty, "User with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const userRef = db.collection("sneha_users").doc();
    const uid = userRef.id;
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

    await userRef.set({
      uid,
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ok(res, { userId: uid, message: "User registered successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

sneha.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    assert(email && password, "email and password required");

    const snapshot = await db.collection("sneha_users").where("email", "==", email.toLowerCase()).limit(1).get();
    assert(!snapshot.empty, "Invalid credentials");

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    assert(passwordMatch, "Invalid credentials");

    const sessionId = uuidv4();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 30);

    await userDoc.ref.update({
      sessionId,
      sessionExpiresAt: admin.firestore.Timestamp.fromDate(sessionExpiry),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return ok(res, {
      message: "Login successful",
      sessionId,
      user: { uid: user.uid, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return bad(res, error.isBad ? 401 : 500, error.message);
  }
});

/* Protected routes */
sneha.use(authRequired);

/* ----------------------------- FEES MODULE (V2) ------------------------- */

// 1. Create Fee Plan
sneha.post("/fee-plans", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { name, amount, currency, frequency, board, standard, subject } = req.body;
    assert(name && amount > 0, "name and positive amount required");

    const ref = await db.collection("sneha_fee_plans").add({
      name,
      amount: Number(amount),
      currency: currency || "INR",
      frequency: frequency || "monthly",
      board: board ? String(board).toUpperCase() : null,
      standard: typeof standard !== "undefined" ? parseIntSafe(standard) : null,
      subject: subject || null,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
    });

    return ok(res, { feePlanId: ref.id, message: "Fee plan created" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed");
  }
});

// 2. List Fee Plans (Fixed: In-Memory Sorting)
sneha.get("/fee-plans", async (req, res) => {
  try {
    let ref = db.collection("sneha_fee_plans").where("active", "==", true);

    const snapshot = await ref.limit(100).get();

    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt descending in memory
    items.sort(sortByCreatedAtDesc);

    return ok(res, { items });
  } catch (error) {
    console.error("List fee plans error:", error);
    return bad(res, 500, error.message || "Failed to list fee plans");
  }
});

// Update Fee Plan
sneha.put("/fee-plans/:feePlanId", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Admin access required");
    const { feePlanId } = req.params;
    const { name, amount, currency, frequency, board, standard } = req.body;

    // Validate required fields
    assert(name, "name is required");
    assert(amount !== undefined && amount > 0, "amount must be a positive number");
    assert(currency, "currency is required");
    assert(frequency === "monthly" || frequency === "yearly", "frequency must be 'monthly' or 'yearly'");

    // Validate standard if provided
    if (standard !== undefined && standard !== null) {
      const standardNum = parseIntSafe(standard);
      assert(standardNum >= 1 && standardNum <= 12, "standard must be between 1 and 12");
    }

    // Check if fee plan exists
    const feePlanDoc = await db.collection("sneha_fee_plans").doc(feePlanId).get();
    assert(feePlanDoc.exists, "Fee plan not found");

    // Update the fee plan
    const updateData = {
      name,
      amount: Number(amount),
      currency,
      frequency,
      board: board ? String(board).toUpperCase() : null,
      standard: typeof standard !== "undefined" && standard !== null ? parseIntSafe(standard) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    };

    await db.collection("sneha_fee_plans").doc(feePlanId).update(updateData);

    // Log activity
    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "updated_fee_plan",
      entityType: "fee_plan",
      entityId: feePlanId,
      entityName: name,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { feePlanId, name, amount, frequency }
    });

    return ok(res, { feePlanId, message: "Fee plan updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update fee plan");
  }
});

// 3. Set Student Fee Plan
sneha.put("/students/:studentId/fee-plan", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const studentId = req.params.studentId;
    const { amount, currency, frequency, isActive } = req.body;

    assert(amount !== undefined, "amount required");

    const update = {
      feePlan: {
        amount: Number(amount),
        currency: currency || "INR",
        frequency: frequency || "monthly",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("sneha_students").doc(studentId).set(update, { merge: true });
    return ok(res, { studentId, message: "Student fee plan updated" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed");
  }
});

// Remove Fee Plan from Student
sneha.delete("/students/:studentId/fee-plan", async (req, res) => {
  try {
    const { studentId } = req.params;
    const userRole = req.user.role;

    // Check if student exists
    const studentDoc = await db.collection("sneha_students").doc(studentId).get();
    assert(studentDoc.exists, "Student not found");

    const studentData = studentDoc.data();

    // Authorization check: admin OR student's teacher
    if (userRole !== "admin" && studentData.teacherId !== req.user.uid) {
      return bad(res, 403, "Permission denied. Only admin or the student's teacher can remove fee plan.");
    }

    // Check if fee plan is assigned
    if (!studentData.feePlan || Object.keys(studentData.feePlan).length === 0) {
      return bad(res, 400, "No fee plan is assigned to this student");
    }

    // Remove the feePlan field using FieldValue.delete()
    await db.collection("sneha_students").doc(studentId).update({
      feePlan: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log activity
    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "removed_student_fee_plan",
      entityType: "student",
      entityId: studentId,
      entityName: studentData.name || "Unknown",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { studentId, removedPlan: studentData.feePlan }
    });

    return ok(res, { studentId, message: "Fee plan removed from student successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to remove fee plan");
  }
});

// 4. Record Payment
sneha.post("/students/:studentId/fees/payments", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const studentId = req.params.studentId;
    const { amount, method, note, paidAt, currency, frequency } = req.body;
    assert(amount && amount > 0, "positive amount required");

    const studentDoc = await db.collection("sneha_students").doc(studentId).get();
    assert(studentDoc.exists, "Student not found");
    const studentData = studentDoc.data();
    const plan = studentData.feePlan || {};

    // Determine Period (YYYY-MM or YYYY)
    const paidDate = paidAt ? new Date(paidAt) : new Date();
    const yyyy = paidDate.getFullYear();
    const mm = String(paidDate.getMonth() + 1).padStart(2, "0");
    // Use provided frequency, or fall back to plan frequency, or default to monthly
    const freq = frequency || plan.frequency || "monthly";
    const period = freq === "yearly" ? String(yyyy) : `${yyyy}-${mm}`;

    const ref = await studentDoc.ref.collection("sneha_fee_payments").add({
      amount: Number(amount),
      currency: currency || plan.currency || "INR",
      frequency: freq,
      method: method || "cash",
      note: note || "",
      paidAt: admin.firestore.Timestamp.fromDate(paidDate),
      period,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
    });

    // Log activity
    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "recorded_payment",
      entityType: "payment",
      entityId: ref.id,
      entityName: `${studentData.name} - ${amount}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { studentId, amount, period, currency: currency || "INR", frequency: freq }
    });

    return ok(res, { paymentId: ref.id, period, message: "Payment recorded" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed");
  }
});

// Helper: Calculate months elapsed between two dates
function calculateMonthsElapsed(startYear, startMonth, endYear, endMonth) {
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

// Helper: Get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// 5. Get Fee Summary (Dashboard) - COMPLETE REWRITE
sneha.get("/fees/summary", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { period, teacherId } = req.query;

    // Determine target period (default to current month)
    const targetPeriod = period || getCurrentMonth();

    // Parse target period (YYYY-MM)
    const [targetYear, targetMonth] = targetPeriod.split("-").map(Number);

    // 1. Get students - filter by teacherId if provided
    let studentsQuery = db.collection("sneha_students");

    // Filter by teacherId if provided, otherwise use current user's ID if they're a teacher
    const filterTeacherId = teacherId || (req.user.role === "teacher" ? req.user.uid : null);
    if (filterTeacherId) {
      studentsQuery = studentsQuery.where("teacherId", "==", filterTeacherId);
    }

    const studentsSnap = await studentsQuery.limit(1000).get();
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Calculate fees for each student
    const items = [];

    for (const student of students) {
      try {
        const plan = student.feePlan || null;

        if (!plan || !plan.amount || plan.amount <= 0) {
          // No fee plan or invalid amount
          items.push({
            studentId: student.id,
            name: student.name,
            teacherId: student.teacherId,
            plan: null,
            paidAmount: 0,
            dueAmount: 0,
            status: "no_plan"
          });
          continue;
        }

        const planAmount = Number(plan.amount);
        const frequency = plan.frequency || "monthly";
        const currency = plan.currency || "INR";

        // Get fee plan start date (if stored) or use a default
        const planStartMonth = plan.startMonth || "2025-01"; // Default start month
        const [startYear, startMonth] = planStartMonth.split("-").map(Number);

        // Calculate due amount based on frequency
        let totalDue = 0;

        if (frequency === "monthly") {
          // Calculate months elapsed from start to target period
          const monthsElapsed = calculateMonthsElapsed(startYear, startMonth, targetYear, targetMonth);

          // Due amount is planAmount * (months elapsed + 1)
          // +1 because if they started in Jan and it's Jan, they owe 1 month
          totalDue = planAmount * Math.max(1, monthsElapsed + 1);
        } else if (frequency === "yearly") {
          // For yearly, check if target period >= start period
          if (targetYear > startYear || (targetYear === startYear && targetMonth >= startMonth)) {
            totalDue = planAmount;
          } else {
            totalDue = 0;
          }
        }

        // 3. Calculate total paid amount up to target period
        const paymentsSnap = await db.collection("sneha_students")
          .doc(student.id)
          .collection("sneha_fee_payments")
          .get();

        let totalPaid = 0;
        paymentsSnap.docs.forEach(doc => {
          const paymentData = doc.data();
          const paymentPeriod = paymentData.period;

          // Include payment if it's on or before target period
          if (paymentPeriod && paymentPeriod <= targetPeriod) {
            totalPaid += (paymentData.amount || 0);
          }
        });

        // 4. Calculate status
        const dueAmount = Math.max(0, totalDue - totalPaid);
        let status = "unpaid";

        if (totalPaid >= totalDue) {
          status = "paid";
        } else if (totalPaid > 0) {
          status = "partial";
        }

        items.push({
          studentId: student.id,
          name: student.name,
          teacherId: student.teacherId,
          plan: {
            amount: planAmount,
            currency: currency,
            frequency: frequency,
            startMonth: planStartMonth
          },
          paidAmount: totalPaid,
          dueAmount: dueAmount,
          status: status
        });

      } catch (error) {
        console.error(`Error calculating fees for student ${student.id}:`, error);
        items.push({
          studentId: student.id,
          name: student.name,
          teacherId: student.teacherId,
          plan: null,
          paidAmount: 0,
          dueAmount: 0,
          status: "error"
        });
      }
    }

    // 5. Calculate summary statistics
    const summary = {
      totalStudents: items.length,
      studentsWithPlan: items.filter(i => i.status !== "no_plan").length,
      studentsNoPlan: items.filter(i => i.status === "no_plan").length,
      paidCount: items.filter(i => i.status === "paid").length,
      partialCount: items.filter(i => i.status === "partial").length,
      unpaidCount: items.filter(i => i.status === "unpaid").length,
      totalCollected: items.reduce((sum, i) => sum + i.paidAmount, 0),
      totalDue: items.reduce((sum, i) => sum + i.dueAmount, 0),
      totalExpected: items.reduce((sum, i) => sum + (i.plan ? i.plan.amount : 0), 0)
    };

    return ok(res, {
      items,
      period: targetPeriod,
      summary,
      teacherId: filterTeacherId || "all"
    });
  } catch (error) {
    console.error("Fees summary error:", error);
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to get fees summary");
  }
});

// List Payments for a Student
sneha.get("/students/:studentId/fees/payments", async (req, res) => {
  try {
    const { studentId } = req.params;
    const snapshot = await db.collection("sneha_students").doc(studentId)
      .collection("sneha_fee_payments")
      .orderBy("paidAt", "desc")
      .limit(100)
      .get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, "Failed to list payments");
  }
});

/* ----------------------------- STUDENTS --------------------------------- */

sneha.post("/teachers/:teacherId/students", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { name, email, password, board, standard, phone, subjects, schoolName, parentName, parentPhone, parentEmail, parentProfession, parentCompanyName, parentDesignation } = req.body;
    assert(name && email, "name and email required");

    let userId = null;

    // If password provided, create Firebase Auth user for student login
    if (password) {
      assert(password.length >= 6, "Password must be at least 6 characters");

      // Check if email already exists
      const existingUser = await db.collection("sneha_users").where("email", "==", email.toLowerCase()).limit(1).get();
      assert(existingUser.empty, "A user with this email already exists");

      // Create user record in sneha_users (same pattern as teacher registration)
      const passwordHash = await bcrypt.hash(password, 10);
      const userRef = db.collection("sneha_users").doc();
      userId = userRef.id;

      await userRef.set({
        uid: userId,
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "student",
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const ref = await db.collection("sneha_students").add({
      name,
      email: email.toLowerCase(),
      board: String(board || "").toUpperCase(),
      standard: parseIntSafe(standard),
      phone: phone || "",
      subjects: subjects || [],
      schoolName: schoolName || "",
      parent: {
        name: parentName || "",
        phone: parentPhone || "",
        email: parentEmail || "",
        profession: parentProfession || "",
        companyName: parentCompanyName || "",
        designation: parentDesignation || ""
      },
      userId: userId,  // Link to auth user if created
      teacherId: req.params.teacherId,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid, action: "created", entityType: "student", entityId: ref.id, entityName: name, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, {
      studentId: ref.id,
      userId: userId,
      message: userId ? "Student created with login credentials" : "Student created successfully"
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

sneha.get("/students", async (req, res) => {
  try {
    let ref = db.collection("sneha_students").where("active", "==", true);
    if (req.query.board) ref = ref.where("board", "==", req.query.board);
    if (req.query.standard) ref = ref.where("standard", "==", parseIntSafe(req.query.standard));

    const snapshot = await ref.limit(100).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single student by ID or userId
sneha.get("/students/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // First try to find by document ID
    let doc = await db.collection("sneha_students").doc(studentId).get();

    // If not found, try to find by userId (for logged-in students)
    if (!doc.exists) {
      const querySnapshot = await db.collection("sneha_students")
        .where("userId", "==", studentId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        doc = querySnapshot.docs[0];
        const student = { id: doc.id, ...doc.data() };
        return ok(res, student);
      }
    }

    if (!doc.exists) {
      return bad(res, 404, "Student not found");
    }

    const student = { id: doc.id, ...doc.data() };
    return ok(res, student);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch student");
  }
});

// Update a student
sneha.put("/students/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { name, email, board, standard, phone, subjects, schoolName, parentName, parentPhone, parentEmail, parentProfession, parentCompanyName, parentDesignation } = req.body;

    const doc = await db.collection("sneha_students").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Student not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (board !== undefined) updates.board = board;
    if (standard !== undefined) updates.standard = Number(standard);
    if (phone !== undefined) updates.phone = phone;
    if (subjects !== undefined) updates.subjects = subjects;
    if (schoolName !== undefined) updates.schoolName = schoolName;

    // Handle parent information
    if (parentName !== undefined || parentPhone !== undefined || parentEmail !== undefined || parentProfession !== undefined || parentCompanyName !== undefined || parentDesignation !== undefined) {
      const existingParent = doc.data().parent || {};
      updates.parent = {
        name: parentName !== undefined ? parentName : existingParent.name || "",
        phone: parentPhone !== undefined ? parentPhone : existingParent.phone || "",
        email: parentEmail !== undefined ? parentEmail : existingParent.email || "",
        profession: parentProfession !== undefined ? parentProfession : existingParent.profession || "",
        companyName: parentCompanyName !== undefined ? parentCompanyName : existingParent.companyName || "",
        designation: parentDesignation !== undefined ? parentDesignation : existingParent.designation || ""
      };
    }

    await db.collection("sneha_students").doc(id).update(updates);
    return ok(res, { message: "Student updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update student");
  }
});

sneha.delete("/students/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    await db.collection("sneha_students").doc(req.params.id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Deleted" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- TEACHERS --------------------------------- */

sneha.get("/teachers", async (req, res) => {
  try {
    const snapshot = await db.collection("sneha_users").where("role", "==", "teacher").limit(100).get();
    const items = snapshot.docs.map(d => {
      const data = d.data();
      delete data.passwordHash;
      delete data.sessionId;
      return { id: d.id, ...data };
    });
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

sneha.post("/teachers", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Forbidden");
    const { email, password, name, subjects, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const ref = db.collection("sneha_users").doc();
    await ref.set({
      uid: ref.id, email: email.toLowerCase(), name, passwordHash: hash, role: "teacher", phone, subjects, active: true, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { teacherId: ref.id });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single teacher by ID
sneha.get("/teachers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_users").doc(id).get();

    if (!doc.exists || doc.data().role !== "teacher") {
      return bad(res, 404, "Teacher not found");
    }

    const teacher = { id: doc.id, ...doc.data() };
    delete teacher.passwordHash;
    delete teacher.sessionId;
    return ok(res, teacher);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch teacher");
  }
});

// Update a teacher
sneha.put("/teachers/:id", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Forbidden");
    const { id } = req.params;
    const { name, email, phone, subjects } = req.body;

    const doc = await db.collection("sneha_users").doc(id).get();
    if (!doc.exists || doc.data().role !== "teacher") {
      return bad(res, 404, "Teacher not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (subjects !== undefined) updates.subjects = subjects;

    await db.collection("sneha_users").doc(id).update(updates);
    return ok(res, { message: "Teacher updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update teacher");
  }
});

// Delete a teacher
sneha.delete("/teachers/:id", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_users").doc(id).get();
    if (!doc.exists || doc.data().role !== "teacher") {
      return bad(res, 404, "Teacher not found");
    }

    await db.collection("sneha_users").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Teacher deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete teacher");
  }
});

/* ----------------------------- BATCHES ---------------------------------- */

sneha.post("/batches", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { name, board, standard, subject, description, maxStudents, studentIds } = req.body;
    assert(name, "Batch name is required");

    const ref = await db.collection("sneha_batches").add({
      name,
      board: board || "",
      standard: standard ? parseIntSafe(standard) : null,
      subject: subject || "",
      description: description || "",
      maxStudents: maxStudents ? parseIntSafe(maxStudents) : null,
      studentIds: studentIds || [],  // Accept studentIds from request
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "created",
      entityType: "batch",
      entityId: ref.id,
      entityName: name,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { batchId: ref.id, message: "Batch created successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

sneha.get("/batches", async (req, res) => {
  try {
    const snapshot = await db.collection("sneha_batches").where("active", "==", true).limit(100).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single batch by ID
sneha.get("/batches/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_batches").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Batch not found");
    }

    const batch = { id: doc.id, ...doc.data() };
    return ok(res, batch);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch batch");
  }
});

// Update a batch
sneha.put("/batches/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { name, board, standard, subject, studentIds } = req.body;

    const doc = await db.collection("sneha_batches").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Batch not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updates.name = name;
    if (board !== undefined) updates.board = board;
    if (standard !== undefined) updates.standard = Number(standard);
    if (subject !== undefined) updates.subject = subject;
    if (studentIds !== undefined) updates.studentIds = studentIds;

    await db.collection("sneha_batches").doc(id).update(updates);
    return ok(res, { message: "Batch updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update batch");
  }
});

// Delete a batch
sneha.delete("/batches/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_batches").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Batch not found");
    }

    await db.collection("sneha_batches").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Batch deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete batch");
  }
});

// Assign teacher to batch
sneha.put("/batches/:batchId/assign-teacher", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { batchId } = req.params;
    const { teacherId, teacherName } = req.body;

    assert(teacherId && teacherName, "teacherId and teacherName are required");

    const batchDoc = await db.collection("sneha_batches").doc(batchId).get();
    if (!batchDoc.exists) {
      return bad(res, 404, "Batch not found");
    }

    // Verify teacher exists
    const teacherDoc = await db.collection("sneha_users").doc(teacherId).get();
    if (!teacherDoc.exists || teacherDoc.data().role !== "teacher") {
      return bad(res, 404, "Teacher not found");
    }

    await db.collection("sneha_batches").doc(batchId).update({
      teacherId,
      teacherName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const batch = { id: batchDoc.id, ...batchDoc.data(), teacherId, teacherName };

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "assigned_teacher",
      entityType: "batch",
      entityId: batchId,
      details: { teacherId, teacherName },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { message: "Teacher assigned to batch successfully", batch });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// Remove teacher from batch
sneha.delete("/batches/:batchId/assign-teacher", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Only admins can remove teachers from batches");
    const { batchId } = req.params;

    const batchDoc = await db.collection("sneha_batches").doc(batchId).get();
    if (!batchDoc.exists) {
      return bad(res, 404, "Batch not found");
    }

    await db.collection("sneha_batches").doc(batchId).update({
      teacherId: admin.firestore.FieldValue.delete(),
      teacherName: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "removed_teacher",
      entityType: "batch",
      entityId: batchId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { message: "Teacher removed from batch" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Get batches by teacher
sneha.get("/teachers/:teacherId/batches", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const snapshot = await db.collection("sneha_batches")
      .where("teacherId", "==", teacherId)
      .where("active", "==", true)
      .get();

    const items = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const studentCount = data.studentIds ? data.studentIds.length : 0;
      
      return {
        id: doc.id,
        name: data.name,
        subject: data.subject,
        board: data.board,
        standard: data.standard,
        studentCount
      };
    }));

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- HOMEWORK --------------------------------- */

sneha.post("/homework", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { title, subject, instructions, assignTo, dueAt, attachments, board, standard } = req.body;
    assert(title && subject, "title and subject are required");

    // Ensure assignTo is an array (can be empty for no-one, or specific students)
    const assignToArray = Array.isArray(assignTo) ? assignTo : [];

    const ref = await db.collection("sneha_homework").add({
      title,
      subject,
      instructions: instructions || "",
      assignTo: assignToArray,
      dueAt: dueAt || null,
      attachments: attachments || [],
      board: board || null,
      standard: standard || null,
      active: true,
      status: "assigned",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid, action: "assigned", entityType: "homework", entityId: ref.id, entityName: title, details: { assignedTo: assignToArray.length, count: assignToArray.length }, timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { homeworkId: ref.id, message: `Homework assigned to ${assignToArray.length} student(s)` });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

sneha.get("/homework", async (req, res) => {
  try {
    const { studentId } = req.query;
    let ref = db.collection("sneha_homework").where("active", "==", true);

    if (studentId) {
      ref = ref.where("assignTo", "array-contains", studentId);
    }

    const snapshot = await ref.limit(100).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort in memory
    items.sort(sortByCreatedAtDesc);

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single homework by ID
sneha.get("/homework/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_homework").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Homework not found");
    }

    const homework = { id: doc.id, ...doc.data() };
    return ok(res, homework);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch homework");
  }
});

// Update homework
sneha.put("/homework/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { title, subject, instructions, assignTo, dueAt, status } = req.body;

    const doc = await db.collection("sneha_homework").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Homework not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (instructions !== undefined) updates.instructions = instructions;
    if (assignTo !== undefined) updates.assignTo = assignTo;
    if (dueAt !== undefined) updates.dueAt = dueAt;
    if (status !== undefined) updates.status = status;

    await db.collection("sneha_homework").doc(id).update(updates);
    return ok(res, { message: "Homework updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update homework");
  }
});

// Delete homework
sneha.delete("/homework/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_homework").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Homework not found");
    }

    await db.collection("sneha_homework").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Homework deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete homework");
  }
});

/* ----------------------------- ATTENDANCE ------------------------------- */

sneha.post("/attendance/sessions", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const ref = await db.collection("sneha_att_sessions").add({
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { sessionId: ref.id });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

sneha.get("/attendance/sessions", async (req, res) => {
  try {
    const snapshot = await db.collection("sneha_att_sessions").orderBy("date", "desc").limit(50).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Update attendance session
sneha.put("/attendance/sessions/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { batchId, date, subject, notes } = req.body;

    const doc = await db.collection("sneha_att_sessions").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Attendance session not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (batchId !== undefined) updates.batchId = batchId;
    if (date !== undefined) updates.date = date;
    if (subject !== undefined) updates.subject = subject;
    if (notes !== undefined) updates.notes = notes;

    await db.collection("sneha_att_sessions").doc(id).update(updates);
    return ok(res, { message: "Attendance session updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update attendance session");
  }
});

// Delete attendance session
sneha.delete("/attendance/sessions/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_att_sessions").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Attendance session not found");
    }

    await db.collection("sneha_att_sessions").doc(id).delete();
    return ok(res, { message: "Attendance session deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete attendance session");
  }
});

// Get all attendance records for a specific session
sneha.get("/attendance/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate sessionId
    assert(sessionId && sessionId.trim().length > 0, "Session ID is required");

    // Get session details
    const sessionDoc = await db.collection("sneha_att_sessions").doc(sessionId).get();
    assert(sessionDoc.exists, "Attendance session not found");

    const session = sessionDoc.data();

    // Get all attendance records for this session
    const attendanceSnapshot = await db
      .collection("sneha_att_marks")
      .where("sessionId", "==", sessionId)
      .get();

    const records = [];

    // Fetch student names and build response
    for (const doc of attendanceSnapshot.docs) {
      const data = doc.data();

      // Fetch student details only if studentId exists
      let studentName = "Unknown";
      if (data.studentId && data.studentId.trim().length > 0) {
        try {
          const studentDoc = await db.collection("sneha_students").doc(data.studentId).get();
          studentName = studentDoc.exists ? studentDoc.data().name : "Unknown";
        } catch (err) {
          console.error(`Error fetching student ${data.studentId}:`, err);
        }
      }

      records.push({
        id: doc.id,
        studentId: data.studentId || null,
        studentName,
        status: data.status,
        markedAt: data.markedAt,
        markedBy: data.markedBy
      });
    }

    // Calculate stats
    const stats = {
      total: records.length,
      present: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
      late: records.filter(r => r.status === "late").length
    };

    return ok(res, {
      sessionId,
      session,
      records,
      stats
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

sneha.post("/attendance/mark", async (req, res) => {
  try {
    const { sessionId, records } = req.body;

    // Validate input
    assert(sessionId, "sessionId is required");
    assert(records && Array.isArray(records), "records must be an array");
    assert(records.length > 0, "records must not be empty");

    // Get session details
    const sessionDoc = await db.collection("sneha_att_sessions").doc(sessionId).get();
    assert(sessionDoc.exists, "Attendance session not found");

    const session = sessionDoc.data();
    const batch = db.batch();
    const attendanceRef = db.collection("sneha_att_marks");

    // Store each attendance record
    for (const record of records) {
      const { studentId, status } = record;

      assert(studentId, "studentId is required for each record");
      assert(status && ["present", "absent", "late"].includes(status), "Invalid status");

      // Create unique document ID or use combination of sessionId-studentId
      const docId = `${sessionId}_${studentId}`;
      const docRef = attendanceRef.doc(docId);

      batch.set(
        docRef,
        {
          sessionId,
          studentId,
          status,
          date: session.date,
          subject: session.subject,
          batchId: session.batchId,
          markedBy: req.user.uid,
          markedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    // Commit batch
    await batch.commit();

    // Log the action
    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "marked_attendance",
      entityType: "attendance",
      entityId: sessionId,
      entityName: `Attendance for ${session.date}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { count: records.length, date: session.date }
    });

    return ok(res, { message: "Marked", count: records.length });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

/* ----------------------------- TESTS ------------------------------------ */

sneha.post("/tests", async (req, res) => {
  try {
    const ref = await db.collection("sneha_tests").add({
      ...req.body,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { testId: ref.id });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Fixed: Removed orderBy from query to avoid composite index error
sneha.get("/tests", async (req, res) => {
  try {
    const { board, standard } = req.query;
    let ref = db.collection("sneha_tests").where("active", "==", true);

    if (board) ref = ref.where("board", "==", board);
    if (standard) ref = ref.where("standard", "==", parseIntSafe(standard));

    const snapshot = await ref.limit(100).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort in memory
    items.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

    return ok(res, { items });
  } catch (error) {
    console.error("Tests fetch error", error);
    return bad(res, 500, error.message);
  }
});

// Get a single test by ID
sneha.get("/tests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_tests").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Test not found");
    }

    const test = { id: doc.id, ...doc.data() };
    return ok(res, test);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch test");
  }
});

// Update a test
sneha.put("/tests/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { title, subject, board, standard, dateTime, durationMin, maxMarks, chapters, paperFile } = req.body;

    const doc = await db.collection("sneha_tests").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Test not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (board !== undefined) updates.board = board;
    if (standard !== undefined) updates.standard = Number(standard);
    if (dateTime !== undefined) updates.dateTime = dateTime;
    if (durationMin !== undefined) updates.durationMin = Number(durationMin);
    if (maxMarks !== undefined) updates.maxMarks = Number(maxMarks);
    if (chapters !== undefined) updates.chapters = chapters;
    if (paperFile !== undefined) updates.paperFile = paperFile;

    await db.collection("sneha_tests").doc(id).update(updates);
    return ok(res, { message: "Test updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update test");
  }
});

// Delete a test
sneha.delete("/tests/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_tests").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Test not found");
    }

    await db.collection("sneha_tests").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Test deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete test");
  }
});

/* ----------------------------- TEST RESULTS ----------------------------- */

// Create/Submit test result
sneha.post("/tests/:testId/results", async (req, res) => {
  try {
    const { testId } = req.params;
    const { studentId, marksObtained, remarks, answers } = req.body;
    assert(studentId && marksObtained !== undefined, "studentId and marksObtained are required");

    // Verify test exists and get maxMarks from test
    const testDoc = await db.collection("sneha_tests").doc(testId).get();
    if (!testDoc.exists) {
      return bad(res, 404, "Test not found");
    }

    const testData = testDoc.data();
    const maxMarks = Number(testData.maxMarks) || 100;
    const marks = Number(marksObtained);

    assert(marks >= 0 && marks <= maxMarks, `Marks must be between 0 and ${maxMarks}`);

    const ref = await db.collection("sneha_test_results").add({
      testId,
      studentId,
      marksObtained: marks,
      maxMarks: maxMarks,
      percentage: (marks / maxMarks) * 100,
      remarks: remarks || "",
      answers: answers || {},
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "submitted_test_result",
      entityType: "test_result",
      entityId: ref.id,
      entityName: `${testData.title || 'Test'} - ${marks}/${maxMarks}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { resultId: ref.id, message: "Test result submitted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message || "Failed to submit test result");
  }
});

// Get all results for a test
sneha.get("/tests/:testId/results", async (req, res) => {
  try {
    const { testId } = req.params;

    const snapshot = await db.collection("sneha_test_results")
      .where("testId", "==", testId)
      .get();

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch test results");
  }
});

// Get a single test result
sneha.get("/tests/:testId/results/:resultId", async (req, res) => {
  try {
    const { resultId } = req.params;
    const doc = await db.collection("sneha_test_results").doc(resultId).get();

    if (!doc.exists) {
      return bad(res, 404, "Test result not found");
    }

    const result = { id: doc.id, ...doc.data() };
    return ok(res, result);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch test result");
  }
});

// Update a test result
sneha.put("/tests/:testId/results/:resultId", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { resultId } = req.params;
    const { marksObtained, remarks, answers } = req.body;

    const doc = await db.collection("sneha_test_results").doc(resultId).get();
    if (!doc.exists) {
      return bad(res, 404, "Test result not found");
    }

    const resultData = doc.data();
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (marksObtained !== undefined) {
      updates.marksObtained = Number(marksObtained);
      updates.percentage = (Number(marksObtained) / resultData.maxMarks) * 100;
    }
    if (remarks !== undefined) updates.remarks = remarks;
    if (answers !== undefined) updates.answers = answers;

    await db.collection("sneha_test_results").doc(resultId).update(updates);
    return ok(res, { message: "Test result updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update test result");
  }
});

// Delete a test result
sneha.delete("/tests/:testId/results/:resultId", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { resultId } = req.params;

    const doc = await db.collection("sneha_test_results").doc(resultId).get();
    if (!doc.exists) {
      return bad(res, 404, "Test result not found");
    }

    await db.collection("sneha_test_results").doc(resultId).delete();
    return ok(res, { message: "Test result deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete test result");
  }
});

// Bulk submit test results
sneha.post("/tests/:testId/results/bulk", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { testId } = req.params;
    const { results } = req.body;

    assert(results && Array.isArray(results), "results must be an array");
    assert(results.length > 0, "results array cannot be empty");

    // Verify test exists
    const testDoc = await db.collection("sneha_test_results").doc(testId).get();
    if (!testDoc.exists) {
      return bad(res, 404, "Test not found");
    }

    const testData = testDoc.data();
    const maxMarks = Number(testData.maxMarks) || 100;

    // Process results in batch
    const batch = db.batch();
    let processedCount = 0;

    for (const result of results) {
      const { studentId, marksObtained, remarks } = result;
      
      if (!studentId || marksObtained === undefined) {
        continue; // Skip invalid entries
      }

      const marks = Number(marksObtained);
      if (marks < 0 || marks > maxMarks) {
        continue; // Skip invalid marks
      }

      const ref = db.collection("sneha_test_results").doc();
      batch.set(ref, {
        testId,
        studentId,
        marksObtained: marks,
        maxMarks,
        percentage: (marks / maxMarks) * 100,
        remarks: remarks || "",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: req.user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      processedCount++;
    }

    await batch.commit();

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "bulk_submit_results",
      entityType: "test_results",
      entityId: testId,
      details: { count: processedCount },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { 
      message: "Results submitted successfully", 
      processedCount 
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message || "Failed to submit bulk results");
  }
});

// Get student test history
sneha.get("/students/:studentId/test-results", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, board, standard } = req.query;

    // Get all results for this student
    const resultsSnapshot = await db.collection("sneha_test_results")
      .where("studentId", "==", studentId)
      .get();

    // Get test details for each result
    const items = [];
    const testIds = new Set();
    
    for (const doc of resultsSnapshot.docs) {
      const resultData = doc.data();
      testIds.add(resultData.testId);
    }

    // Fetch all tests
    const testsMap = {};
    for (const testId of testIds) {
      const testDoc = await db.collection("sneha_tests").doc(testId).get();
      if (testDoc.exists) {
        testsMap[testId] = testDoc.data();
      }
    }

    // Build response with test details
    for (const doc of resultsSnapshot.docs) {
      const resultData = doc.data();
      const testData = testsMap[resultData.testId];
      
      if (!testData) continue;

      // Apply filters
      if (subject && testData.subject !== subject) continue;
      if (board && testData.board !== board) continue;
      if (standard && testData.standard !== Number(standard)) continue;

      items.push({
        id: doc.id,
        testId: resultData.testId,
        testTitle: testData.title,
        subject: testData.subject,
        board: testData.board,
        standard: testData.standard,
        date: testData.dateTime,
        marksObtained: resultData.marksObtained,
        maxMarks: resultData.maxMarks,
        percentage: resultData.percentage,
        remarks: resultData.remarks,
        submittedAt: resultData.submittedAt
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate summary
    const summary = {
      totalTests: items.length,
      averageScore: items.length > 0 
        ? items.reduce((sum, item) => sum + item.percentage, 0) / items.length 
        : 0,
      bestScore: items.length > 0 
        ? Math.max(...items.map(item => item.percentage)) 
        : 0,
      subjectWiseAverage: {}
    };

    // Calculate subject-wise averages
    const subjectScores = {};
    items.forEach(item => {
      if (!subjectScores[item.subject]) {
        subjectScores[item.subject] = [];
      }
      subjectScores[item.subject].push(item.percentage);
    });

    Object.keys(subjectScores).forEach(subject => {
      const scores = subjectScores[subject];
      summary.subjectWiseAverage[subject] = 
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return ok(res, { items, summary });
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch test results");
  }
});

/* ----------------------------- DAILY TARGETS ----------------------------- */

// Create daily target
sneha.post("/students/:studentId/daily-targets", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role) || req.user.uid === req.params.studentId, "Forbidden");
    const { studentId } = req.params;
    const { title, description, date, priority, status } = req.body;
    assert(title && date, "title and date are required");

    const ref = await db.collection("sneha_students").doc(studentId)
      .collection("sneha_daily_targets").add({
        title,
        description: description || "",
        date: date, // YYYY-MM-DD format
        priority: priority || "medium", // low | medium | high
        status: status || "pending", // pending | in-progress | completed
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: req.user.uid
      });

    return ok(res, { targetId: ref.id, message: "Daily target created" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message || "Failed to create daily target");
  }
});

// Get daily targets for a date
sneha.get("/students/:studentId/daily-targets", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query; // YYYY-MM-DD format

    let ref = db.collection("sneha_students").doc(studentId)
      .collection("sneha_daily_targets");

    if (date) {
      ref = ref.where("date", "==", date);
    }

    const snapshot = await ref.orderBy("priority", "desc").limit(100).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch daily targets");
  }
});

// Update daily target
sneha.put("/students/:studentId/daily-targets/:targetId", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role) || req.user.uid === req.params.studentId, "Forbidden");
    const { studentId, targetId } = req.params;
    const { title, description, date, priority, status } = req.body;

    const doc = await db.collection("sneha_students").doc(studentId)
      .collection("sneha_daily_targets").doc(targetId).get();

    if (!doc.exists) {
      return bad(res, 404, "Daily target not found");
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;

    await doc.ref.update(updates);
    return ok(res, { message: "Daily target updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to update daily target");
  }
});

// Delete daily target
sneha.delete("/students/:studentId/daily-targets/:targetId", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role) || req.user.uid === req.params.studentId, "Forbidden");
    const { studentId, targetId } = req.params;

    const doc = await db.collection("sneha_students").doc(studentId)
      .collection("sneha_daily_targets").doc(targetId).get();

    if (!doc.exists) {
      return bad(res, 404, "Daily target not found");
    }

    await doc.ref.delete();
    return ok(res, { message: "Daily target deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete daily target");
  }
});

/* ----------------------------- HOMEWORK SUBMISSIONS --------------------- */

// Submit homework (create/update submission)
sneha.post("/homework/:homeworkId/submit", async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { submissionText, attachments } = req.body;
    const studentId = req.user.uid;

    // Verify homework exists
    const hwDoc = await db.collection("sneha_homework").doc(homeworkId).get();
    if (!hwDoc.exists) {
      return bad(res, 404, "Homework not found");
    }

    // Check if student is assigned this homework
    const assignedStudents = hwDoc.data().assignTo || [];
    assert(assignedStudents.includes(studentId), "You are not assigned this homework");

    // Check if submission already exists
    const existingSubmissions = await db.collection("sneha_homework_submissions")
      .where("homeworkId", "==", homeworkId)
      .where("studentId", "==", studentId)
      .limit(1).get();

    let ref;
    if (!existingSubmissions.empty) {
      // Update existing submission
      ref = existingSubmissions.docs[0].ref;
      await ref.update({
        submissionText: submissionText || "",
        attachments: attachments || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "submitted"
      });
    } else {
      // Create new submission
      ref = await db.collection("sneha_homework_submissions").add({
        homeworkId,
        studentId,
        submissionText: submissionText || "",
        attachments: attachments || [],
        status: "submitted",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return ok(res, { submissionId: ref.id, message: "Homework submitted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message || "Failed to submit homework");
  }
});

// Get all submissions for a homework
sneha.get("/homework/:homeworkId/submissions", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { homeworkId } = req.params;

    const snapshot = await db.collection("sneha_homework_submissions")
      .where("homeworkId", "==", homeworkId)
      .orderBy("submittedAt", "desc")
      .limit(100).get();

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch submissions");
  }
});

// Grade homework submission
sneha.put("/homework/:homeworkId/submissions/:submissionId/grade", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { submissionId } = req.params;
    const { marksObtained, totalMarks, remarks } = req.body;

    const doc = await db.collection("sneha_homework_submissions").doc(submissionId).get();
    if (!doc.exists) {
      return bad(res, 404, "Submission not found");
    }

    const updates = {
      marksObtained: marksObtained !== undefined ? Number(marksObtained) : null,
      totalMarks: totalMarks !== undefined ? Number(totalMarks) : null,
      remarks: remarks || "",
      status: "graded",
      gradedAt: admin.firestore.FieldValue.serverTimestamp(),
      gradedBy: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await doc.ref.update(updates);
    return ok(res, { message: "Submission graded successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message || "Failed to grade submission");
  }
});

// Get homework submissions for a student
sneha.get("/students/:studentId/homework-submissions", async (req, res) => {
  try {
    const { studentId } = req.params;

    const snapshot = await db.collection("sneha_homework_submissions")
      .where("studentId", "==", studentId)
      .orderBy("submittedAt", "desc")
      .limit(100).get();

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch homework submissions");
  }
});

/* ----------------------------- FEES & PAYMENTS -------------------------- */

// Delete a fee plan
sneha.delete("/fee-plans/:id", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Admin access required");
    const { id } = req.params;

    // Check if fee plan exists
    const feePlanDoc = await db.collection("sneha_fee_plans").doc(id).get();
    assert(feePlanDoc.exists, "Fee plan not found");

    const feePlanData = feePlanDoc.data();

    // Check if already deleted
    if (feePlanData.active === false) {
      return bad(res, 400, "Fee plan is already deleted");
    }

    // Check if fee plan is assigned to any students
    const studentsWithPlan = await db.collection("sneha_students")
      .where("feePlan.feePlanId", "==", id)
      .limit(1)
      .get();

    if (!studentsWithPlan.empty) {
      return bad(res, 400, "Cannot delete fee plan that is assigned to students. Please remove it from all students first.");
    }

    // Soft delete the fee plan
    await db.collection("sneha_fee_plans").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: req.user.uid
    });

    // Log activity
    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "deleted_fee_plan",
      entityType: "fee_plan",
      entityId: id,
      entityName: feePlanData.name || "Unknown",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: { feePlanId: id, name: feePlanData.name }
    });

    return ok(res, { message: "Fee plan deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete fee plan");
  }
});

// Delete a payment
sneha.delete("/students/:studentId/fees/payments/:paymentId", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { studentId, paymentId } = req.params;

    const doc = await db.collection("sneha_students")
      .doc(studentId)
      .collection("sneha_fee_payments")
      .doc(paymentId)
      .get();

    if (!doc.exists) {
      return bad(res, 404, "Payment not found");
    }

    await db.collection("sneha_students")
      .doc(studentId)
      .collection("sneha_fee_payments")
      .doc(paymentId)
      .delete();

    return ok(res, { message: "Payment deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete payment");
  }
});

/* ----------------------------- LOGS ------------------------------------- */

sneha.get("/logs/recent", async (req, res) => {
  try {
    const snapshot = await db.collection("sneha_logs").orderBy("timestamp", "desc").limit(20).get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single log by ID
sneha.get("/logs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_logs").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Log not found");
    }

    const log = { id: doc.id, ...doc.data() };
    return ok(res, log);
  } catch (error) {
    return bad(res, 500, error.message || "Failed to fetch log");
  }
});

// Delete a log
sneha.delete("/logs/:id", async (req, res) => {
  try {
    assert(req.user.role === "admin", "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_logs").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Log not found");
    }

    await db.collection("sneha_logs").doc(id).delete();
    return ok(res, { message: "Log deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message || "Failed to delete log");
  }
});

/* ----------------------------- MESSAGES --------------------------------- */

// Create a message (supports frontend schema)
sneha.post("/messages", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const {
      title, content, type, priority,
      recipientType, recipientIds, batchId, studentId, board, standard,
      expiresAt,
      // Also support old schema
      subject, body, recipientId
    } = req.body;

    // Support both schemas
    const messageTitle = title || subject;
    const messageContent = content || body;

    assert(messageTitle && messageContent, "title/subject and content/body are required");

    // Build recipient list based on recipientType
    let finalRecipientIds = [];

    if (recipientType === "all") {
      const studentsSnapshot = await db.collection("sneha_students").where("active", "==", true).get();
      finalRecipientIds = studentsSnapshot.docs.map(doc => doc.id);
    } else if (recipientType === "batch" && batchId) {
      const batchDoc = await db.collection("sneha_batches").doc(batchId).get();
      if (batchDoc.exists) {
        finalRecipientIds = batchDoc.data().studentIds || [];
      }
    } else if (recipientType === "student" && studentId) {
      finalRecipientIds = [studentId];
    } else if (recipientType === "board" && board) {
      const studentsSnapshot = await db.collection("sneha_students")
        .where("active", "==", true)
        .where("board", "==", board)
        .get();
      finalRecipientIds = studentsSnapshot.docs.map(doc => doc.id);
    } else if (recipientType === "standard" && standard) {
      const studentsSnapshot = await db.collection("sneha_students")
        .where("active", "==", true)
        .where("standard", "==", parseIntSafe(standard))
        .get();
      finalRecipientIds = studentsSnapshot.docs.map(doc => doc.id);
    } else if (recipientIds && recipientIds.length > 0) {
      finalRecipientIds = recipientIds;
    } else if (recipientId) {
      // Old schema support
      finalRecipientIds = [recipientId];
    }

    const messageData = {
      title: messageTitle,
      content: messageContent,
      type: type || "notice",
      priority: priority || "medium",
      recipientType: recipientType || "student",
      recipientIds: finalRecipientIds,
      batchId: batchId || null,
      studentId: studentId || null,
      board: board || null,
      standard: standard ? parseIntSafe(standard) : null,
      createdBy: req.user.uid,
      createdByName: req.user.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
      isActive: true,
      readBy: []
    };

    const ref = await db.collection("sneha_messages").add(messageData);

    return ok(res, {
      messageId: ref.id,
      message: "Message sent successfully",
      recipientCount: finalRecipientIds.length
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// Get messages (filter by recipientId, type, priority, etc.)
sneha.get("/messages", async (req, res) => {
  try {
    const { recipientId, status, type, priority, limit, isActive } = req.query;
    let query = db.collection("sneha_messages");

    // Filter by active status (default to true)
    if (isActive !== "false") {
      query = query.where("isActive", "==", true);
    }

    const snapshot = await query.limit(parseLimit(limit, 100)).get();
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter in memory to avoid composite index requirements
    if (recipientId) {
      items = items.filter(m =>
        m.recipientIds && m.recipientIds.includes(recipientId) ||
        m.recipientId === recipientId
      );
    }
    if (status === "unread" && recipientId) {
      items = items.filter(m => !m.readBy || !m.readBy.includes(recipientId));
    }
    if (status === "read" && recipientId) {
      items = items.filter(m => m.readBy && m.readBy.includes(recipientId));
    }
    if (type) {
      items = items.filter(m => m.type === type);
    }
    if (priority) {
      items = items.filter(m => m.priority === priority);
    }

    // Sort by createdAt desc
    items.sort(sortByCreatedAtDesc);

    return ok(res, { items, total: items.length });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get messages for a specific user
sneha.get("/messages/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit } = req.query;

    const snapshot = await db.collection("sneha_messages")
      .where("isActive", "==", true)
      .limit(parseLimit(limit, 100))
      .get();

    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter messages where user is recipient
    items = items.filter(m =>
      (m.recipientIds && m.recipientIds.includes(userId)) ||
      m.recipientId === userId ||
      m.recipientType === "all"
    );

    // Filter by read status
    if (status === "unread") {
      items = items.filter(m => !m.readBy || !m.readBy.includes(userId));
    } else if (status === "read") {
      items = items.filter(m => m.readBy && m.readBy.includes(userId));
    }

    // Sort by createdAt desc
    items.sort(sortByCreatedAtDesc);

    // Calculate unread count
    const unreadCount = items.filter(m => !m.readBy || !m.readBy.includes(userId)).length;

    return ok(res, { items, unreadCount, total: items.length });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get message statistics
sneha.get("/messages/stats", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { userId, dateFrom, dateTo } = req.query;

    const snapshot = await db.collection("sneha_messages").get();
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date if provided
    if (dateFrom || dateTo) {
      items = items.filter(m => {
        const createdAt = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : new Date(0);
        if (dateFrom && createdAt < new Date(dateFrom)) return false;
        if (dateTo && createdAt > new Date(dateTo)) return false;
        return true;
      });
    }

    // Calculate stats
    const total = items.length;
    const byPriority = { urgent: 0, high: 0, medium: 0, normal: 0, low: 0 };
    const byType = { notice: 0, announcement: 0, alert: 0, reminder: 0 };
    const byRecipientType = { all: 0, batch: 0, student: 0, standard: 0, board: 0 };

    items.forEach(m => {
      if (m.priority && byPriority.hasOwnProperty(m.priority)) byPriority[m.priority]++;
      if (m.type && byType.hasOwnProperty(m.type)) byType[m.type]++;
      if (m.recipientType && byRecipientType.hasOwnProperty(m.recipientType)) byRecipientType[m.recipientType]++;
    });

    return ok(res, {
      stats: {
        total,
        byPriority,
        byType,
        byRecipientType
      }
    });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Get a single message
sneha.get("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_messages").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Message not found");
    }

    return ok(res, { id: doc.id, ...doc.data() });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Update a message
sneha.put("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, content, type, priority, isActive } = req.body;

    const doc = await db.collection("sneha_messages").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Message not found");
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;
    if (priority !== undefined) updates.priority = priority;
    if (isActive !== undefined) updates.isActive = isActive;

    await db.collection("sneha_messages").doc(id).update(updates);
    return ok(res, { message: "Message updated successfully" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Mark message as read
sneha.post("/messages/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const doc = await db.collection("sneha_messages").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Message not found");
    }

    // Add user to readBy array
    await db.collection("sneha_messages").doc(id).update({
      readBy: admin.firestore.FieldValue.arrayUnion(userId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { message: "Message marked as read" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Bulk send messages
sneha.post("/messages/bulk", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const {
      title, content, type, priority,
      recipientIds, recipientType, batchId
    } = req.body;

    assert(title && content, "title and content are required");
    assert(recipientIds || batchId || recipientType, "recipientIds, batchId, or recipientType required");

    let finalRecipientIds = [];

    if (recipientType === "batch" && batchId) {
      const batchDoc = await db.collection("sneha_batches").doc(batchId).get();
      if (batchDoc.exists) {
        finalRecipientIds = batchDoc.data().studentIds || [];
      }
    } else if (recipientIds && recipientIds.length > 0) {
      finalRecipientIds = recipientIds;
    }

    if (finalRecipientIds.length === 0) {
      return bad(res, 400, "No recipients found");
    }

    const messageData = {
      title,
      content,
      type: type || "notice",
      priority: priority || "medium",
      recipientType: recipientType || "student",
      recipientIds: finalRecipientIds,
      batchId: batchId || null,
      createdBy: req.user.uid,
      createdByName: req.user.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      readBy: []
    };

    const ref = await db.collection("sneha_messages").add(messageData);

    return ok(res, {
      messageId: ref.id,
      message: "Bulk message sent successfully",
      sentCount: finalRecipientIds.length
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// Delete a message
sneha.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_messages").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Message not found");
    }

    await db.collection("sneha_messages").doc(id).delete();
    return ok(res, { message: "Message deleted successfully" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- MATERIALS -------------------------------- */

// Create a study material
sneha.post("/materials", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { title, subject, board, standard, type, url, description } = req.body;
    assert(title && url, "title and url are required");

    const ref = await db.collection("sneha_materials").add({
      title,
      subject: subject || "",
      board: board || "",
      standard: standard ? parseIntSafe(standard) : null,
      type: type || "pdf",
      url,
      description: description || "",
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid
    });

    return ok(res, { materialId: ref.id, message: "Material uploaded successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// Get materials (filter by board, standard, type)
sneha.get("/materials", async (req, res) => {
  try {
    const { board, standard, type, subject, limit } = req.query;
    let query = db.collection("sneha_materials").where("active", "==", true);

    if (board) query = query.where("board", "==", board);
    if (standard) query = query.where("standard", "==", parseIntSafe(standard));
    if (subject) query = query.where("subject", "==", subject);

    const snapshot = await query.limit(parseLimit(limit, 100)).get();
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by type in memory if specified (avoid composite index)
    if (type && type !== "all") {
      items = items.filter(m => m.type === type);
    }

    // Sort by createdAt desc
    items.sort(sortByCreatedAtDesc);

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get a single material
sneha.get("/materials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("sneha_materials").doc(id).get();

    if (!doc.exists) {
      return bad(res, 404, "Material not found");
    }

    return ok(res, { id: doc.id, ...doc.data() });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Update a material
sneha.put("/materials/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;
    const { title, subject, board, standard, type, url, description } = req.body;

    const doc = await db.collection("sneha_materials").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Material not found");
    }

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (board !== undefined) updates.board = board;
    if (standard !== undefined) updates.standard = parseIntSafe(standard);
    if (type !== undefined) updates.type = type;
    if (url !== undefined) updates.url = url;
    if (description !== undefined) updates.description = description;

    await db.collection("sneha_materials").doc(id).update(updates);
    return ok(res, { message: "Material updated successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Delete a material (soft delete)
sneha.delete("/materials/:id", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    const { id } = req.params;

    const doc = await db.collection("sneha_materials").doc(id).get();
    if (!doc.exists) {
      return bad(res, 404, "Material not found");
    }

    await db.collection("sneha_materials").doc(id).update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return ok(res, { message: "Material deleted successfully" });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

/* ----------------------------- STUDENT ATTENDANCE ----------------------- */

// Get attendance records for a specific student
sneha.get("/attendance/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let query = db.collection("sneha_att_marks").where("studentId", "==", studentId);

    const snapshot = await query.limit(500).get();
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date range in memory
    if (startDate || endDate) {
      items = items.filter(item => {
        const itemDate = item.date || "";
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        return true;
      });
    }

    // Sort by date desc
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- DAILY ATTENDANCE ------------------------- */

// 1. GET Daily Attendance - Fetch all attendance records for a session on a date
sneha.get("/attendance/daily", async (req, res) => {
  try {
    const { sessionId, date } = req.query;
    
    // Validate required parameters
    assert(sessionId && sessionId.trim().length > 0, "sessionId is required");
    assert(date && date.trim().length > 0, "date is required in YYYY-MM-DD format");
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    assert(dateRegex.test(date), "date must be in YYYY-MM-DD format");

    // Query Firestore for attendance records
    const snapshot = await db.collection("sneha_daily_attendance")
      .where("sessionId", "==", sessionId)
      .where("date", "==", date)
      .get();

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return ok(res, { items });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// 2. POST Bulk Save/Update Daily Attendance - Upsert multiple records
sneha.post("/attendance/daily/bulk", async (req, res) => {
  try {
    const { records } = req.body;
    
    // Validate input
    assert(records && Array.isArray(records), "records must be an array");
    assert(records.length > 0, "records array cannot be empty");
    
    // Validate each record has required fields
    records.forEach((record, index) => {
      assert(record.id, `Record at index ${index} must have an id`);
      assert(record.sessionId, `Record at index ${index} must have a sessionId`);
      assert(record.date, `Record at index ${index} must have a date`);
      assert(record.studentId, `Record at index ${index} must have a studentId`);
      assert(record.status, `Record at index ${index} must have a status`);
    });

    // Use batch writes for efficiency
    const batch = db.batch();
    
    records.forEach(record => {
      // Use the composite key ID provided by frontend
      const docRef = db.collection("sneha_daily_attendance").doc(record.id);
      
      // Upsert: create or update with merge
      batch.set(docRef, {
        sessionId: record.sessionId,
        date: record.date,
        studentId: record.studentId,
        status: record.status,
        markedAt: record.markedAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    // Commit the batch
    await batch.commit();

    return ok(res, {
      message: "Attendance saved successfully",
      saved: records.length
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// 3. GET Student's Daily Attendance - For student dashboard
sneha.get("/attendance/daily/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Validate studentId
    assert(studentId && studentId.trim().length > 0, "studentId is required");

    // Query all attendance records for this student
    const snapshot = await db.collection("sneha_daily_attendance")
      .where("studentId", "==", studentId)
      .orderBy("date", "desc")
      .get();

    // Map records and optionally fetch session details for subject
    const items = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Try to fetch session to get subject name
      let subject = null;
      if (data.sessionId) {
        try {
          const sessionDoc = await db.collection("sneha_att_sessions").doc(data.sessionId).get();
          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            subject = sessionData.subject || null;
          }
        } catch (err) {
          console.warn(`Could not fetch session ${data.sessionId} for subject:`, err);
        }
      }
      
      return {
        id: doc.id,
        ...data,
        subject
      };
    }));

    return ok(res, { items });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

/* ----------------------------- ATTENDANCE ANALYTICS --------------------- */

// Get attendance analytics
sneha.get("/attendance/analytics", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    
    const { studentId, batchId, startDate, endDate } = req.query;

    let query = db.collection("sneha_daily_attendance");

    if (studentId) {
      query = query.where("studentId", "==", studentId);
    }

    if (batchId) {
      // Would need sessionId-batchId mapping, skip for now
    }

    const snapshot = await query.get();
    let records = snapshot.docs.map(d => d.data());

    // Filter by date range
    if (startDate || endDate) {
      records = records.filter(record => {
        if (startDate && record.date < startDate) return false;
        if (endDate && record.date > endDate) return false;
        return true;
      });
    }

    // Calculate summary
    const totalDays = records.length;
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    const percentage = totalDays > 0 ? (present / totalDays) * 100 : 0;

    // Analyze patterns
    const dayCount = {};
    records.filter(r => r.status === "absent").forEach(record => {
      const date = new Date(record.date);
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });

    const frequentAbsentDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => day);

    // Check for consecutive absences
    const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    sortedRecords.forEach(record => {
      if (record.status === "absent") {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    });

    // Determine trend
    const recent = records.slice(-10);
    const older = records.slice(-20, -10);
    const recentPercentage = recent.length > 0 ? (recent.filter(r => r.status === "present").length / recent.length) * 100 : 0;
    const olderPercentage = older.length > 0 ? (older.filter(r => r.status === "present").length / older.length) * 100 : 0;
    
    let trend = "stable";
    if (recentPercentage > olderPercentage + 5) trend = "improving";
    else if (recentPercentage < olderPercentage - 5) trend = "declining";

    const summary = {
      totalDays,
      present,
      absent,
      late,
      percentage: Math.round(percentage * 100) / 100
    };

    const patterns = {
      frequentAbsentDays,
      consecutiveAbsences: maxConsecutive,
      trend
    };

    const alerts = [];
    if (percentage < 75) {
      alerts.push({
        type: "low_attendance",
        message: "Attendance below 75%",
        severity: "high"
      });
    }
    if (maxConsecutive >= 3) {
      alerts.push({
        type: "consecutive_absences",
        message: `${maxConsecutive} consecutive absences detected`,
        severity: "high"
      });
    }

    return ok(res, { summary, patterns, alerts });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Get low attendance students
sneha.get("/attendance/low-attendance", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    
    const { threshold, board, standard } = req.query;
    const thresholdValue = Number(threshold) || 75;

    // Get all students
    let studentQuery = db.collection("sneha_students").where("active", "==", true);
    
    if (board) studentQuery = studentQuery.where("board", "==", board);
    if (standard) studentQuery = studentQuery.where("standard", "==", Number(standard));

    const studentsSnapshot = await studentQuery.get();
    
    const items = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;

      // Get attendance records
      const attendanceSnapshot = await db.collection("sneha_daily_attendance")
        .where("studentId", "==", studentId)
        .get();

      const records = attendanceSnapshot.docs.map(d => d.data());
      const totalDays = records.length;
      
      if (totalDays === 0) continue;

      const present = records.filter(r => r.status === "present").length;
      const absent = records.filter(r => r.status === "absent").length;
      const percentage = (present / totalDays) * 100;

      if (percentage < thresholdValue) {
        // Check consecutive absences
        const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        
        sortedRecords.forEach(record => {
          if (record.status === "absent") {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        });

        // Find last attended date
        const lastPresentRecord = sortedRecords
          .reverse()
          .find(r => r.status === "present");

        items.push({
          studentId,
          studentName: studentData.name,
          attendancePercentage: Math.round(percentage * 100) / 100,
          totalDays,
          present,
          absent,
          consecutiveAbsences: maxConsecutive,
          lastAttended: lastPresentRecord ? lastPresentRecord.date : null
        });
      }
    }

    // Sort by attendance percentage ascending
    items.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    return ok(res, { items });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Get monthly attendance report
sneha.get("/attendance/monthly-report", async (req, res) => {
  try {
    const { studentId, month, batchId } = req.query;

    // Default to current month
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM

    let query = db.collection("sneha_daily_attendance");

    if (studentId) {
      query = query.where("studentId", "==", studentId);
    }

    const snapshot = await query.get();
    let records = snapshot.docs.map(d => d.data());

    // Filter by month
    records = records.filter(record => record.date && record.date.startsWith(targetMonth));

    // Build calendar object
    const calendar = {};
    records.forEach(record => {
      calendar[record.date] = record.status;
    });

    // Calculate summary
    const totalDays = records.length;
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100 * 100) / 100 : 0;

    const summary = {
      totalDays,
      present,
      absent,
      late,
      percentage
    };

    return ok(res, {
      month: targetMonth,
      studentId: studentId || null,
      calendar,
      summary
    });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- STUDENT TEST RESULTS --------------------- */

// Get all test results for a specific student
sneha.get("/students/:studentId/test-results", async (req, res) => {
  try {
    const { studentId } = req.params;

    // First check if studentId is a userId and get the actual student document
    let actualStudentId = studentId;
    const studentByUserId = await db.collection("sneha_students")
      .where("userId", "==", studentId)
      .limit(1)
      .get();

    if (!studentByUserId.empty) {
      actualStudentId = studentByUserId.docs[0].id;
    }

    // Query test results by studentId
    const snapshot = await db.collection("sneha_test_results")
      .where("studentId", "==", actualStudentId)
      .get();

    // Also check by userId in case it was stored that way
    const snapshotByUserId = await db.collection("sneha_test_results")
      .where("studentId", "==", studentId)
      .get();

    const itemsMap = new Map();

    snapshot.docs.forEach(d => {
      itemsMap.set(d.id, { id: d.id, ...d.data() });
    });
    snapshotByUserId.docs.forEach(d => {
      itemsMap.set(d.id, { id: d.id, ...d.data() });
    });

    const items = Array.from(itemsMap.values());

    // Sort by submittedAt desc
    items.sort((a, b) => {
      const tA = a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : 0;
      const tB = b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : 0;
      return tB - tA;
    });

    return ok(res, { items });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- NOTIFICATIONS ---------------------------- */

// Get user notifications
sneha.get("/notifications", async (req, res) => {
  try {
    const { type, unreadOnly, limit } = req.query;
    const userId = req.user.uid;

    let query = db.collection("sneha_notifications")
      .where("userId", "==", userId);

    if (type) {
      query = query.where("type", "==", type);
    }

    if (unreadOnly === "true") {
      query = query.where("isRead", "==", false);
    }

    query = query.orderBy("createdAt", "desc");
    query = query.limit(Number(limit) || 50);

    const snapshot = await query.get();
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get unread count
    const unreadSnapshot = await db.collection("sneha_notifications")
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();

    return ok(res, { 
      items, 
      unreadCount: unreadSnapshot.size 
    });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Mark notification as read
sneha.put("/notifications/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;

    const doc = await db.collection("sneha_notifications").doc(notificationId).get();
    if (!doc.exists) {
      return bad(res, 404, "Notification not found");
    }

    // Verify ownership
    if (doc.data().userId !== req.user.uid) {
      return bad(res, 403, "Forbidden");
    }

    await db.collection("sneha_notifications").doc(notificationId).update({
      isRead: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { message: "Notification marked as read" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Mark all notifications as read
sneha.put("/notifications/mark-all-read", async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db.collection("sneha_notifications")
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    return ok(res, { 
      message: "All notifications marked as read",
      count: snapshot.size
    });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Get unread count
sneha.get("/notifications/unread-count", async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db.collection("sneha_notifications")
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .get();

    return ok(res, { unreadCount: snapshot.size });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

// Delete notification
sneha.delete("/notifications/:notificationId", async (req, res) => {
  try {
    const { notificationId } = req.params;

    const doc = await db.collection("sneha_notifications").doc(notificationId).get();
    if (!doc.exists) {
      return bad(res, 404, "Notification not found");
    }

    // Verify ownership
    if (doc.data().userId !== req.user.uid) {
      return bad(res, 403, "Forbidden");
    }

    await db.collection("sneha_notifications").doc(notificationId).delete();

    return ok(res, { message: "Notification deleted" });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- LEAVE MANAGEMENT ------------------------- */

// Apply for leave
sneha.post("/leaves", async (req, res) => {
  try {
    const { studentId, startDate, endDate, reason, appliedBy, supportingDocument } = req.body;

    assert(studentId && startDate && endDate && reason, 
      "studentId, startDate, endDate, and reason are required");

    // Verify student exists
    const studentDoc = await db.collection("sneha_students").doc(studentId).get();
    if (!studentDoc.exists) {
      return bad(res, 404, "Student not found");
    }

    const ref = await db.collection("sneha_leaves").add({
      studentId,
      studentName: studentDoc.data().name,
      startDate,
      endDate,
      reason,
      appliedBy: appliedBy || "student", // student | parent
      supportingDocument: supportingDocument || null,
      status: "pending", // pending | approved | rejected
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      appliedByUserId: req.user.uid
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: "applied_leave",
      entityType: "leave",
      entityId: ref.id,
      details: { studentId, startDate, endDate },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { 
      leaveId: ref.id, 
      status: "pending",
      message: "Leave application submitted successfully" 
    });
  } catch (error) {
    return bad(res, error.isBad ? 400 : 500, error.message);
  }
});

// Get leave applications
sneha.get("/leaves", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    
    const { status, studentId, startDate, endDate } = req.query;

    let query = db.collection("sneha_leaves");

    if (status) {
      query = query.where("status", "==", status);
    }

    if (studentId) {
      query = query.where("studentId", "==", studentId);
    }

    query = query.orderBy("appliedAt", "desc").limit(100);

    const snapshot = await query.get();
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date range in memory if needed
    if (startDate || endDate) {
      items = items.filter(item => {
        if (startDate && item.startDate < startDate) return false;
        if (endDate && item.endDate > endDate) return false;
        return true;
      });
    }

    return ok(res, { items });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Approve/Reject leave
sneha.put("/leaves/:leaveId/status", async (req, res) => {
  try {
    assert(isTeacherOrAdmin(req.user.role), "Forbidden");
    
    const { leaveId } = req.params;
    const { status, remarks } = req.body;

    assert(status && ["approved", "rejected"].includes(status), 
      "status must be 'approved' or 'rejected'");

    const doc = await db.collection("sneha_leaves").doc(leaveId).get();
    if (!doc.exists) {
      return bad(res, 404, "Leave application not found");
    }

    await db.collection("sneha_leaves").doc(leaveId).update({
      status,
      remarks: remarks || "",
      approvedBy: req.user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("sneha_logs").add({
      userId: req.user.uid,
      action: `leave_${status}`,
      entityType: "leave",
      entityId: leaveId,
      details: { status, remarks },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return ok(res, { 
      message: `Leave ${status} successfully`,
      status
    });
  } catch (error) {
    return bad(res, error.isBad ? 403 : 500, error.message);
  }
});

// Get student leave history
sneha.get("/students/:studentId/leaves", async (req, res) => {
  try {
    const { studentId } = req.params;

    const snapshot = await db.collection("sneha_leaves")
      .where("studentId", "==", studentId)
      .orderBy("appliedAt", "desc")
      .get();

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Calculate stats
    const stats = {
      totalLeaves: items.length,
      approved: items.filter(i => i.status === "approved").length,
      pending: items.filter(i => i.status === "pending").length,
      rejected: items.filter(i => i.status === "rejected").length,
      totalDays: items.reduce((sum, item) => {
        if (item.status !== "approved") return sum;
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0)
    };

    return ok(res, { items, stats });
  } catch (error) {
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- STUDENT ANALYTICS ------------------------ */

// Get dashboard overview stats for a student
sneha.get("/analytics/student/:studentId/overview", async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student profile (try by userId first, then by doc ID)
    let student = null;
    let actualStudentId = studentId;

    const studentByUserId = await db.collection("sneha_students")
      .where("userId", "==", studentId)
      .limit(1)
      .get();

    if (!studentByUserId.empty) {
      student = { id: studentByUserId.docs[0].id, ...studentByUserId.docs[0].data() };
      actualStudentId = student.id;
    } else {
      const studentDoc = await db.collection("sneha_students").doc(studentId).get();
      if (studentDoc.exists) {
        student = { id: studentDoc.id, ...studentDoc.data() };
      }
    }

    if (!student) {
      return bad(res, 404, "Student not found");
    }

    // Get homework assigned to student
    const homeworkSnapshot = await db.collection("sneha_homework")
      .where("active", "==", true)
      .get();

    // Filter homework assigned to this student
    const assignedHomework = homeworkSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.assignTo && data.assignTo.includes(actualStudentId);
    });
    const totalHomework = assignedHomework.length;

    // Get submissions by student
    const submissionsSnapshot = await db.collection("sneha_submissions")
      .where("studentId", "==", actualStudentId)
      .get();
    const submittedHomeworkIds = new Set(submissionsSnapshot.docs.map(d => d.data().homeworkId));
    const pendingHomework = totalHomework - submittedHomeworkIds.size;

    // Get tests for student's board/standard
    let totalTests = 0;
    if (student.board && student.standard) {
      const testsSnapshot = await db.collection("sneha_tests")
        .where("active", "==", true)
        .where("board", "==", student.board)
        .where("standard", "==", student.standard)
        .get();
      totalTests = testsSnapshot.size;
    }

    // Get test results and calculate average
    const resultsSnapshot = await db.collection("sneha_test_results")
      .where("studentId", "==", actualStudentId)
      .get();

    let averageMarks = 0;
    if (!resultsSnapshot.empty) {
      const total = resultsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const percentage = data.percentage || ((data.marksObtained / data.maxMarks) * 100);
        return sum + percentage;
      }, 0);
      averageMarks = total / resultsSnapshot.size;
    }

    // Get attendance for current month
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const attendanceSnapshot = await db.collection("sneha_att_marks")
      .where("studentId", "==", actualStudentId)
      .get();

    const thisMonthAttendance = attendanceSnapshot.docs.filter(d => {
      const data = d.data();
      return data.date && data.date >= startOfMonth;
    });

    const presentCount = thisMonthAttendance.filter(d => d.data().status === "present").length;
    const attendancePercentage = thisMonthAttendance.length > 0
      ? (presentCount / thisMonthAttendance.length) * 100
      : 0;

    // Get unread messages
    const messagesSnapshot = await db.collection("sneha_messages")
      .where("recipientId", "==", studentId)
      .where("status", "==", "unread")
      .get();
    const unreadMessages = messagesSnapshot.size;

    return ok(res, {
      totalHomework,
      pendingHomework: Math.max(0, pendingHomework),
      totalTests,
      averageMarks: Math.round(averageMarks * 10) / 10,
      attendancePercentage: Math.round(attendancePercentage),
      unreadMessages
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return bad(res, 500, error.message);
  }
});

/* ----------------------------- PUBLIC ROUTES ------------------------------ */

// Import syllabus routes
const syllabusRoutes = require('./routes/syllabus');

// Mount public syllabus routes (no authentication required)
app.use("/api/syllabus", syllabusRoutes);

// Mount authenticated routes under /api/v1
app.use("/api/v1", sneha);

exports.sneha = functions.onRequest({ cors: true }, app);