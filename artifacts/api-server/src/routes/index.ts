import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import sessionsRouter from "./sessions.js";
import attendanceRouter from "./attendance.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/sessions", sessionsRouter);
router.use("/attendance", attendanceRouter);

export default router;
