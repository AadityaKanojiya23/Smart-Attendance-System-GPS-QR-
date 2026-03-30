import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

const SCAN_PROXIMITY_M = 200;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.post("/", requireAuth, requireRole("student"), (req, res) => {
  const { qrToken, latitude, longitude } = req.body as { qrToken: string; latitude?: number; longitude?: number };

  const userId = (req.session as any).userId;
  const store = getStore();
  const student = store.users.find((u) => u.id === userId);

  if (!student) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = store.sessions.find((s) => s.qrToken === qrToken);
  if (!session) {
    res.status(404).json({ error: "Invalid QR code. Session not found." });
    return;
  }

  if (new Date(session.expiresAt) < new Date()) {
    res.status(400).json({ error: "This session has expired. Ask your teacher to start a new one." });
    return;
  }

  if (latitude == null || longitude == null ||
      typeof latitude !== "number" || typeof longitude !== "number" ||
      !isFinite(latitude) || !isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: "Valid location required. Please enable GPS to mark attendance." });
    return;
  }

  if (session.latitude != null && session.longitude != null) {
    const distance = haversineDistance(latitude, longitude, session.latitude, session.longitude);
    if (distance > SCAN_PROXIMITY_M) {
      res.status(400).json({
        error: `You are too far from the class. You are ${Math.round(distance)}m away — must be within ${SCAN_PROXIMITY_M}m.`,
      });
      return;
    }
  }

  if (student.className !== session.className) {
    res.status(400).json({ error: `Class mismatch. You are in ${student.className}, but this session is for ${session.className}.` });
    return;
  }

  // Subject check: if session has a subject and student has enrolled subjects, verify match
  if (session.subject && student.subjects && student.subjects.length > 0) {
    if (!student.subjects.includes(session.subject)) {
      res.status(400).json({ error: `Subject not assigned. This session is for ${session.subject}, which is not in your enrolled subjects.` });
      return;
    }
  }

  const blockedStudents = (session as any).blockedStudents ?? [];
  if (blockedStudents.includes(userId)) {
    res.status(403).json({ error: "You are blocked for this session." });
    return;
  }

  const alreadyMarked = store.attendance.find(
    (a) => a.sessionId === session.id && a.studentId === userId
  );
  if (alreadyMarked) {
    res.status(400).json({ error: "Attendance already marked for this session." });
    return;
  }

  // Look up teacher name to store with the record
  const teacher = store.users.find((u) => u.id === session.teacherId);

  const record = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    studentId: userId,
    studentName: student.name,
    sessionId: session.id,
    className: session.className,
    markedAt: new Date().toISOString(),
    subject: session.subject,
    lectureStart: session.lectureStart,
    lectureEnd: session.lectureEnd,
    teacherName: teacher?.name,
  };
  store.attendance.push(record);
  res.json(record);
});

router.get("/my", requireAuth, requireRole("student"), (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const records = store.attendance
    .filter((a) => a.studentId === userId)
    .slice()
    .reverse();
  res.json(records);
});

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const { className, date } = req.query as { className?: string; date?: string };

  let records = store.attendance.slice();

  if (className) {
    records = records.filter((a) => a.className === className);
  }

  if (date) {
    // date format: YYYY-MM-DD, match on local date of markedAt
    records = records.filter((a) => {
      const d = new Date(a.markedAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}` === date;
    });
  }

  res.json(records.reverse());
});

router.delete("/:id", requireAuth, requireRole("teacher"), (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const record = store.attendance.find((a) => a.id === req.params.id);

  if (!record) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  const session = store.sessions.find((s) => s.id === record.sessionId);
  if (!session || session.teacherId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  store.attendance = store.attendance.filter((a) => a.id !== req.params.id);
  
  // Also unblock the student when deleting their attendance
  const blockedStudents = (session as any).blockedStudents ?? [];
  const studentIndex = blockedStudents.indexOf(record.studentId);
  if (studentIndex > -1) {
    blockedStudents.splice(studentIndex, 1);
  }
  
  res.json({ success: true });
});

export default router;
