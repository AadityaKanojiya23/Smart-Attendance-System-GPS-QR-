import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.post("/", requireAuth, requireRole("student"), (req, res) => {
  const { qrToken } = req.body as { qrToken: string };

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
