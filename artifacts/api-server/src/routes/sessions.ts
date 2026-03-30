import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const CAMPUS_LAT = 19.180010063951876;
const CAMPUS_LNG = 72.98054933658015;
const CAMPUS_RADIUS_M = 1400;

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

  // Validate GPS location if provided
  if (latitude !== undefined && longitude !== undefined) {
    const distance = haversineDistance(latitude, longitude, CAMPUS_LAT, CAMPUS_LNG);
    if (distance > CAMPUS_RADIUS_M) {
      res.status(400).json({
        error: `You are not in range. Current distance: ${Math.round(distance)}m`,
      });
      return;
    }
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

router.get("/class", requireAuth, requireRole("student"), (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const student = store.users.find((u) => u.id === userId);
  if (!student || !student.className) {
    res.json([]);
    return;
  }
  const sessions = store.sessions
    .filter((s) => s.className === student.className)
    .slice()
    .reverse();
  res.json(sessions);
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
