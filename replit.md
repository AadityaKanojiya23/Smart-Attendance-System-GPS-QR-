# Smart GPS + QR Based Campus Attendance System

## Overview

A full-stack mobile attendance system for K.C. College of Engineering, Thane East. Built as an Expo React Native app with an Express TypeScript backend.

## Tech Stack

- **Frontend**: Expo SDK 54, Expo Router (file-based routing), React Native, TypeScript
- **Backend**: Express.js with TypeScript, express-session, bcryptjs
- **State**: @tanstack/react-query, React Context for auth
- **UI**: Inter font, @expo/vector-icons, expo-linear-gradient, expo-blur
- **QR**: react-native-qrcode-svg (display), expo-camera (scan)
- **Location**: expo-location, expo-haptics
- **Storage**: In-memory (no database), pre-seeded demo accounts

## Structure

```text
artifacts/mobile/          # Expo React Native app
  app/
    _layout.tsx            # Root layout: QueryClient, AuthProvider, fonts
    index.tsx              # GPS gate screen (checks campus proximity)
    login.tsx              # Login screen with demo account shortcuts
    (admin)/               # Admin tabs: Dashboard, Students, Teachers, Reports
    (teacher)/             # Teacher tabs: Dashboard, Session (QR generation)
    (student)/             # Student tabs: Dashboard, Scan QR
  contexts/
    AuthContext.tsx        # Auth state, login/logout
  lib/
    query-client.ts        # API URL helper, fetch wrapper
    haversine.ts           # GPS distance calculation
  components/
    GradientHeader.tsx     # Navy gradient header used on every screen
    StatCard.tsx           # Stat display card for dashboards

artifacts/api-server/      # Express API server
  src/
    app.ts                 # Express app setup, session, CORS, seed
    store.ts               # In-memory store + bcrypt seed
    routes/
      auth.ts              # POST /login, POST /logout, GET /me
      users.ts             # GET /users (admin only)
      sessions.ts          # POST /sessions, GET /active, GET /my, GET /:id/attendance
      attendance.ts        # POST /attendance, GET /my, GET / (admin)
    middleware/
      auth.ts              # requireAuth, requireRole middleware
    lib/
      haversine.ts         # Server-side GPS distance calculation
```

## Campus GPS Settings

- **Campus**: K.C. College of Engineering, Thane East, Kopri
- **Latitude**: 19.1897, **Longitude**: 72.9862
- **Campus gate radius**: 300 metres
- **Teacher proximity for scan**: 100 metres

## Demo Accounts

| Role    | Email               | Password   | Class |
|---------|---------------------|------------|-------|
| Admin   | admin@campus.edu    | admin123   | —     |
| Teacher | anita@campus.edu    | teacher123 | CS-A  |
| Teacher | rahul@campus.edu    | teacher123 | CS-B  |
| Student | priya@campus.edu    | student123 | CS-A  |
| Student | arjun@campus.edu    | student123 | CS-A  |
| Student | sneha@campus.edu    | student123 | CS-B  |

## Color Scheme

- Primary dark: #0F2D5A (deep navy)
- Primary: #1A3F7A
- Accent: #2563EB (electric blue)
- Background: #F0F4F8
- Success: #16A34A, Error: #DC2626, Warning: #D97706

## API Routes

- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/logout` — Destroy session
- `GET /api/auth/me` — Get current user
- `GET /api/users` — All users (admin only)
- `POST /api/sessions` — Create attendance session (teacher only)
- `GET /api/sessions/active` — Active sessions
- `GET /api/sessions/my` — Teacher's own sessions
- `POST /api/attendance` — Mark attendance (student only)
- `GET /api/attendance/my` — Student's own records
- `GET /api/attendance` — All records (admin only)
- `GET /api/sessions/:id/attendance` — Session records (teacher/admin)
