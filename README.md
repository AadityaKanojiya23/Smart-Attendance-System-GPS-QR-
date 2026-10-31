# Smart Attendance System

Smart Attendance System is a role-based campus attendance application for administrators, teachers, and students. Teachers open time-limited attendance sessions and display a QR code. Students scan that code in the mobile app; the API validates the session, class, subject, duplicate status, and (when the phone submits coordinates) proximity to the teacher's recorded location. Administrators manage academic records and review attendance reports.

> **Current implementation note:** the API persists application records in a JSON file (`.data.json`). PostgreSQL and Drizzle packages exist in the workspace, but the live API does not currently use them. See [Persistence and database status](#persistence-and-database-status).

## Download the Android app

Scan this QR code with your phone camera, or use the direct APK link:

![QR code to download the Smart Attendance System Android APK](artifacts/mobile/apk-download-qr.png)

[Download the Android APK](https://expo.dev/artifacts/eas/ezcFZ3jCpuPdnOifgovEl8fsxDW31MmS7rupnNPMyFQ.apk)

After downloading, open the APK on Android and follow the installation prompts. The app's online features need an internet connection and an available API server.

> The linked APK is an EAS preview artifact and may expire. When publishing a newer build, replace both the URL and `artifacts/mobile/apk-download-qr.png` with the new artifact.

## Product capabilities

### Administrator

- View high-level attendance and user summaries.
- Browse and manage students and teachers.
- Create and remove departments and class divisions.
- Review attendance by class and date.
- Review class sessions and their attendance lists.
- Export attendance reports to PDF and use the device sharing options.

### Teacher

- View assigned classes, subjects, and session history.
- Create an attendance session for a class, subject, and lecture time.
- Choose a QR validity duration; the displayed code includes a unique session token and countdown.
- Record the teacher's current location when available; the app falls back to the configured campus coordinates if it cannot obtain a location.
- View attendance submitted for a session, block a student from that session, or cancel the session.

### Student

- View their attendance summary and history, profile, and class sessions.
- Scan a teacher's QR code with the device camera.
- See whether attendance was accepted or why validation failed.

## End-to-end attendance flow

```text
TEACHER                  MOBILE APP                    EXPRESS API               JSON STORE
   |                          |                              |                         |
   | Select class, subject,   |                              |                         |
   | lecture time and QR time |                              |                         |
   |------------------------->|                              |                         |
   |                          | Create unique QR token,      |                         |
   |                          | expiry and get GPS if able   |                         |
   |                          |                              |                         |
   |                          | POST /api/sessions          |                         |
   |                          |----------------------------->| Validate teacher role   |
   |                          |                              | Save session----------->|
   |                          |<-----------------------------|<------------------------|
   | Display QR and countdown |                              |                         |
   |<-------------------------|                              |                         |
   |                          |                              |                         |
STUDENT                      |                              |                         |
   | Scan teacher QR          |                              |                         |
   |------------------------->| Read token; get GPS if able |                         |
   |                          | POST /api/attendance         |                         |
   |                          |----------------------------->| Check token and expiry  |
   |                          |                              | Check class, subject,   |
   |                          |                              | duplicate and block    |
   |                          |                              | Check GPS if provided  |
   |                          |                              | Save attendance------->|
   |                          |<-----------------------------|<------------------------|
   | See success or error     | Refresh attendance queries |                         |
   |<-------------------------|                              |                         |
```

### Attendance validation rules

The API accepts a scan only if the QR token matches a stored session, the session has not expired, the student's class matches the session, and the student has not already checked in or been blocked for that session. When the session has a subject and the student has an enrolled-subject list, that subject must also match. If the client submits latitude and longitude, the API validates their ranges and requires the student to be within **200 metres** of the session location. GPS coordinates are optional in the current implementation; if no coordinates are sent, the distance check is skipped.

The app's launch screen also checks whether a device is within the configured **1,400-metre campus radius** before routing to a dashboard. It offers a “Demo Mode (Skip GPS)” route. This launch check is a client-side navigation gate, separate from the server-side attendance checks above.

## Architecture

```text
Admin / Teacher / Student
             |
             v
Expo React Native app
  |-- AuthContext: current signed-in user
  |-- React Query: API data cache and refresh
  |-- Expo Router: role-based screens
  |
  | JSON requests + session cookie (/api)
  v
Express 5 API
  |-- Authentication and role middleware
  |-- Route handlers and attendance rules
  v
In-memory application store <---- load at startup / write changes ----> .data.json

OpenAPI, generated API packages, and Drizzle/PostgreSQL package are workspace
scaffolding; the current Express routes use the JSON store above.
```

The mobile app and API are separate applications in one pnpm monorepo. The app sends JSON requests to the API under `/api`. Express session middleware authenticates requests, while route middleware restricts operations by role. The API reads and updates a process-wide in-memory store and serializes changes to `.data.json`.

## Technology stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| Mobile UI | React Native, React, TypeScript | Native cross-platform screens and typed application logic |
| Mobile runtime and navigation | Expo SDK 58, Expo Router | Native tooling, file-based navigation, permissions, and app builds |
| Data fetching | TanStack React Query | Request lifecycle, caching, and invalidation after mutations |
| Authentication state | React Context (`AuthContext`) | Current user, login, logout, and session restoration |
| QR code | `react-native-qrcode-svg`, `expo-camera` | Render teacher session codes and scan them on student devices |
| Location | `expo-location` | Read foreground device coordinates where permission is granted |
| API | Node.js, Express 5, TypeScript | REST endpoints, sessions, validation, and role-aware operations |
| Password hashing | `bcryptjs` | Hash seeded and administrator-created passwords; compare on login |
| API logging | Pino and `pino-http` | Structured request and server logs with selected secrets redacted |
| Persistence in the running API | JSON file (`.data.json`) | Store users, departments, classes, sessions, and attendance records |
| PDF report | `expo-print`, `expo-sharing` | Render a report to PDF and share it from a supported device |
| Workspace management | pnpm workspaces | Link the mobile app, API, and shared packages |
| Android build and distribution | EAS Build | Produce the preview APK for internal distribution |

## Repository structure

```text
.
├── artifacts/
│   ├── api-server/                 # Express API
│   │   ├── src/
│   │   │   ├── app.ts              # Middleware, cookie sessions, route mounting, data bootstrap
│   │   │   ├── index.ts            # PORT validation and HTTP server startup
│   │   │   ├── store.ts            # Data types, seeds, migrations, JSON persistence
│   │   │   ├── middleware/auth.ts  # Login and role guards
│   │   │   ├── routes/             # Health, auth, users, sessions, attendance, classes, departments
│   │   │   └── lib/                # Logger and distance utility
│   │   ├── build.mjs               # esbuild server bundling
│   │   └── package.json
│   └── mobile/                     # Expo React Native app
│       ├── app/                    # Expo Router screens and role route groups
│       │   ├── (admin)/            # Overview, students, teachers, departments, reports
│       │   ├── (student)/          # Student dashboard, QR scanner, profile
│       │   ├── (teacher)/          # Teacher dashboard, session creation, profile
│       │   ├── _layout.tsx         # Providers, fonts, error boundary, root navigation
│       │   ├── index.tsx           # Campus GPS gate and dashboard routing
│       │   └── login.tsx           # Login and API-server settings UI
│       ├── components/             # Shared UI and error-handling components
│       ├── contexts/AuthContext.tsx# Login state and current-user context
│       ├── lib/                    # API/query client and GPS distance helper
│       ├── constants/              # UI color tokens
│       ├── assets/                 # App icon, splash screen, favicon
│       ├── app.json                # Expo identity, plugins, Android package and EAS project
│       ├── eas.json                # EAS preview APK profile and API URL
│       ├── babel.config.js         # Expo Babel preset
│       └── package.json
├── lib/
│   ├── api-spec/                   # OpenAPI definition and Orval configuration
│   ├── api-zod/                    # Generated API schemas and types
│   ├── api-client-react/           # Generated React API client helpers
│   └── db/                         # Drizzle/PostgreSQL package scaffold (not live persistence)
├── scripts/                        # Workspace scripts
├── attached_assets/                 # Project reference assets
├── .data.json                       # Local/deployment JSON data file, when present
├── pnpm-workspace.yaml              # Workspace package definitions and shared versions
├── pnpm-lock.yaml                   # Reproducible dependency resolution
└── README.md
```

## Mobile application internals

### Startup and navigation

`artifacts/mobile/app/_layout.tsx` loads the Inter font family and wraps the router with safe-area, error-boundary, React Query, authentication, gesture, and keyboard providers. The root route (`app/index.tsx`) restores the cookie-backed user through `GET /api/auth/me`, checks location, then routes to login or the appropriate role group. If campus GPS is unavailable or outside the radius, the user can retry or choose the demo bypass.

Expo Router maps files under `app/` to screens. Parenthesized folders are route groups: `(admin)`, `(teacher)`, and `(student)`. Each group has its own tab layout and role-specific screens.

### Client-side state and requests

- `AuthContext` owns the current user and provides login, logout, and session restoration.
- `lib/query-client.ts` builds API URLs from `EXPO_PUBLIC_API_URL`, sends JSON requests with `credentials: "include"`, and configures React Query with one retry and a 30-second stale time.
- Successful attendance and session changes invalidate relevant query keys so dashboard data can refresh.
- AsyncStorage stores a configurable API base URL for the app. The default is the Render API URL configured in `eas.json`.

### Screen responsibilities

| Screen group | Screens and responsibilities |
| --- | --- |
| Shared | Campus location gate, login, root navigation, not-found screen |
| Admin | Summary dashboard, teacher and student lists, department/class management, attendance calendar/report and PDF export |
| Teacher | Summary and session history, QR attendance session setup/display, session attendance and profile |
| Student | Attendance dashboard, camera-based QR scan, class/session history, profile |

## Backend internals

### Request pipeline

1. `src/index.ts` requires a valid `PORT` and starts the Express app.
2. `src/app.ts` installs structured logging, CORS with credentials, JSON/form parsers, and `express-session` middleware.
3. The API router is mounted at `/api`.
4. On startup, `store.ts` loads `.data.json`, seeds the initial demo dataset if the user collection is empty, then runs idempotent CE department/student/teacher migrations.
5. Each route reads the shared in-memory store. Mutating handlers call `persistStore()` to write the store back to JSON.

### Data model

| Entity | Main fields and relationships |
| --- | --- |
| User | ID, name, email, role (`admin`, `teacher`, `student`), password hash, department/class data, subjects, and teacher assignments |
| Department | ID, display name, code, creation timestamp |
| Class | ID, department ID/code, year, division, creation timestamp; display names follow `DEPT-Y{year}-{division}` |
| Session | ID, teacher ID, class name, QR token, expiry/creation timestamps, location, subject, lecture times, cancellation time, blocked student IDs |
| Attendance | ID, student ID/name, session ID, class name, scan timestamp, subject/lecture data, teacher name |

Foreign-key-like references are maintained by application logic rather than a relational database. User deletion and department/class deletion perform related in-memory cleanup in their route handlers.

## Persistence and database status

The live API is **not currently backed by PostgreSQL**. `artifacts/api-server/src/store.ts` maintains arrays for users, departments, classes, sessions, and attendance in memory and writes the complete store to `.data.json`. Startup loads that file, and seeded records are created when the store has no users. The seed and migration routines hash seeded passwords with bcryptjs.

The repository also contains `lib/db`, `drizzle-orm`, `drizzle-kit`, and `pg` dependencies. However, `lib/db/src/schema/index.ts` currently exports no database tables, and the Express routes use `getStore()` rather than Drizzle. `DATABASE_URL` is required by the Drizzle config only when invoking Drizzle tooling; it is not used by the live API request path. Do not treat this scaffold as an active SQL database.

Because the JSON file is rewritten as a whole and the default Express session store is in-memory, this design is intended for a small single-instance deployment or demonstration. Durable multi-instance production use should move application records and sessions to a managed database and persistent session store. Whether a deployed JSON file survives restarts also depends on the host's filesystem and volume configuration.

## API reference

All application endpoints are mounted under `/api`. Except for the health check and login/logout routes, the routes below require an authenticated cookie session; role restrictions are enforced server-side.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/healthz` | Public | Health check (`{ "status": "ok" }`) |
| `POST` | `/api/auth/login` | Public | Verify credentials, establish session cookie, return user without password hash |
| `POST` | `/api/auth/logout` | Session | Destroy current session |
| `GET` | `/api/auth/me` | Session | Return authenticated user |
| `GET` | `/api/users` | Admin | List users without password hashes |
| `POST` | `/api/users` | Admin | Create student/teacher; add an assignment when the email belongs to an existing teacher |
| `PUT` | `/api/users/:id` | Admin | Update user fields and optionally set a password |
| `DELETE` | `/api/users/:id` | Admin | Delete a non-admin user and related records |
| `GET` | `/api/departments` | Authenticated | List departments |
| `POST` | `/api/departments` | Admin | Create department |
| `DELETE` | `/api/departments/:id` | Admin | Delete department, classes, associated users, sessions, and attendance |
| `GET` | `/api/classes` | Authenticated | List classes; supports `departmentId` and `year` query filters |
| `POST` | `/api/classes` | Admin | Create a class division |
| `DELETE` | `/api/classes/:id` | Admin | Delete class and associated records |
| `POST` | `/api/sessions` | Teacher | Create an attendance session and QR token |
| `GET` | `/api/sessions/active` | Authenticated | List unexpired, uncancelled sessions |
| `GET` | `/api/sessions/my` | Teacher | List sessions created by current teacher |
| `GET` | `/api/sessions/class` | Student | List sessions for current student's class |
| `GET` | `/api/sessions/by-class?className=...` | Admin | List sessions for a class, including teacher name |
| `GET` | `/api/sessions/:id/attendance` | Teacher or admin | List attendance for a session |
| `POST` | `/api/sessions/:id/cancel` | Owning teacher | Cancel a session |
| `POST` | `/api/sessions/:id/block/:studentId` | Owning teacher | Block a student from a session |
| `POST` | `/api/attendance` | Student | Validate QR/location/class/subject and record attendance |
| `GET` | `/api/attendance/my` | Student | List current student's attendance |
| `GET` | `/api/attendance?className=...&date=YYYY-MM-DD` | Admin | Filter attendance records by class and/or date |
| `DELETE` | `/api/attendance/:id` | Owning teacher | Delete attendance for a session they own and clear that student's session block |

The OpenAPI source at `lib/api-spec/openapi.yaml` currently documents the health check only. The additional routes above are implemented directly in Express; the generated OpenAPI client packages should not be assumed to describe every live route yet.

## Local development

### Requirements

- Node.js compatible with the Expo SDK in `artifacts/mobile/package.json`.
- pnpm compatible with the workspace lockfile and settings.
- Android Studio/emulator or an Android device for native camera/GPS behavior.

### Install dependencies

From the repository root:

```bash
pnpm install
```

### Start the mobile app

```bash
pnpm --filter smartattendancesystem dev
```

The app defaults to the cloud API URL `https://smart-attendance-api-5ap4.onrender.com`. For local API development, configure the app's server URL to a development server address reachable from the device; `localhost` on a phone refers to the phone itself, not the development computer.

### Start the API locally

In PowerShell, from the repository root:

```powershell
$env:PORT = "3000"
$env:NODE_ENV = "development"
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

The server listens on `PORT`. It looks for `.data.json` in its working directory and then at the repository root. Use a reachable LAN IP for a physical device and ensure the API origin/port is accessible on the local network.

### Build an Android preview APK

From `artifacts/mobile`:

```bash
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile in `eas.json` creates an internal Android APK and injects `EXPO_PUBLIC_API_URL`. EAS credentials and an authenticated Expo account are required.

## Configuration

| Variable | Used by | Description |
| --- | --- | --- |
| `PORT` | API server | Required listening port; the server exits if missing or invalid. |
| `SESSION_SECRET` | API server | Secret used to sign session cookies. Set a strong secret in deployment; the source includes a fallback for development. |
| `NODE_ENV` | API server | Selects logger behavior (`production` disables the pretty transport). |
| `LOG_LEVEL` | API server | Pino log level; defaults to `info`. |
| `EXPO_PUBLIC_API_URL` | Mobile app | API origin; the app appends `/api` to this base URL. The EAS preview profile sets the Render API URL. |
| `DATABASE_URL` | Drizzle tooling | PostgreSQL connection URL required by `lib/db/drizzle.config.ts`; not currently used by API routes. |

The app uses cookie credentials on API requests. Server CORS is configured to allow credentialed requests and reflect request origins.

## Security and operational considerations

- Passwords are hashed with bcryptjs before storage; API responses omit `passwordHash`.
- Authentication is cookie-session based. `requireAuth` and `requireRole` middleware enforce login and role checks for protected routes.
- Session cookies are HTTP-only. Before production deployment, review the current cookie settings, provide a strong `SESSION_SECRET`, and use a persistent session store and HTTPS-aware secure cookie configuration.
- The demo seed includes sample accounts. Replace or remove demo credentials and seed data before using real campus accounts or personal data.
- GPS is a proximity signal, not a tamper-proof proof of physical presence. In this code, student coordinates are optional, and the server skips the 200-metre check when coordinates are absent.
- Avoid committing real student records, credentials, `.env` files, or private deployment configuration.

## Build and package commands

| Command | Location | Purpose |
| --- | --- | --- |
| `pnpm install` | Repository root | Install workspace dependencies |
| `pnpm run typecheck` | Repository root | Type-check shared libraries and configured workspace packages |
| `pnpm --filter smartattendancesystem dev` | Repository root | Start Expo development server |
| `pnpm --filter @workspace/api-server build` | Repository root | Bundle the API with esbuild |
| `pnpm --filter @workspace/api-server start` | Repository root | Start the built API; requires `PORT` |
| `npx eas-cli@latest build --platform android --profile preview` | `artifacts/mobile` | Submit the preview Android APK build to EAS |

## Related documentation

- [Architecture notes](ARCHITECTURE.md)
- [Feature list](COMPLETE_FEATURES_LIST.md)
- [End-to-end flow notes](START_TO_END_FLOW.md)
- [Technical approach](TECHNICAL_APPROACH.md)
- [OpenAPI source](lib/api-spec/openapi.yaml)
