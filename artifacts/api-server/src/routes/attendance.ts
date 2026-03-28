import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { haversineDistance } from "../lib/haversine.js";

const router: IRouter = Router();

const TEACHER_PROXIMITY_M = 100;

router.post("/", requireAuth, requireRole("student"), (req, res) => {
  const { qrToken, latitude, longitude } = req.body as {
    qrToken: string;
    latitude: number;
    longitude: number;
  };

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

  if (student.className !== session.className) {
    res.status(400).json({ error: `Class mismatch. You are in ${student.className}, but this session is for ${session.className}.` });
    return;
  }

  const alreadyMarked = store.attendance.find(
    (a) => a.sessionId === session.id && a.studentId === userId
  );
  if (alreadyMarked) {
    res.status(400).json({ error: "Attendance already marked for this session." });
    return;
  }

  if (session.latitude && session.longitude && latitude && longitude) {
    const dist = haversineDistance(latitude, longitude, session.latitude, session.longitude);
    if (dist > TEACHER_PROXIMITY_M) {
      res.status(400).json({ error: `You are ${Math.round(dist)}m away from the teacher. Please be within ${TEACHER_PROXIMITY_M}m.` });
      return;
    }
  }

  const record = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    studentId: userId,
    studentName: student.name,
    sessionId: session.id,
    className: session.className,
    markedAt: new Date().toISOString(),
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
  res.json(store.attendance.slice().reverse());
});

export default router;
