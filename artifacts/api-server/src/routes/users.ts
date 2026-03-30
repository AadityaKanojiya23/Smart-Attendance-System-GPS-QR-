import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { getStore, type TeacherAssignment } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const users = store.users.map(({ passwordHash: _, ...u }) => u);
  res.json(users);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role, department, departmentId, year, division, className, subjects } = req.body as {
    name: string;
    email: string;
    password: string;
    role: "teacher" | "student";
    department?: string;
    departmentId?: string;
    year?: number;
    division?: string;
    className?: string;
    subjects?: string[];
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
  const existing = store.users.find((u) => u.email === email.trim().toLowerCase());

  // If existing teacher: add new assignment instead of error
  if (existing) {
    if (existing.role === "teacher" && role === "teacher" && className && departmentId) {
      const cleanSubjects = Array.isArray(subjects) ? subjects.filter(Boolean).map((s) => s.trim()) : [];
      const newAssignment: TeacherAssignment = {
        className: className.trim(),
        departmentId: departmentId.trim(),
        departmentCode: className.split("-")[0] ?? "",
        year: year ? Number(year) : 1,
        division: division?.trim().toUpperCase() ?? "",
        subjects: cleanSubjects,
      };
      if (!existing.assignments) existing.assignments = [];
      const alreadyAssigned = existing.assignments.some(a => a.className === newAssignment.className);
      if (!alreadyAssigned) {
        existing.assignments.push(newAssignment);
        // Merge subjects
        const allSubjects = Array.from(new Set([...(existing.subjects ?? []), ...cleanSubjects]));
        existing.subjects = allSubjects;
      }
      const { passwordHash: _, ...safeUser } = existing;
      res.json(safeUser);
      return;
    }
    res.status(400).json({ error: "A user with this email already exists" });
    return;
  }

  const cleanSubjects = Array.isArray(subjects) ? subjects.filter(Boolean).map((s) => s.trim()) : [];
  const firstAssignment: TeacherAssignment | undefined = role === "teacher" && className && departmentId ? {
    className: className.trim(),
    departmentId: departmentId.trim(),
    departmentCode: className.split("-")[0] ?? "",
    year: year ? Number(year) : 1,
    division: division?.trim().toUpperCase() ?? "",
    subjects: cleanSubjects,
  } : undefined;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    department: department?.trim(),
    departmentId: departmentId?.trim(),
    year: year ? Number(year) : undefined,
    division: division?.trim().toUpperCase(),
    className: className?.trim(),
    subjects: cleanSubjects,
    assignments: firstAssignment ? [firstAssignment] : undefined,
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
  const { name, className, department, password, subjects } = req.body as {
    name?: string; className?: string; department?: string; password?: string; subjects?: string[];
  };
  if (name) user.name = name.trim();
  if (className !== undefined) user.className = className.trim();
  if (department !== undefined) user.department = department.trim();
  if (password && password.length >= 6) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  if (Array.isArray(subjects)) {
    user.subjects = subjects.filter(Boolean).map((s: string) => s.trim());
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
