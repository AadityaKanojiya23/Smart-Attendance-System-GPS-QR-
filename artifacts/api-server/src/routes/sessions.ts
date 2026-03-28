import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.post("/", requireAuth, requireRole("teacher"), (req, res) => {
  const { teacherId, className, latitude, longitude, qrToken, expiresAt } = req.body as {
    teacherId: string;
    className: string;
    latitude: number;
    longitude: number;
    qrToken: string;
    expiresAt: string;
  };

  if (!teacherId || !className || !qrToken || !expiresAt) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const store = getStore();
  const session = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    teacherId,
    className,
    latitude,
    longitude,
    qrToken,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  store.sessions.push(session);
  res.json(session);
});

router.get("/active", requireAuth, (req, res) => {
  const store = getStore();
  const now = new Date();
  const active = store.sessions.filter((s) => new Date(s.expiresAt) > now);
  res.json(active);
});

router.get("/my", requireAuth, requireRole("teacher"), (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const sessions = store.sessions.filter((s) => s.teacherId === userId);
  res.json(sessions.slice().reverse());
});

router.get("/:id/attendance", requireAuth, (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const currentUser = store.users.find((u) => u.id === userId);
  if (!currentUser || (currentUser.role !== "teacher" && currentUser.role !== "admin")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const records = store.attendance.filter((a) => a.sessionId === req.params.id);
  res.json(records);
});

export default router;
