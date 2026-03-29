import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

const YEAR_LABELS: Record<number, string> = {
  1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year",
};

router.get("/", requireAuth, (req, res) => {
  const { departmentId, year } = req.query as { departmentId?: string; year?: string };
  const store = getStore();
  let classes = store.classes;
  if (departmentId) classes = classes.filter((c) => c.departmentId === departmentId);
  if (year) classes = classes.filter((c) => c.year === parseInt(year));
  res.json(classes);
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { departmentId, year, division } = req.body as {
    departmentId: string; year: number; division: string;
  };
  if (!departmentId || !year || !division) {
    res.status(400).json({ error: "departmentId, year and division are required" });
    return;
  }
  const store = getStore();
  const dept = store.departments.find((d) => d.id === departmentId);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  const exists = store.classes.find(
    (c) => c.departmentId === departmentId && c.year === year && c.division.toUpperCase() === division.toUpperCase()
  );
  if (exists) {
    res.status(400).json({ error: "This division already exists for this year" });
    return;
  }
  const cls = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    departmentId,
    departmentCode: dept.code,
    year,
    division: division.toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  store.classes.push(cls);
  res.json(cls);
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const cls = store.classes.find((c) => c.id === req.params.id);
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const className = `${cls.departmentCode}-Y${cls.year}-${cls.division}`;
  const affectedUsers = store.users.filter((u) => u.className === className);
  const affectedUserIds = affectedUsers.map((u) => u.id);
  const teacherIds = affectedUsers.filter((u) => u.role === "teacher").map((u) => u.id);
  const sessionIds = store.sessions
    .filter((s) => teacherIds.includes(s.teacherId))
    .map((s) => s.id);

  store.attendance = store.attendance.filter(
    (a) => !affectedUserIds.includes(a.studentId) && !sessionIds.includes(a.sessionId)
  );
  store.sessions = store.sessions.filter((s) => !teacherIds.includes(s.teacherId));
  store.users = store.users.filter((u) => u.className !== className);
  store.classes = store.classes.filter((c) => c.id !== req.params.id);

  res.json({ ok: true, removed: affectedUsers.length });
});

export default router;
