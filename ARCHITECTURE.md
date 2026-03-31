# Campus Attendance System - Complete Architecture Guide

## 🏗️ Project Structure Overview

```
artifacts/
├── mobile/                    # React Native + Expo mobile app
│   ├── app/
│   │   ├── _layout.tsx        # Root entry point
│   │   ├── index.tsx          # Home/gate check screen
│   │   ├── login.tsx          # Login screen
│   │   ├── (admin)/           # Admin role screens
│   │   ├── (teacher)/         # Teacher role screens
│   │   └── (student)/         # Student role screens
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state
│   ├── lib/
│   │   ├── query-client.ts    # API client setup
│   │   └── haversine.ts       # GPS distance calculations
│   └── components/            # Reusable UI components
│
├── api-server/                # Express.js backend
│   ├── src/
│   │   ├── app.ts             # Express setup & startup
│   │   ├── store.ts           # Data persistence logic
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, validation
│   │   └── lib/               # Utilities
│   └── dist/                  # Compiled JavaScript
│
└── mockup-sandbox/            # UI component preview
```

---

## 🔄 Complete Data Flow

### **1. App Launch (User Opens App)**

```
App Starts
    ↓
_layout.tsx loads
    ├─ Loads fonts
    ├─ Creates QueryClient (for caching)
    ├─ Wraps with AuthProvider (manages login state)
    └─ Wraps with SafeAreaProvider (handles notches/safe areas)
    ↓
User sees Login Screen OR their dashboard (if logged in)
```

### **2. User Login Flow**

```
User enters email & password on login.tsx
    ↓
Clicks "Login" button
    ↓
apiRequest("POST", "/auth/login", {email, password})
    ↓
Mobile app sends request to API server
    ↓
Backend checks:
    ├─ Email exists in store.users?
    ├─ Password hash matches?
    └─ Is role valid (admin/teacher/student)?
    ↓
Server responds with user object + session cookie
    ↓
AuthContext stores user in React state
    ↓
App navigates to user's dashboard (admin, teacher, or student)
```

### **3. Teacher Creates Attendance Session (QR Generation)**

```
Teacher taps "Start Attendance Session"
    ↓
Session setup form appears:
    ├─ Set lecture timing (start/end)
    ├─ Pick year/division/subject
    └─ Choose QR validity duration (1-30 min)
    ↓
Teacher taps "Generate QR"
    ↓
startSession() function runs:
    ├─ Tries to get teacher's GPS location (optional)
    │   ├─ Request permission
    │   ├─ Get current coordinates
    │   └─ Fallback to campus center if GPS fails/times out
    ├─ Generate unique token: SESSION_{userId}_{timestamp}_{random}
    ├─ Calculate expiry time: now + (duration × 60 seconds)
    └─ Send to backend
    ↓
Backend (POST /sessions):
    ├─ Validate all required fields
    ├─ Sanitize latitude/longitude (validate range)
    ├─ Create session object with teacher's location
    ├─ Store in memory (store.sessions array)
    ├─ Save to .data.json disk file
    └─ Return session to app
    ↓
Mobile app:
    ├─ Displays QR code on screen
    ├─ Shows countdown timer
    ├─ Updates timer every second
    └─ When timer hits 0: mark session as "expired"
```

### **4. Student Scans QR Code (Marking Attendance)**

```
Student opens app → goes to "Scan QR" tab
    ↓
Taps "Open Scanner"
    ↓
App requests camera permission
    ↓
Camera view opens with QR frame overlay
    ↓
Student points camera at teacher's QR code
    ↓
Camera detects QR → handleScan() function runs:
    ├─ Extract data from QR (the qrToken)
    ├─ Validate token starts with "SESSION_"
    ├─ Try to get student's GPS location:
    │   ├─ Request permission (if not already granted)
    │   ├─ Wait max 3 seconds for GPS
    │   └─ If GPS timeout/fails: continue anyway (GPS optional)
    └─ Send attendance request
    ↓
Mobile sends to backend (POST /attendance):
    {
      qrToken: "SESSION_user123_1234567890_abc123",
      latitude: 19.1805,  // optional if GPS failed
      longitude: 72.9808
    }
    ↓
Backend (POST /attendance) validates:
    ├─ Is qrToken valid?
    ├─ Does session exist?
    ├─ Has session expired?
    ├─ Does student's class match session's class?
    ├─ Did student already mark attendance for this session?
    ├─ If GPS provided:
    │   ├─ Validate lat/lng are valid numbers in range
    │   ├─ Calculate distance to teacher's location
    │   └─ If >200m away: REJECT ("too far")
    └─ All checks pass?
    ↓
Backend creates attendance record:
    {
      id: unique ID,
      studentId: student's ID,
      sessionId: session's ID,
      markedAt: timestamp,
      studentName: "Priya Mehta",
      className: "CS-Y1-A",
      subject: "Data Structures",
      teacherName: "Anita Sharma"
    }
    ↓
Store record in memory + save to .data.json
    ↓
Backend responds success
    ↓
Mobile app shows green checkmark: "Attendance Marked!"
```

### **5. Admin Views Reports**

```
Admin logs in → opens "Reports" tab
    ↓
Selects a class (e.g., "CS-Y1-A")
    ↓
App fetches:
    ├─ GET /sessions/by-class?className=CS-Y1-A
    │   └─ Returns all sessions (including cancelled ones)
    └─ GET /attendance?className=CS-Y1-A
        └─ Returns all attendance records
    ↓
Backend queries:
    ├─ Find all sessions where className = "CS-Y1-A"
    ├─ Find all attendance where className = "CS-Y1-A"
    ├─ For each session, join with teacher data to get teacherName
    └─ Return arrays to mobile
    ↓
Mobile app displays:
    ├─ Calendar with dots on dates when sessions occurred
    ├─ Click a date → see all sessions that day
    │   ├─ Session 1: Math, 9:00-10:00, Teacher: Anita, 15 present
    │   └─ Session 2: Physics, 10:15-11:15, Teacher: Anita, 12 present
    └─ Tap a session → see student list with scan times
    ↓
Admin can:
    ├─ Export as PDF (uses expo-print for native rendering)
    └─ Share or save PDF
```

---

## 📁 Key Folders & Their Purpose

### **artifacts/mobile/** - The User-Facing App

**Why exists:** React Native app runs on phones/tablets

**Structure:**
- `app/` - Screen files (pages/routes)
- `contexts/` - Global state (who is logged in)
- `lib/` - Utility functions
- `components/` - Reusable UI pieces

### **artifacts/api-server/** - The Brain (Backend)

**Why exists:** Handles data, validates rules, enforces security

**Key files:**
- `store.ts` - Database in memory + disk persistence
- `app.ts` - Express server setup
- `routes/` - API endpoints

### **artifacts/mockup-sandbox/** - UI Preview Tool

**Why exists:** Developers can preview UI components in isolation (like Storybook)

---

## 🔐 Authentication Flow

### **Session Management**

```javascript
// User logs in once
→ Server creates session (express-session)
→ Session stored in browser/app cookies
→ Every API request automatically includes cookies
→ Server validates cookie on each request

// When user logs out
→ Session destroyed on server
→ App clears user state
→ Redirects to login screen
```

### **Role-Based Access**

```javascript
// Backend middleware checks:
requireAuth         → Is user logged in?
requireRole("admin") → Is user an admin?

// Example: Only admins can view attendance reports
router.get("/attendance", requireAuth, requireRole("admin"), (req, res) => {
  // If user isn't admin, return 403 Forbidden
})
```

---

## 💾 Data Persistence (Why .data.json Exists)

### **Problem:** Traditional In-Memory Storage Lost Data on Restart
```
Before: User creates session → Server crashes → Data lost
After:  User creates session → Auto-saved to .data.json → Survives restart
```

### **How It Works**

```typescript
// store.ts
const STORE_FILE = ".data.json"  // File on disk

function loadStore() {
  // On startup: read .data.json and load into memory
  if (file exists) {
    data = readFile(STORE_FILE)
    store = JSON.parse(data)
  }
}

function persistStore() {
  // After every change: write memory back to .data.json
  writeFile(STORE_FILE, JSON.stringify(store))
}

// routes/attendance.ts
store.attendance.push(record)  // Add to memory
persistStore()                 // Save to disk immediately
```

**Flow:**
```
1. Server starts → loadStore() → reads .data.json
2. Teacher creates session → persistStore() → writes to .data.json
3. Student marks attendance → persistStore() → writes to .data.json
4. Server crashes/restarts → loadStore() → all data is back!
```

---

## 🗺️ GPS & Proximity System

### **Why GPS?**
Ensures students are physically present in class (can't mark attendance remotely)

### **How It Works**

```javascript
// When teacher creates session:
teacher_location = {
  latitude: 19.1805,
  longitude: 72.9808
}
// Stored with session in database

// When student scans:
student_location = getCurrentLocation()
distance = haversine(student_location, teacher_location)

if (distance > 200) {
  reject("You are 250m away, must be within 200m")
} else {
  allow_attendance()
}
```

### **Haversine Formula** (calculates distance between two coordinates)

```typescript
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000  // Earth radius in meters
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLng/2)
  const distance = R × 2 × atan2(√a, √(1-a))
  
  return distance  // in meters
}
```

---

## 🔌 API Endpoints (Backend Routes)

### **Authentication**
```
POST /auth/login          Login with email/password
POST /auth/logout         Clear session
GET /auth/me              Get current user info
```

### **Sessions (QR Management)**
```
POST /sessions            Teacher creates new session
GET /sessions/my          Teacher gets their sessions
GET /sessions/active      Get all active sessions (for students)
POST /sessions/:id/cancel Teacher cancels session
GET /sessions/by-class    Admin views sessions for a class
```

### **Attendance (Mark Presence)**
```
POST /attendance          Student marks attendance by scanning QR
GET /attendance/my        Student gets their attendance records
GET /attendance           Admin gets all attendance records
DELETE /attendance/:id    Teacher deletes an attendance record
```

### **Users & Data**
```
GET /users               Get all users (admin only)
GET /departments         Get departments
GET /classes             Get classes
```

---

## 🎯 State Management

### **AuthContext** (Who am I?)

```typescript
// Stored in React Context
const auth = {
  user: {
    id: "123",
    name: "Priya Mehta",
    email: "priya@campus.edu",
    role: "student",
    className: "CS-Y1-A"
  },
  isLoggedIn: true,
  login: (email, password) => { /* API call */ },
  logout: () => { /* destroy session */ }
}
```

### **React Query** (Caching API Data)

```typescript
// Instead of manually fetching:
const [data, setData] = useState(null)
useEffect(() => {
  fetch('/api/attendance').then(setData)
}, [])

// We use React Query:
const { data } = useQuery({
  queryKey: ["attendance"],
  queryFn: () => apiRequest("GET", "/attendance")
})
// ✅ Auto-retries failed requests
// ✅ Caches data (30s default)
// ✅ Syncs across tabs
// ✅ Background refresh
```

---

## 📱 Screen Flow (Navigation)

### **Unauthorized User**
```
App Launch
    ↓
Check AuthContext.isLoggedIn?
    ├─ NO → Login Screen
    │       ├─ Email input
    │       ├─ Password input
    │       └─ Demo quick-login buttons
    │           ↓
    │       [Success] → Next step
    │
    └─ YES → Check user.role
```

### **Admin User**
```
Dashboard (overview stats)
    ↓
├─ Students (list + search)
├─ Teachers (list + search)
├─ Reports (calendar view + PDF export)
└─ Departments (class hierarchy)
```

### **Teacher User**
```
Dashboard (today's schedule)
    ↓
├─ Session (create QR code)
├─ History (past sessions)
└─ Attendance (see who scanned for each session)
```

### **Student User**
```
Dashboard (my attendance stats)
    ↓
├─ Scan QR (camera screen)
├─ Profile (my info + subjects)
└─ Attendance (my attendance history)
```

---

## 🛡️ Security Features

| Feature | How It Works |
|---------|-------------|
| **Session Auth** | Cookies validated on every request |
| **Role-Based Access** | Endpoints check `requireRole("admin")` etc |
| **GPS Validation** | Backend validates student is within 200m |
| **Password Hashing** | Passwords hashed with bcrypt, never stored plain |
| **Input Validation** | GPS coords, times, class names validated |
| **QR Token** | Unique per session, used once for attendance |

---

## 🔄 Example: Complete Student Attendance Journey

```
1. Student opens app
   → AuthContext loaded → user data cached
   
2. Student taps "Scan QR"
   → Camera screen opens → asks for permissions
   
3. Teacher holds QR code in front of camera
   → Camera detects → extracts token
   
4. App requests location:
   → "Allow location?" → User grants
   → Gets student's latitude/longitude
   
5. App sends to backend:
   → {qrToken, latitude, longitude}
   
6. Backend validates:
   ✓ Token is valid
   ✓ Session exists & not expired
   ✓ Student class matches session class
   ✓ Student within 200m of teacher
   ✓ Not already marked
   
7. Backend creates & saves record:
   → Added to store.attendance array
   → Immediately written to .data.json
   
8. Mobile app receives success
   → Shows green checkmark
   → "Attendance Marked!"
   
9. Student can:
   ✓ Open "My Attendance" → sees record immediately
   ✓ Admin can see report → includes this attendance
   ✓ Teacher can see → student list with times
   
10. Server crashes/restarts
    → All attendance records survive
    → .data.json is reloaded
    → Nothing lost!
```

---

## 🚀 Why This Architecture?

| Choice | Benefit |
|--------|---------|
| **React Native + Expo** | One codebase for iOS/Android, no native coding |
| **Express.js** | Simple, fast, perfect for CRUD + validation |
| **In-Memory Store** | Ultra-fast, simple (no SQL needed) |
| **File-Based Persistence** | Simple deployment, no database infrastructure |
| **React Query** | Efficient caching, automatic retries, syncing |
| **GPS Proximity** | Prevents cheating, ensures physical presence |
| **QR Codes** | Fast scanning, unique per session, time-limited |

---

## 📊 Data Model

### **Users**
```typescript
{
  id: "unique_id",
  name: "Priya Mehta",
  email: "priya@campus.edu",
  role: "student" | "teacher" | "admin",
  className: "CS-Y1-A",
  department: "Computer Science",
  passwordHash: "bcrypt_hash_not_plaintext",
  subjects: ["Data Structures", "Algorithms"]
}
```

### **Sessions**
```typescript
{
  id: "unique_id",
  teacherId: "teacher_id",
  className: "CS-Y1-A",
  qrToken: "SESSION_..._unique_token",
  latitude: 19.1805,
  longitude: 72.9808,
  expiresAt: "2026-03-31T10:00:00Z",
  subject: "Data Structures",
  lectureStart: "09:00",
  lectureEnd: "10:00",
  cancelledAt: null,  // null = active, set if cancelled
  blockedStudents: []
}
```

### **Attendance**
```typescript
{
  id: "unique_id",
  studentId: "student_id",
  studentName: "Priya Mehta",
  sessionId: "session_id",
  className: "CS-Y1-A",
  markedAt: "2026-03-31T09:15:00Z",
  subject: "Data Structures",
  teacherName: "Anita Sharma"
}
```

---

This covers the complete architecture! Any specific part you'd like me to explain further?
