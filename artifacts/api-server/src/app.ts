import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { seedStore, loadStore, migrateCEStudents, migrateCETeachers, migrateCEDivisionA } from "./store.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "campus-attendance-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", router);

loadStore();
seedStore()
  .then(() => migrateCEStudents())
  .then(() => migrateCETeachers())
  .then(() => migrateCEDivisionA())
  .then(() => {
    logger.info("Demo accounts seeded + CE-Y2-B + CE teachers + CE-Y2-A done");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to seed/migrate store");
  });

export default app;
