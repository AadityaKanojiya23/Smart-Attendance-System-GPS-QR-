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

export default router;
