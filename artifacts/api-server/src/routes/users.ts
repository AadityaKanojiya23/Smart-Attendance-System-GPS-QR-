import { Router, type IRouter } from "express";
import { getStore } from "../store.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const store = getStore();
  const users = store.users.map(({ passwordHash: _, ...u }) => u);
  res.json(users);
});

export default router;
