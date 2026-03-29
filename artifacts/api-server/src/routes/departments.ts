import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, (req, res) => {
  const store = getStore();
  res.json(store.departments);
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, code } = req.body as { name: string; code: string };
  if (!name || !code) {
    res.status(400).json({ error: "Name and code are required" });
    return;
  }
  const store = getStore();
  const exists = store.departments.find(
    (d) => d.name.toLowerCase() === name.toLowerCase() || d.code.toUpperCase() === code.toUpperCase()
  );
  if (exists) {
    res.status(400).json({ error: "Department with this name or code already exists" });
    return;
  }
  const dept = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    code: code.trim().toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  store.departments.push(dept);
  res.json(dept);
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const dept = store.departments.find((d) => d.id === req.params.id);
  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  // Collect all classes in this department
  const deptClasses = store.classes.filter((c) => c.departmentId === dept.id);
  const classNames = deptClasses.map((c) => `${c.departmentCode}-Y${c.year}-${c.division}`);

  // Collect all users in this department
  const deptUsers = store.users.filter((u) => u.departmentId === dept.id || classNames.includes(u.className ?? ""));
  const deptUserIds = deptUsers.map((u) => u.id);
  const teacherIds = deptUsers.filter((u) => u.role === "teacher").map((u) => u.id);

  // Collect all sessions created by those teachers
  const sessionIds = store.sessions
    .filter((s) => teacherIds.includes(s.teacherId))
    .map((s) => s.id);

  // Cascade delete
  store.attendance = store.attendance.filter(
    (a) => !deptUserIds.includes(a.studentId) && !sessionIds.includes(a.sessionId)
  );
  store.sessions = store.sessions.filter((s) => !teacherIds.includes(s.teacherId));
  store.users = store.users.filter((u) => !deptUserIds.includes(u.id));
  store.classes = store.classes.filter((c) => c.departmentId !== dept.id);
  store.departments = store.departments.filter((d) => d.id !== dept.id);

  res.json({ ok: true, removedUsers: deptUserIds.length, removedClasses: deptClasses.length });
});

export default router;
