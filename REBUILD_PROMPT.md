# 🔁 COMPLETE REBUILD PROMPT — Campus Attendance System
## (Copy this entire prompt to recreate the exact same app)

---

```
BUILD A COMPLETE GPS + QR BASED CAMPUS ATTENDANCE SYSTEM — EXACT SPECIFICATIONS BELOW.
DO NOT DEVIATE FROM ANY DETAIL. BUILD EVERYTHING LISTED.

════════════════════════════════════════════════════════════
 PROJECT IDENTITY
════════════════════════════════════════════════════════════

App Name        : Campus Attendance System
College         : K.C. College of Engineering and Management Studies and Research
College Short   : KCCEMSR
Location        : MithBunder Road, Near Hume Pipe, Kopri, Thane (E) - 400603
Campus GPS      : Latitude 19.180010063951876, Longitude 72.98054933658015
Gate Radius     : 1400 meters (soft check only — never block login)
Scan Proximity  : 200 meters (hard check for attendance marking)

════════════════════════════════════════════════════════════
 TECH STACK — USE EXACTLY THESE
════════════════════════════════════════════════════════════

FRONTEND (Mobile App):
  Runtime       : Expo SDK 54 + React Native
  Language      : TypeScript (strict mode)
  Routing       : expo-router (file-based, folder-based layouts)
  State         : React Context (auth) + @tanstack/react-query v5 (server state)
  HTTP Client   : fetch() with credentials: 'include' (cookie-based)
  Location      : expo-location (foreground permission)
  Camera/QR Scan: expo-camera (CameraView + onBarcodeScanned)
  QR Generate   : react-native-qrcode-svg
  PDF (mobile)  : expo-print + expo-sharing
  PDF (web)     : dynamic import('jspdf') — NEVER import jspdf statically
  Fonts         : @expo-google-fonts/inter (Inter_300Light, Inter_400Regular, Inter_600SemiBold, Inter_700Bold)
  Gradient      : expo-linear-gradient
  Icons         : @expo/vector-icons (Ionicons)
  Safe Area     : react-native-safe-area-context
  Gestures      : react-native-gesture-handler
  Keyboard      : react-native-keyboard-controller
  Haptics       : expo-haptics
  Package Mgr   : pnpm (monorepo workspace)
  Build         : Metro Bundler (Expo default)

BACKEND (API Server):
  Runtime       : Node.js 18+
  Language      : TypeScript
  Framework     : Express.js 4.18+
  Auth          : express-session (cookie-based, 7-day expiry)
  Passwords     : bcryptjs (salt rounds: 10)
  CORS          : cors middleware (origin: true, credentials: true)
  Logging       : pino + pino-http
  Build         : esbuild (single file output to dist/index.mjs)
  Port          : reads from process.env.PORT, defaults to 8080

DATABASE:
  Type          : File-based JSON persistence
  File          : .data.json in api-server root directory
  On startup    : loadStore() reads .data.json into memory
  After writes  : persistStore() serializes and writes entire store to disk
  Seed          : seedStore() only runs if store.users.length === 0

════════════════════════════════════════════════════════════
 COLOR SCHEME — USE EXACT HEX CODES
════════════════════════════════════════════════════════════

primaryDark   : #0F2D5A   (dark navy — gradient start)
primary       : #1A3F7A   (medium navy — gradient end)
accent        : #2563EB   (bright blue — buttons, highlights)
accentLight   : #EFF6FF   (pale blue — icon backgrounds)
background    : #F0F4F8   (light blue-grey — screen background)
surface       : #FFFFFF   (white — cards)
success       : #16A34A   (green)
successLight  : #DCFCE7   (pale green)
warning       : #D97706   (amber)
warningLight  : #FEF3C7   (pale amber)
error         : #DC2626   (red)
errorLight    : #FEE2E2   (pale red)
info          : #0EA5E9   (sky blue)
infoLight     : #E0F2FE   (pale sky)
textPrimary   : #111827   (near black)
textSecondary : #6B7280   (grey)
textMuted     : #9CA3AF   (light grey)
border        : #E5E7EB   (light border)
borderLight   : #F3F4F6   (very light border)

GRADIENTS:
  Header      : LinearGradient colors={['#0F2D5A', '#1A3F7A']} horizontal
  Card Active : LinearGradient colors={['#1A3F7A', '#2563EB']} horizontal
  Success     : LinearGradient colors={['#15803D', '#16A34A']} horizontal

════════════════════════════════════════════════════════════
 TYPOGRAPHY — INTER FONT FAMILY
════════════════════════════════════════════════════════════

headingLarge  : Inter_700Bold,   28px
headingMedium : Inter_700Bold,   22px
headingSmall  : Inter_600SemiBold, 18px
bodyLarge     : Inter_400Regular, 16px
bodyMedium    : Inter_400Regular, 14px
bodySmall     : Inter_400Regular, 12px
labelLarge    : Inter_600SemiBold, 16px
labelMedium   : Inter_600SemiBold, 14px
labelSmall    : Inter_600SemiBold, 12px
caption       : Inter_300Light,  11px

Load fonts with useFonts() in _layout.tsx. Show SplashScreen until fonts loaded.

════════════════════════════════════════════════════════════
 FOLDER STRUCTURE — FRONTEND
════════════════════════════════════════════════════════════

artifacts/mobile/
├── app/
│   ├── _layout.tsx                  ← Root layout: fonts, QueryClient, AuthProvider, SafeArea
│   ├── index.tsx                    ← Gate check / home screen (after login)
│   ├── login.tsx                    ← Login screen
│   ├── (admin)/
│   │   ├── _layout.tsx              ← Admin tab layout (4 tabs)
│   │   ├── index.tsx                ← Admin dashboard
│   │   ├── students.tsx             ← Student management
│   │   ├── teachers.tsx             ← Teacher management
│   │   └── reports.tsx              ← Reports with calendar + PDF
│   ├── (teacher)/
│   │   ├── _layout.tsx              ← Teacher tab layout (3 tabs)
│   │   ├── index.tsx                ← Teacher dashboard
│   │   ├── session.tsx              ← QR generation + active session
│   │   └── history.tsx              ← Session history
│   └── (student)/
│       ├── _layout.tsx              ← Student tab layout (3 tabs)
│       ├── index.tsx                ← Student dashboard
│       ├── scan.tsx                 ← QR scanner
│       └── profile.tsx              ← Student profile + attendance list
├── contexts/
│   └── AuthContext.tsx              ← Global auth state
├── components/
│   ├── GradientHeader.tsx           ← Navy gradient header (accepts left?, right? props)
│   ├── StatCard.tsx                 ← Stat display card
│   └── ErrorBoundary.tsx           ← Catches render crashes
├── lib/
│   ├── query-client.ts              ← QueryClient + apiRequest() + setBaseUrl()
│   └── haversine.ts                 ← GPS distance calculation
└── constants/
    └── colors.ts                    ← All color constants

════════════════════════════════════════════════════════════
 FOLDER STRUCTURE — BACKEND
════════════════════════════════════════════════════════════

artifacts/api-server/
├── src/
│   ├── app.ts                       ← Express setup, middleware, loadStore, seedStore
│   ├── index.ts                     ← HTTP server entry
│   ├── store.ts                     ← In-memory store + loadStore + persistStore + seedStore
│   ├── routes/
│   │   ├── index.ts                 ← Aggregates all routers under /api
│   │   ├── auth.ts                  ← POST /auth/login, POST /auth/logout, GET /auth/me
│   │   ├── sessions.ts              ← All /sessions routes
│   │   ├── attendance.ts            ← All /attendance routes
│   │   ├── users.ts                 ← GET /users
│   │   └── classes.ts               ← GET /departments, GET /classes
│   ├── middleware/
│   │   └── auth.ts                  ← requireAuth, requireRole(role)
│   └── lib/
│       └── logger.ts                ← pino logger

════════════════════════════════════════════════════════════
 DATA MODELS (TypeScript Interfaces)
════════════════════════════════════════════════════════════

interface TeacherAssignment {
  className: string;
  departmentId: string;
  departmentCode: string;
  year: number;
  division: string;
  subjects: string[];
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  department?: string;
  departmentId?: string;
  year?: number;
  division?: string;
  className?: string;
  subjects?: string[];
  assignments?: TeacherAssignment[];
  rollNumber?: number;
  passwordHash: string;
}

interface StoredDepartment {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface StoredClass {
  id: string;
  departmentId: string;
  departmentCode: string;
  year: number;
  division: string;
  createdAt: string;
}

interface StoredSession {
  id: string;
  teacherId: string;
  className: string;
  latitude: number;
  longitude: number;
  qrToken: string;
  expiresAt: string;
  createdAt: string;
  subject?: string;
  lectureStart?: string;
  lectureEnd?: string;
  durationSecs?: number;
  blockedStudents?: string[];
  cancelledAt?: string;
}

interface StoredAttendance {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  className: string;
  markedAt: string;
  subject?: string;
  lectureStart?: string;
  lectureEnd?: string;
  teacherName?: string;
}

CLASS NAME FORMAT: {DeptCode}-Y{year}-{Division}  e.g. CS-Y1-A, CE-Y2-B

ID FORMAT: Date.now().toString() + Math.random().toString(36).substr(2, 9)

════════════════════════════════════════════════════════════
 DEMO SEED DATA (seedStore — only if users.length === 0)
════════════════════════════════════════════════════════════

DEPARTMENTS:
  Computer Science        code: CS
  Electronics Engineering code: EE
  Mechanical Engineering  code: ME

CLASSES (CS): Y1-A, Y1-B, Y2-A, Y2-B, Y3-A, Y4-A
CLASSES (EE): Y1-A, Y2-A
CLASSES (ME): Y1-A, Y2-A

DEMO USERS:
  admin@campus.edu        / admin123      → role: admin
  anita@campus.edu        / teacher123    → role: teacher, CS-Y1-A, subjects: [Data Structures, Algorithms, C Programming, Mathematics-I]
  rahul@campus.edu        / teacher123    → role: teacher, CS-Y1-B, subjects: [Digital Electronics, Basic Electronics, Mathematics-I]
  vikram@campus.edu       / teacher123    → role: teacher, EE-Y1-A, subjects: [Basic Electrical, Circuit Theory, Physics, Mathematics-II]
  suresh@campus.edu       / teacher123    → role: teacher, ME-Y1-A, subjects: [Engineering Mechanics, Thermodynamics, Workshop, Mathematics-II]
  priya@campus.edu        / student123    → role: student, CS-Y1-A
  arjun@campus.edu        / student123    → role: student, CS-Y1-A
  sneha@campus.edu        / student123    → role: student, CS-Y1-B
  riya@campus.edu         / student123    → role: student, EE-Y1-A

════════════════════════════════════════════════════════════
 ALL API ENDPOINTS
════════════════════════════════════════════════════════════

BASE: /api

AUTH:
  POST   /auth/login         body:{email,password} → {user}
  POST   /auth/logout        → {success:true}
  GET    /auth/me            → {user} or 401

SESSIONS:
  POST   /sessions           requireAuth+teacher → creates session, returns session object
                             body: {className, latitude?, longitude?, qrToken, expiresAt,
                                    subject?, lectureStart?, lectureEnd?, durationSecs?}
                             teacherId taken from req.session.userId (NOT from body)
  GET    /sessions/my        requireAuth+teacher → teacher's sessions (reverse chrono)
  GET    /sessions/active    requireAuth → all non-expired, non-cancelled sessions
  GET    /sessions/class     requireAuth+student → active sessions for student's className
  GET    /sessions/by-class  requireAuth+admin → query: ?className=CE-Y2-B
                             returns sessions with teacherName joined
  GET    /sessions/:id/attendance  requireAuth+teacher → attendance records for that session
  POST   /sessions/:id/cancel      requireAuth+teacher → sets cancelledAt, persistStore
  POST   /sessions/:id/block/:studentId   requireAuth+teacher → adds to blockedStudents[]
  DELETE /sessions/:id/unblock/:studentId requireAuth+teacher → removes from blockedStudents[]

ATTENDANCE:
  POST   /attendance         requireAuth+student → mark attendance
                             body: {qrToken, latitude?, longitude?}
                             Validates: session exists, not expired, not cancelled,
                             class match, subject enrolled (if session has subject),
                             student not blocked, not already marked,
                             GPS proximity (only if lat+lng provided AND valid)
                             Returns: attendance record
  GET    /attendance/my      requireAuth+student → student's own records (reverse chrono)
  GET    /attendance         requireAuth+admin → all records, filterable:
                             ?className=CE-Y2-B&date=2026-04-22 (YYYY-MM-DD)
  DELETE /attendance/:id     requireAuth+teacher → delete record, persistStore

USERS:
  GET    /users              requireAuth+admin → all users (no passwordHash)
  GET    /users/:id          requireAuth → get user by id (no passwordHash)

CLASSES:
  GET    /departments        requireAuth → all departments
  GET    /classes            requireAuth → all classes
  GET    /classes/:id        requireAuth → single class

════════════════════════════════════════════════════════════
 GPS LOGIC — EXACT IMPLEMENTATION
════════════════════════════════════════════════════════════

HAVERSINE FORMULA (backend + frontend):
  function haversineDistance(lat1, lng1, lat2, lng2): number {
    const R = 6371000; // Earth radius meters
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

TEACHER SESSION CREATION:
  1. No GPS requirement — teacher can create session from anywhere
  2. Silently attempt Location.getCurrentPositionAsync with 3.5s timeout
  3. On success: use device coords as session.latitude/longitude
  4. On fail/timeout: use campus center (19.180010063951876, 72.98054933658015)
  5. GPS failure does NOT block session creation

STUDENT ATTENDANCE SCAN:
  1. Request camera permission before opening camera
  2. After QR detected, attempt Location.requestForegroundPermissionsAsync
  3. If granted: attempt Location.getCurrentPositionAsync with 3s timeout
     - On success: lat/lng included in POST /attendance
     - On timeout/error: lat/lng = undefined (omitted from request)
  4. If denied: lat/lng = undefined
  5. Send POST /attendance with {qrToken, latitude?, longitude?}

BACKEND PROXIMITY VALIDATION (in POST /attendance):
  Only perform if BOTH latitude AND longitude are present in body:
    1. typeof lat === 'number' && typeof lng === 'number'
    2. isFinite(lat) && isFinite(lng)
    3. lat >= -90 && lat <= 90
    4. lng >= -180 && lng <= 180
    5. If any check fails → 400 "Invalid location coordinates"
    6. If all pass → haversineDistance(studentLat, studentLng, session.lat, session.lng)
    7. If distance > 200 → 400 "You are Xm away — must be within 200m"
  If lat/lng absent → skip proximity check entirely (attendance allowed)

GATE CHECK (app index screen):
  On open: check Location.getForegroundPermissionsAsync
  If granted: getCurrentPositionAsync → haversineDistance vs campus center
  Result is INFORMATIONAL ONLY — never blocks login or navigation
  Show badge: "On Campus" (green) or "Off Campus" (warning) or "Location Unknown"

════════════════════════════════════════════════════════════
 QR TOKEN FORMAT & SESSION STATES
════════════════════════════════════════════════════════════

QR TOKEN: "SESSION_" + userId + "_" + Date.now() + "_" + random(9 chars)
Example  : "SESSION_17748989190921hvzir88f_1704067200123_abc123xyz"

SESSION STATES (frontend only):
  idle       → setup → generating → active → expired
  cancelledAt set → still "active" badge but show cancelled UI

QR DURATION OPTIONS: 1, 2, 5, 10, 15, 30 minutes

COUNTDOWN TIMER:
  - setInterval every 1000ms
  - Decrement timeLeft
  - When 0: setState('expired'), clearInterval
  - Display as MM:SS

════════════════════════════════════════════════════════════
 SCREEN DETAILS — EXACT LAYOUT & BEHAVIOR
════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN SCREEN (app/login.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Background: gradient #0F2D5A → #1A3F7A (full screen)
Layout:
  - College name text (white, top)
  - "Campus Attendance System" title (white, bold, large)
  - White card with rounded corners (border-radius 20)
  - "Welcome Back" heading inside card
  - Email TextInput (Inter, border, rounded-10)
  - Password TextInput (secure, eye toggle icon)
  - "Login" button (accent #2563EB, full width, rounded-12)
  - Loading spinner during login
  - Error message in red below button
  - Separator: "or continue with demo"
  - Three demo buttons side by side:
    [Admin Demo] [Teacher Demo] [Student Demo]
    Each in a separate muted grey pill button
  - Bottom text: college address

NAVIGATION AFTER LOGIN:
  role === 'admin'   → router.replace('/(admin)')
  role === 'teacher' → router.replace('/(teacher)')
  role === 'student' → router.replace('/(student)')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN TABS (app/(admin)/_layout.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4 tabs:
  1. Dashboard (Ionicons: grid-outline)
  2. Students  (Ionicons: people-outline)
  3. Teachers  (Ionicons: school-outline)
  4. Reports   (Ionicons: bar-chart-outline)
Tab bar background: #0F2D5A
Active tint: #FFFFFF
Inactive tint: rgba(255,255,255,0.5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN DASHBOARD (app/(admin)/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Dashboard" with logout icon on right
Stats row (2 columns):
  - Total Students (blue icon: people)
  - Total Teachers (purple icon: school)
  - Active Sessions (green icon: wifi)
  - Total Records (orange icon: document-text)
Fetch: GET /users → filter by role
Fetch: GET /sessions/active for active count
Fetch: GET /attendance for total count
Below stats: Department list cards showing class breakdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN STUDENTS (app/(admin)/students.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Students" with count badge
Search bar below header (real-time filter)
FlatList of student cards:
  Each card shows: Name, Email, Class badge (colored pill), Roll No. if set
  Filter by search term (name or email, case-insensitive)
Fetch: GET /users → filter role === 'student'
Safe guard: Array.isArray(data) ? data : []

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN TEACHERS (app/(admin)/teachers.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Same layout as students but for teachers
Show subjects as pill badges on each card
Fetch: GET /users → filter role === 'teacher'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN REPORTS (app/(admin)/reports.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Attendance Reports" with PDF export button (right)
Class selector dropdown (Picker or custom modal)
  - When class selected: fetch sessions + attendance for that class

STATS BAR (when class loaded):
  - Total Lectures: count of all sessions (including cancelled)
  - Total Present: count of all attendance records
  Both in colored stat boxes with icons

CALENDAR VIEW:
  - Month grid (custom built, no third-party calendar)
  - Navigation arrows: prev/next month
  - Dots below dates that have sessions
  - Selected date highlighted in accent color
  - Click date → show sessions for that date below

SESSION LIST (for selected date):
  Each session card shows:
    - Subject name (bold)
    - Teacher name
    - Lecture time range (lectureStart – lectureEnd)
    - "X students present" badge (green)
    - Red "Cancelled" badge if cancelledAt is set
    - Expandable student list:
      Each row: student name + formatted scan time

PDF EXPORT (platform-aware):
  - Web:    dynamic import('jspdf') → doc.save(filename)
  - Native: Print.printToFileAsync({html}) → Sharing.shareAsync(uri)
  HTML template: college header + stats + per-session tables
  NEVER import jspdf at top level (crashes Android)

Data fetching:
  GET /sessions/by-class?className=CE-Y2-B   (includes teacherName)
  GET /attendance?className=CE-Y2-B
  Safe array guard on every .filter() and .map() call

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER TABS (app/(teacher)/_layout.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 tabs:
  1. Dashboard (Ionicons: home-outline)
  2. Session   (Ionicons: qr-code-outline)
  3. History   (Ionicons: time-outline)
Tab bar same dark navy styling

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER DASHBOARD (app/(teacher)/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Teacher Dashboard" with teacher name sub-text
Stat cards: Sessions Today, Total Sessions, Total Attendance Marked
Recent sessions list (last 5), each showing subject + student count
Fetch: GET /sessions/my

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER SESSION (app/(teacher)/session.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MACHINE: idle | setup | generating | active | expired

IDLE STATE:
  - Info card explaining QR-based attendance
  - "Start Attendance Session" large accent button

SETUP STATE (form):
  - "Lecture Start Time" → hour/minute spinners (0-23 / 00-59)
  - "Lecture End Time" → same spinners
  - "QR Valid Duration" → pill selector: [1][2][5][10][15][30] mins
  - "Year" → pill selector: [1st][2nd][3rd][4th]
  - "Division" → pill selector: [A][B][C] (filtered to teacher's assignment)
  - "Subject" → pill selector (teacher's subjects for selected class)
  - "Generate QR" accent button
  Back button to return to idle

GENERATING STATE:
  - Full screen spinner + "Getting location..." message
  - GPS attempt with 3.5s timeout (campus fallback on fail)
  - Auto-transitions to active on backend success

ACTIVE STATE:
  - Large QR code (size: screen width - 80) centered
  - Pulsing animation on QR (Animated.loop scale 0.98↔1.02)
  - Countdown timer MM:SS in large bold text
  - Green "Active" pill badge
  - Session info: Subject, Class, Lecture time
  - Attendance count (live, refetch every 10s)
  - "Cancel Session" red outline button
  - GPS indicator row: green dot + "GPS Active" or grey "GPS Unavailable"

EXPIRED STATE:
  - QR replaced with grey expired icon
  - "Session Expired" heading
  - Summary: Subject, Class, Total present
  - "Start New Session" button → back to idle

GPS CAPTURE during generating:
  const gpsPromise = Location.getCurrentPositionAsync({accuracy: Accuracy.Balanced})
  const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej('timeout'), 3500))
  try {
    const loc = await Promise.race([gpsPromise, timeoutPromise])
    lat = loc.coords.latitude
    lng = loc.coords.longitude
  } catch {
    lat = 19.180010063951876  // campus center
    lng = 72.98054933658015
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEACHER HISTORY (app/(teacher)/history.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Session History"
FlatList of past sessions (reverse chronological):
  Each card: Subject, Date, Class, Lecture time
  Attendance count badge
  "Cancelled" red badge if cancelledAt set
  Tap to expand: show list of students who attended + their scan time
  Teacher can delete individual attendance records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT TABS (app/(student)/_layout.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 tabs:
  1. Dashboard (Ionicons: home-outline)
  2. Scan QR   (Ionicons: scan-outline)
  3. Profile   (Ionicons: person-outline)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT DASHBOARD (app/(student)/index.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "Attendance Dashboard" with student name
Stats:
  - Total Lectures (count of sessions for student's class)
  - Total Present (count of student's attendance records)
  - Attendance % ((present/total)*100, 0 if total=0)
Active sessions card: show any currently active sessions for student's class
  - Tap → go to Scan tab
Recent activity list (last 5 attendance records)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT SCAN (app/(student)/scan.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MACHINE: idle | scanning | processing | success | already_marked | error

IDLE STATE:
  Requirements checklist (animated checkmarks):
    ☑ Camera permission
    ☑ QR code from teacher
    ○ Location (optional)
  "Open Scanner" accent button

SCANNING STATE:
  CameraView (full screen or large card):
    facing: 'back'
    onBarcodeScanned: handleScan
    barcodeScannerSettings: { barcodeTypes: ['qr'] }
  Overlay: dark semi-transparent corners + bright 220x220 center frame
  Corner brackets (4 corners, accent color, 3px thick)
  Text below frame: "Point at teacher's QR code"

handleScan({ data }) logic:
  1. if isProcessing.current → return (debounce)
  2. if !data.startsWith('SESSION_') → return
  3. if scannedTokens.current.has(data) → setScanState('already_marked'), show warning
  4. isProcessing.current = true
  5. setScanState('processing')
  6. Get GPS (optional, 3s timeout)
  7. POST /attendance with {qrToken: data, latitude?, longitude?}
  8. On 200: scannedTokens.current.add(data), Haptics.notificationAsync(Success), setScanState('success')
  9. On error: parse error message, setScanState('error')
  10. After 2500ms: reset to scanning, isProcessing.current = false

PROCESSING STATE: full screen spinner "Verifying attendance..."
SUCCESS STATE: green checkmark + "Attendance Marked!" + student name
ALREADY_MARKED STATE: warning icon + "Already Marked for this session"
ERROR STATE: red X + error message text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT PROFILE (app/(student)/profile.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GradientHeader: "My Profile"
Profile card: avatar circle (initials), name, email, class, department
Subjects list: pill badges in a wrapping row
Stats: Total Records, Attendance %
Full attendance history (FlatList):
  Each row: Subject, Date, Time, Teacher name
Logout button at bottom

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRADIENT HEADER COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Props: title, subtitle?, left?, right?
Background: LinearGradient ['#0F2D5A','#1A3F7A'] horizontal
Includes SafeAreaView top padding
Title: white, Inter_700Bold, 20px
Subtitle: white/70, Inter_400Regular, 13px
left: optional back button or logo
right: optional icon button (logout, export, etc.)
Height: ~90px including status bar

════════════════════════════════════════════════════════════
 AUTH CONTEXT
════════════════════════════════════════════════════════════

interface User {
  id: string; name: string; email: string; role: string;
  className?: string; department?: string; departmentId?: string;
  year?: number; division?: string; subjects?: string[]; rollNumber?: number;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

On app load (_layout.tsx):
  1. fetch GET /auth/me (credentials: include)
  2. On 200: authContext.login(data.user) → show dashboard
  3. On 401: show login screen

════════════════════════════════════════════════════════════
 API CLIENT (lib/query-client.ts)
════════════════════════════════════════════════════════════

let BASE_URL = '';
export function setBaseUrl(url: string) { BASE_URL = url.replace(/\/$/, ''); }

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

export async function apiRequest<T>(method, path, body?): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

BASE_URL comes from:
  Platform.OS === 'web':
    window.location.origin + (any base path from env)
  Native:
    'https://' + process.env.EXPO_PUBLIC_DOMAIN + (base path)
    where EXPO_PUBLIC_DOMAIN = REPLIT_DEV_DOMAIN env var (injected by workflow)

════════════════════════════════════════════════════════════
 SAFE DATA PATTERNS (NEVER SKIP THESE)
════════════════════════════════════════════════════════════

ALWAYS guard arrays before filtering/mapping:
  const safe = Array.isArray(data) ? data : [];
  safe.filter(...).map(...)

NEVER window.location.reload() — use queryClient.invalidateQueries() instead

NEVER import jspdf at top of file — always:
  const { default: jsPDF } = await import('jspdf');

Always check Platform.OS before using native-only APIs:
  if (Platform.OS !== 'web') { /* native-only */ }

════════════════════════════════════════════════════════════
 BACKEND SESSION SETUP
════════════════════════════════════════════════════════════

app.use(session({
  secret: process.env.SESSION_SECRET || 'campus-attendance-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

CORS:
  app.use(cors({ origin: true, credentials: true }));

ORDER IN app.ts: cors → json → urlencoded → session → routes

════════════════════════════════════════════════════════════
 BACKEND ATTENDANCE VALIDATION (exact order)
════════════════════════════════════════════════════════════

POST /attendance — run these checks in ORDER:
  1. requireAuth middleware
  2. requireRole('student') middleware
  3. Get userId from req.session.userId
  4. Find student in store.users — if not found → 401
  5. Find session by qrToken — if not found → 404 "Invalid QR code. Session not found."
  6. Check session.expiresAt > now — if expired → 400 "This session has expired."
  7. Check session.cancelledAt === undefined — if set → 400 "Session was cancelled."
  8. Validate GPS if provided (typeof, isFinite, range) → 400 if invalid
  9. Proximity check if GPS valid → 400 if > 200m, message includes distance
  10. Check student.className === session.className → 400 "Class mismatch"
  11. If session.subject set: check student.subjects includes it → 400 "Subject not assigned"
  12. Check student.id not in session.blockedStudents → 403 "You are blocked"
  13. Check no existing attendance record for this sessionId+studentId → 400 "Already marked"
  14. Create record, push to store.attendance, persistStore()
  15. Return 200 with record

════════════════════════════════════════════════════════════
 PDF EXPORT HTML TEMPLATE
════════════════════════════════════════════════════════════

HTML structure:
  <html>
    <head><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      .header { background: #0F2D5A; color: white; padding: 20px; text-align: center; }
      .college-name { font-size: 18px; font-weight: bold; }
      .subtitle { font-size: 13px; margin-top: 4px; opacity: 0.85; }
      .stats-row { display: flex; gap: 12px; margin: 16px 0; }
      .stat-box { flex: 1; background: #EFF6FF; border: 1px solid #BFDBFE;
                  border-radius: 8px; padding: 12px; text-align: center; }
      .stat-number { font-size: 24px; font-weight: bold; color: #1A3F7A; }
      .stat-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
      .session-card { border: 1px solid #E5E7EB; border-radius: 8px;
                      margin-bottom: 16px; overflow: hidden; }
      .session-header { background: #1A3F7A; color: white; padding: 12px 16px; }
      .session-body { padding: 12px 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #F0F4F8; text-align: left; padding: 8px; font-size: 12px; }
      td { padding: 8px; border-bottom: 1px solid #F3F4F6; font-size: 12px; }
      .cancelled-badge { background: #DC2626; color: white; padding: 2px 8px;
                         border-radius: 10px; font-size: 11px; margin-left: 8px; }
      .footer { text-align: center; margin-top: 24px; color: #9CA3AF; font-size: 11px; }
    </style></head>
    <body>
      <div class="header">
        <div class="college-name">K.C. College of Engineering</div>
        <div class="subtitle">Attendance Report — [ClassName] — [Date]</div>
      </div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-number">[totalLectures]</div>
          <div class="stat-label">Total Lectures</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">[totalPresent]</div>
          <div class="stat-label">Total Present</div>
        </div>
      </div>
      [For each session:]
      <div class="session-card">
        <div class="session-header">
          [Subject] [CANCELLED badge if applicable]
          <span style="float:right">[lectureStart] – [lectureEnd]</span>
          <div style="font-size:12px;opacity:0.8">Teacher: [teacherName]</div>
        </div>
        <div class="session-body">
          <table>
            <tr><th>#</th><th>Student Name</th><th>Scan Time</th></tr>
            [For each attendance record in this session:]
            <tr><td>[i]</td><td>[studentName]</td><td>[formatted markedAt]</td></tr>
          </table>
          <p>[count] students present</p>
        </div>
      </div>
      <div class="footer">Generated on [datetime] — Campus Attendance System</div>
    </body>
  </html>

════════════════════════════════════════════════════════════
 REPLIT WORKFLOW CONFIGURATION
════════════════════════════════════════════════════════════

API Server workflow command:
  pnpm --filter @workspace/api-server run dev
  which runs: export NODE_ENV=development && pnpm run build && pnpm run start

Mobile workflow command:
  pnpm --filter @workspace/mobile run dev
  which runs:
    EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN
    EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN
    EXPO_PUBLIC_REPL_ID=$REPL_ID
    REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN
    pnpm exec expo start --localhost --port $PORT

Each artifact binds to $PORT env var (unique per artifact).
Mobile app preview path: /
API server preview path: /api-server (or similar)

════════════════════════════════════════════════════════════
 ADDITIONAL MIGRATION DATA (add after seed)
════════════════════════════════════════════════════════════

After seedStore(), also run migrateCEStudents() and migrateCETeachers():

DEPARTMENT: Computer Engineering, code: CE

CLASS: CE-Y2-B (year: 2, division: B)

SUBJECTS for CE-Y2-B students:
  Web Technology, Operating System, DBMS, BMD, OE,
  WT LAB, OS LAB, DBMS LAB, BMD LAB, CT, DT, DT LAB

CE TEACHERS (password: teacher@123):
  Shweta Gaikwad   → ce.shweta.gaikwad@kccemsr.edu.in   → Web Technology, WT LAB
  Rujuta Dhon      → ce.rujuta.dhon@kccemsr.edu.in       → Operating System, OS LAB
  Ashwini Gaikwad  → ce.ashwini.gaikwad@kccemsr.edu.in   → DBMS, DBMS LAB
  Pranita Sangit   → ce.pranita.sangit@kccemsr.edu.in    → BMD, BMD LAB
  Monali Patil     → ce.monali.patil@kccemsr.edu.in      → CT, DT, DT LAB
  Ravi Prakash     → ce.ravi.prakash@kccemsr.edu.in      → OE

CE STUDENTS (64 total, roll 1-64, password: student@123):
  Email format: ce24.[firstname].[lastname]@kccemsr.edu.in
  Roll 1:  Kanojiya Aditya Ramjanam      → ce24.aditya.kanojiya@kccemsr.edu.in
  Roll 2:  Karkera Saakshi Pavan         → ce24.saakshi.karkera@kccemsr.edu.in
  Roll 3:  Karkera Samiksha Praveenkumar → ce24.samiksha.karkera@kccemsr.edu.in
  Roll 4:  Kasturi Shreya Venkatesh      → ce24.shreya.kasturi@kccemsr.edu.in
  Roll 5:  Kathe Ninad Shailesh          → ce24.ninad.kathe@kccemsr.edu.in
  Roll 6:  Kawle Leisha Kiran            → ce24.leisha.kawle@kccemsr.edu.in
  Roll 7:  Khade Atharva Aashish         → ce24.atharva.khade@kccemsr.edu.in
  Roll 8:  Khaire Vedant Datta           → ce24.vedant.khaire@kccemsr.edu.in
  Roll 9:  Khan Asif Md Ashfaque         → ce24.asif.khan@kccemsr.edu.in
  Roll 10: Khan Sania Mohd Yusuf         → ce24.sania.khan@kccemsr.edu.in
  Roll 11: Kharat Mayuresh Yogesh        → ce24.mayuresh.kharat@kccemsr.edu.in
  Roll 12: Kharatmol Saumya Sushil       → ce24.saumya.kharatmol@kccemsr.edu.in
  Roll 13: Khatal Akshata Avinash        → ce24.akshata.khatal@kccemsr.edu.in
  Roll 14: Khavanekar Jayesh Vishnu      → ce24.jayesh.khavanekar@kccemsr.edu.in
  Roll 15: Khedekar Shruti Balu          → ce24.shruti.khedekar@kccemsr.edu.in
  Roll 16: Kolambekar Yash Nilesh        → ce24.yash.kolambekar@kccemsr.edu.in
  Roll 17: Kotian Srishti Harish         → ce24.srishti.kotian@kccemsr.edu.in
  Roll 18: Parab Krupa Arvind            → ce24.krupa.parab@kccemsr.edu.in
  Roll 19: Kudalkar Aryan Rajendra       → ce24.aryan.kudalkar@kccemsr.edu.in
  Roll 20: Kundgar Sairaj Sandip         → ce24.sairaj.kundgar@kccemsr.edu.in
  Roll 21: Labana Meharsingh Harneksingh → ce24.meharsingh.labana@kccemsr.edu.in
  Roll 22: Lokhande Durva Sunil          → ce24.durva.lokhande@kccemsr.edu.in
  Roll 23: Lonkar Atharva Ganesh         → ce24.atharva.lonkar@kccemsr.edu.in
  Roll 24: Makannawar Yesshasvi Bahubali → ce24.yesshasvi.makannawar@kccemsr.edu.in
  Roll 25: Makhare Mahesh Raju           → ce24.mahesh.makhare@kccemsr.edu.in
  Roll 26: Mane Arya Arjun               → ce24.arya.mane@kccemsr.edu.in
  Roll 27: Manjrekar Aniruddha Dinesh    → ce24.aniruddha.manjrekar@kccemsr.edu.in
  Roll 28: Manjrekar Madhura Mahesh      → ce24.madhura.manjrekar@kccemsr.edu.in
  Roll 29: Mastkar Vibha Shankarlal      → ce24.vibha.mastkar@kccemsr.edu.in
  Roll 30: Mhaske Himanshu Nitin         → ce24.himanshu.mhaske@kccemsr.edu.in
  Roll 31: Mishra Aditya Sujeet          → ce24.aditya.mishra@kccemsr.edu.in
  Roll 32: Mohammad Akil Ahemad Kazi     → ce24.akil.mohammad@kccemsr.edu.in
  Roll 33: Mohanty Ritin Sushant         → ce24.ritin.mohanty@kccemsr.edu.in
  Roll 34: Mir Anees Nagesh              → ce24.anees.mir@kccemsr.edu.in
  Roll 35: Mori Dhruv Dinesh             → ce24.dhruv.mori@kccemsr.edu.in
  Roll 36: More Mrunal Sachin            → ce24.mrunal.more@kccemsr.edu.in
  Roll 37: Mourya Shivani Ghanshyam      → ce24.shivani.mourya@kccemsr.edu.in
  Roll 38: Mundhara Krishna Govind       → ce24.krishna.mundhara@kccemsr.edu.in
  Roll 39: Mungekar Bhavik Mahesh        → ce24.bhavik.mungekar@kccemsr.edu.in
  Roll 40: Nair Jiya Hari                → ce24.jiya.nair@kccemsr.edu.in
  Roll 41: Narvekar Vaishnavi Vasudev    → ce24.vaishnavi.narvekar@kccemsr.edu.in
  Roll 42: Nikam Siddhesh Nilesh         → ce24.siddhesh.nikam@kccemsr.edu.in
  Roll 43: Paithankar Devang Lumavati    → ce24.devang.paithankar@kccemsr.edu.in
  Roll 44: Pal Deepika Ramkumar          → ce24.deepika.pal@kccemsr.edu.in
  Roll 45: Pal Pratibha Brijendrakumar   → ce24.pratibha.pal@kccemsr.edu.in
  Roll 46: Palav Aayush Kanchan          → ce24.aayush.palav@kccemsr.edu.in
  Roll 47: Paradkar Rohan Nilesh         → ce24.rohan.paradkar@kccemsr.edu.in
  Roll 48: Shirke Parth Ajit             → ce24.parth.shirke@kccemsr.edu.in
  Roll 49: Patil Aradhya Kiran           → ce24.aradhya.patil@kccemsr.edu.in
  Roll 50: Patil Kasturi Sandeep         → ce24.kasturi.patil@kccemsr.edu.in
  Roll 51: Patil Rahul Arun              → ce24.rahul.patil@kccemsr.edu.in
  Roll 52: Patkar Raaj Satish            → ce24.raaj.patkar@kccemsr.edu.in
  Roll 53: Pawar Daivik Hemant           → ce24.daivik.pawar@kccemsr.edu.in
  Roll 54: Pawar Mahendra Suresh         → ce24.mahendra.pawar@kccemsr.edu.in
  Roll 55: Pawar Onkar Keshawrao         → ce24.onkar.pawar@kccemsr.edu.in
  Roll 56: Peddharaju Ramesh Veerla      → ce24.ramesh.peddharaju@kccemsr.edu.in
  Roll 57: Phadtare Harsh Sandesh        → ce24.harsh.phadtare@kccemsr.edu.in
  Roll 58: Kumbhar Sarthak Vinod         → ce24.sarthak.kumbhar@kccemsr.edu.in
  Roll 59: Gowda Nishant Manjunath       → ce24.nishant.gowda@kccemsr.edu.in
  Roll 60: Parulekar Vaishnavi           → ce24.vaishnavi.parulekar@kccemsr.edu.in
  Roll 61: Dalvi Abhishek                → ce24.abhishek.dalvi@kccemsr.edu.in
  Roll 62: Chaurasia Aditya              → ce24.aditya.chaurasia@kccemsr.edu.in
  Roll 63: Harmalkar Om                  → ce24.om.harmalkar@kccemsr.edu.in
  Roll 64: Pande Om                      → ce24.om.pande@kccemsr.edu.in

Both migration functions must be IDEMPOTENT:
  migrateCEStudents: skip if departments.some(d => d.code === 'CE')
  migrateCETeachers: skip if users.some(u => u.email === 'ce.shweta.gaikwad@kccemsr.edu.in')

Hash password ONCE per migration, reuse same hash for all users in that migration.

════════════════════════════════════════════════════════════
 ERROR BOUNDARY
════════════════════════════════════════════════════════════

Wrap root app in <ErrorBoundary> component.
ErrorBoundary is a class component with componentDidCatch.
On error: show centered "Something went wrong" card with retry button.
Never show blank white screen to user.

════════════════════════════════════════════════════════════
 FINAL NOTES
════════════════════════════════════════════════════════════

1. All API responses use snake_case JSON keys
2. All timestamps stored as ISO 8601 strings (new Date().toISOString())
3. All IDs generated as: Date.now().toString() + Math.random().toString(36).substr(2,9)
4. Session teacherId ALWAYS from req.session.userId — never trust client body
5. persistStore() called immediately after EVERY data mutation
6. staleTime for React Query: 30 seconds (30_000ms)
7. React Query cache invalidated after mutations with queryClient.invalidateQueries()
8. No window.location.reload() anywhere — always use React state/query invalidation
9. All .filter() and .map() on API data must guard with Array.isArray()
10. jsPDF must NEVER be a top-level import — always dynamic import on web only
11. Haptics on scan success: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
12. Haptics on scan error: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
13. The 'isProcessing' ref in scan screen prevents duplicate scans (useRef, not useState)
14. scannedTokens is a Set stored in useRef — persists across renders without re-render
15. Teacher subjects dropdown shows subjects from teacher's assignment matching selected class

BUILD THE ENTIRE SYSTEM EXACTLY AS SPECIFIED ABOVE. NO MOCKED DATA, NO SHORTCUTS.
```
