import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const users = store.users.map(({ passwordHash: _, ...u }) => u);
  res.json(users);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role, department, className } = req.body as {
    name: string;
    email: string;
    password: string;
    role: "teacher" | "student";
    department?: string;
    className?: string;
  };

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Name, email, password and role are required" });
    return;
  }
  if (!["teacher", "student"].includes(role)) {
    res.status(400).json({ error: "Role must be teacher or student" });
    return;
  }

  const store = getStore();
  const existing = store.users.find((u) => u.email === email);
  if (existing) {
    res.status(400).json({ error: "A user with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    department: department?.trim(),
    className: className?.trim(),
    passwordHash,
  };
  store.users.push(user);

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = store.users[idx];
  const { name, className, department, password } = req.body as {
    name?: string; className?: string; department?: string; password?: string;
  };
  if (name) user.name = name.trim();
  if (className !== undefined) user.className = className.trim();
  if (department !== undefined) user.department = department.trim();
  if (password && password.length >= 6) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = store.users[idx];
  if (user.role === "admin") {
    res.status(400).json({ error: "Cannot delete admin account" });
    return;
  }

  if (user.role === "student") {
    store.attendance = store.attendance.filter((a) => a.studentId !== user.id);
  }

  if (user.role === "teacher") {
    const teacherSessionIds = store.sessions
      .filter((s) => s.teacherId === user.id)
      .map((s) => s.id);
    store.sessions = store.sessions.filter((s) => s.teacherId !== user.id);
    store.attendance = store.attendance.filter((a) => !teacherSessionIds.includes(a.sessionId));
  }

  store.users.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
