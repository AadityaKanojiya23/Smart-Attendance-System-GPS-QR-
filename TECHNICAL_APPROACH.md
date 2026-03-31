# 🛠️ Technical Approach - Campus Attendance System

Complete technical stack, code examples, libraries, and implementation details.

---

## 📊 TECH STACK OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React Native + Expo)              │
├─────────────────────────────────────────────────────────────────┤
│ Language: TypeScript                                             │
│ Framework: React Native 0.73+                                    │
│ Runtime: Expo SDK 54                                             │
│ State: React Context + @tanstack/react-query                    │
│ Routing: expo-router (file-based)                               │
│ UI Components: @expo/vector-icons, expo-linear-gradient         │
│ Location: expo-location                                          │
│ Camera: expo-camera                                              │
│ QR Code: react-native-qrcode-svg                                │
│ PDF Export: jsPDF + expo-print + expo-sharing                   │
│ HTTP Client: Fetch API (built-in)                               │
│ Safe Area: react-native-safe-area-context                       │
│ Keyboard: react-native-keyboard-controller                      │
│ Gesture: react-native-gesture-handler                           │
│ Font: expo-google-fonts (Inter)                                 │
│ Package Manager: pnpm                                            │
│ Build Tool: Metro Bundler (Expo)                                │
│ Deployment: EAS (Expo Application Services)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js + Node.js)                │
├─────────────────────────────────────────────────────────────────┤
│ Language: TypeScript                                             │
│ Runtime: Node.js 18+                                             │
│ Framework: Express.js 4.18+                                      │
│ Auth: express-session (cookie-based)                            │
│ Password: bcryptjs                                               │
│ CORS: cors middleware                                            │
│ Body Parser: express.json(), express.urlencoded()               │
│ Logging: pino                                                     │
│ Build: esbuild (fast bundler)                                    │
│ Package Manager: pnpm                                            │
│ Environment: .env support (custom)                               │
│ Session Store: Memory (default, can extend)                      │
│ Deployment: Replit, AWS, Firebase, etc.                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE / STORAGE                           │
├─────────────────────────────────────────────────────────────────┤
│ Type: File-based JSON persistence                                │
│ Storage: .data.json (human-readable)                            │
│ Location: Project root on disk                                  │
│ Format: JSON (serialized objects)                               │
│ Load: On server startup (loadStore())                           │
│ Save: After every create/update/delete (persistStore())         │
│ Backup: Automatic (persistent across restarts)                  │
│ Scalability: Can upgrade to PostgreSQL/Firebase                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 FRONTEND TECHNICAL DETAILS

### **Directory Structure**
```
artifacts/mobile/
├── app/
│   ├── _layout.tsx              # Root layout (providers, fonts)
│   ├── index.tsx                # Home/gate check screen
│   ├── login.tsx                # Login screen
│   ├── (admin)/
│   │   ├── _layout.tsx          # Admin tab layout
│   │   ├── index.tsx            # Dashboard
│   │   ├── students.tsx         # Student management
│   │   ├── teachers.tsx         # Teacher management
│   │   ├── reports.tsx          # Reports with PDF export
│   │   └── departments.tsx      # Department hierarchy
│   ├── (teacher)/
│   │   ├── _layout.tsx          # Teacher tab layout
│   │   ├── index.tsx            # Dashboard
│   │   ├── session.tsx          # QR generation
│   │   └── history.tsx          # Session history
│   └── (student)/
│       ├── _layout.tsx          # Student tab layout
│       ├── index.tsx            # Dashboard
│       ├── scan.tsx             # QR scanner
│       └── profile.tsx          # Student profile
├── contexts/
│   └── AuthContext.tsx          # Authentication state
├── components/
│   ├── GradientHeader.tsx       # Header component
│   ├── StatCard.tsx             # Stat display
│   ├── ErrorBoundary.tsx        # Error catching
│   └── ...other components
├── lib/
│   ├── query-client.ts          # React Query + API setup
│   └── haversine.ts             # GPS calculations
├── constants/
│   └── colors.ts                # Color scheme
└── app.json                     # Expo configuration
```

### **Key Frontend Files & Code Examples**

#### **1. AuthContext.tsx** (Global State Management)
```typescript
import React, { createContext, useState, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  className?: string;
  department?: string;
  subjects?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // API call to logout on backend
    apiRequest('POST', '/auth/logout', {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be within AuthProvider');
  return context;
}
```

#### **2. lib/query-client.ts** (API Client)
```typescript
import { QueryClient } from '@tanstack/react-query';

let baseUrl = '';

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, '');
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,           // Auto-retry failed requests
      staleTime: 1000 * 30, // Cache for 30 seconds
    },
  },
});

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${baseUrl}/api${path}`;
  
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Send cookies
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}
```

#### **3. app/(student)/scan.tsx** (QR Scanner)
```typescript
import React, { useState, useRef } from 'react';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { apiRequest } from '@/lib/query-client';

export default function ScanScreen() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'processing'>('idle');

  async function handleScan({ data }: { data: string }) {
    if (!data.startsWith('SESSION_')) return; // Validate token format

    setScanState('processing');

    try {
      // Get student location (optional, with timeout)
      let lat: number | undefined;
      let lng: number | undefined;

      if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const locPromise = Location.getCurrentPositionAsync({ timeout: 3000 });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('GPS timeout')), 3500)
            );
            try {
              const loc = await Promise.race([locPromise, timeoutPromise]) as any;
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;
            } catch (locErr) {
              console.warn('GPS unavailable:', locErr);
            }
          }
        } catch {}
      }

      // Send attendance with GPS (optional)
      const record = await apiRequest('POST', '/attendance', {
        qrToken: data,
        latitude: lat,
        longitude: lng,
      });

      setScanState('success');
      // UI shows checkmark for 2.5s then returns to scanner
    } catch (e: any) {
      setScanState('error');
      // Show error message
    }
  }

  return (
    <View>
      {/* Camera view with QR detection */}
      <CameraView onBarcodeScanned={handleScan} />
    </View>
  );
}
```

#### **4. app/(admin)/reports.tsx** (Data Fetching & PDF Export)
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/query-client';

export default function ReportsScreen() {
  const [selectedClass, setSelectedClass] = useState('CS-Y1-A');

  // Fetch sessions for class
  const { data: sessions } = useQuery({
    queryKey: ['admin-class-sessions', selectedClass],
    queryFn: () => apiRequest('GET', `/sessions/by-class?className=${selectedClass}`),
  });

  // Fetch attendance for class
  const { data: attendance } = useQuery({
    queryKey: ['admin-attendance', selectedClass],
    queryFn: () => apiRequest('GET', `/attendance?className=${selectedClass}`),
  });

  async function exportDayPDF(dateLabel: string, daySessions: any[]) {
    // On mobile: use expo-print
    if (Platform.OS !== 'web') {
      const html = buildAttendanceHtml(dateLabel, selectedClass, daySessions);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      return;
    }

    // On web: use jsPDF
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    // ... add content
    doc.save(`Attendance_${selectedClass}.pdf`);
  }

  return (
    <View>
      <Picker selectedValue={selectedClass} onValueChange={setSelectedClass}>
        {/* Class options */}
      </Picker>
      {/* Calendar view */}
      {/* PDF export button */}
    </View>
  );
}
```

### **Frontend Libraries Used**

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.73+ | Mobile UI framework |
| `expo` | 54+ | Runtime & development |
| `expo-router` | 6.0+ | File-based routing |
| `@tanstack/react-query` | 5.0+ | Data fetching & caching |
| `@expo/vector-icons` | latest | 100+ icons |
| `expo-location` | 55+ | GPS/location services |
| `expo-camera` | 56+ | Camera access for QR scanning |
| `react-native-qrcode-svg` | 6.2+ | QR code generation |
| `jspdf` | 2.5+ | PDF generation (web) |
| `expo-print` | 55+ | PDF generation (native) |
| `expo-sharing` | 55+ | Share functionality |
| `expo-linear-gradient` | 12+ | Gradient UI |
| `react-native-gesture-handler` | 2.0+ | Gesture support |
| `react-native-keyboard-controller` | 1.21+ | Keyboard handling |
| `react-native-safe-area-context` | 4.7+ | Safe area support |
| `expo-google-fonts/inter` | latest | Inter font family |
| `typescript` | 5.0+ | Type safety |

---

## ⚙️ BACKEND TECHNICAL DETAILS

### **Directory Structure**
```
artifacts/api-server/
├── src/
│   ├── app.ts                   # Express app setup
│   ├── index.ts                 # Server entry point
│   ├── store.ts                 # In-memory store + persistence
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── auth.ts              # Login/logout
│   │   ├── sessions.ts          # QR session management
│   │   ├── attendance.ts        # Mark attendance
│   │   ├── users.ts             # User management
│   │   └── classes.ts           # Class/department data
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   └── error.ts             # Error handling
│   └── lib/
│       ├── haversine.ts         # GPS distance calculation
│       └── logger.ts            # Logging setup
├── dist/                        # Compiled JavaScript
├── build.mjs                    # Build configuration
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

### **Key Backend Files & Code Examples**

#### **1. src/store.ts** (Database + Persistence)
```typescript
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const STORE_FILE = join(process.cwd(), '.data.json');

// Interfaces
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  className?: string;
  subjects?: string[];
  passwordHash: string;
}

export interface StoredSession {
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
  blockedStudents?: string[];
  cancelledAt?: string;
}

export interface StoredAttendance {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  className: string;
  markedAt: string;
  subject?: string;
  teacherName?: string;
}

interface Store {
  users: StoredUser[];
  sessions: StoredSession[];
  attendance: StoredAttendance[];
  departments: StoredDepartment[];
  classes: StoredClass[];
}

let store: Store = {
  users: [],
  sessions: [],
  attendance: [],
  departments: [],
  classes: [],
};

// Load from disk on startup
export function loadStore(): void {
  try {
    if (existsSync(STORE_FILE)) {
      const data = readFileSync(STORE_FILE, 'utf-8');
      store = JSON.parse(data);
      console.log('Store loaded from disk');
      return;
    }
  } catch (e) {
    console.error('Failed to load store:', e);
  }
}

// Save to disk after every change
export function persistStore(): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist store:', e);
  }
}

// Get store (in-memory access)
export function getStore(): Store {
  return store;
}

// Seed demo accounts (only on first run)
export async function seedStore(): Promise<void> {
  if (store.users.length > 0) return; // Already seeded

  const adminHash = await bcrypt.hash('admin123', 10);
  const teacherHash = await bcrypt.hash('teacher123', 10);
  const studentHash = await bcrypt.hash('student123', 10);

  store.users.push(
    {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@campus.edu',
      role: 'admin',
      passwordHash: adminHash,
    },
    {
      id: 'teacher-1',
      name: 'Anita Sharma',
      email: 'anita@campus.edu',
      role: 'teacher',
      className: 'CS-Y1-A',
      subjects: ['Data Structures', 'Algorithms'],
      passwordHash: teacherHash,
    },
    {
      id: 'student-1',
      name: 'Priya Mehta',
      email: 'priya@campus.edu',
      role: 'student',
      className: 'CS-Y1-A',
      subjects: ['Data Structures', 'Algorithms'],
      passwordHash: studentHash,
    },
    // ... more users
  );

  // Save seeded data to disk
  persistStore();
}
```

#### **2. src/routes/auth.ts** (Authentication)
```typescript
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getStore } from '../store.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const store = getStore();
  const user = store.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password hash
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  (req.session as any).userId = user.id;
  (req.session as any).userRole = user.role;

  // Return user (without password)
  const { passwordHash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const store = getStore();
  const user = store.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const { passwordHash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

export default router;
```

#### **3. src/routes/sessions.ts** (QR Session Management)
```typescript
import { Router } from 'express';
import { getStore, persistStore } from '../store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /sessions - Create session (Teacher only)
router.post('/', requireAuth, requireRole('teacher'), (req, res) => {
  const {
    className,
    latitude,
    longitude,
    qrToken,
    expiresAt,
    subject,
    lectureStart,
    lectureEnd,
    durationSecs,
  } = req.body;

  const teacherId = (req.session as any).userId; // From session, not body!

  // Validate inputs
  if (!className || !qrToken || !expiresAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate & sanitize GPS
  const lat =
    typeof latitude === 'number' && isFinite(latitude) && latitude >= -90 && latitude <= 90
      ? latitude
      : 19.180010063951876; // Campus center fallback
  const lng =
    typeof longitude === 'number' && isFinite(longitude) && longitude >= -180 && longitude <= 180
      ? longitude
      : 72.98054933658015; // Campus center fallback

  // Create session
  const session = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    teacherId,
    className,
    latitude: lat,
    longitude: lng,
    qrToken,
    expiresAt,
    createdAt: new Date().toISOString(),
    subject: subject ?? undefined,
    lectureStart: lectureStart ?? undefined,
    lectureEnd: lectureEnd ?? undefined,
    durationSecs: durationSecs ?? undefined,
    blockedStudents: [] as string[],
  };

  const store = getStore();
  store.sessions.push(session);
  persistStore(); // SAVE TO DISK

  res.json(session);
});

// GET /sessions/by-class - Get sessions for class (Admin only)
router.get('/by-class', requireAuth, requireRole('admin'), (req, res) => {
  const { className } = req.query;
  const store = getStore();

  if (!className) {
    return res.json([]);
  }

  const sessions = store.sessions
    .filter(s => s.className === className)
    .reverse()
    .map(s => {
      const teacher = store.users.find(u => u.id === s.teacherId);
      return { ...s, teacherName: teacher?.name };
    });

  res.json(sessions);
});

// POST /sessions/:id/cancel - Cancel session (Teacher only)
router.post('/:id/cancel', requireAuth, requireRole('teacher'), (req, res) => {
  const userId = (req.session as any).userId;
  const store = getStore();
  const session = store.sessions.find(s => s.id === req.params.id);

  if (!session || session.teacherId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  session.cancelledAt = new Date().toISOString();
  persistStore(); // SAVE TO DISK

  res.json({ success: true });
});

export default router;
```

#### **4. src/routes/attendance.ts** (Mark Attendance)
```typescript
import { Router } from 'express';
import { getStore, persistStore } from '../store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const SCAN_PROXIMITY_M = 200;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const router = Router();

// POST /attendance - Mark attendance (Student only)
router.post('/', requireAuth, requireRole('student'), (req, res) => {
  const { qrToken, latitude, longitude } = req.body;
  const userId = (req.session as any).userId;
  const store = getStore();
  const student = store.users.find(u => u.id === userId);

  if (!student) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Find session by QR token
  const session = store.sessions.find(s => s.qrToken === qrToken);
  if (!session) {
    return res.status(404).json({ error: 'Invalid QR code. Session not found.' });
  }

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'This session has expired.' });
  }

  // GPS validation (optional)
  if (latitude != null && longitude != null) {
    // Validate GPS coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !isFinite(latitude) ||
      !isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ error: 'Invalid location.' });
    }

    // Check proximity if session has location
    if (session.latitude != null && session.longitude != null) {
      const distance = haversineDistance(latitude, longitude, session.latitude, session.longitude);
      if (distance > SCAN_PROXIMITY_M) {
        return res.status(400).json({
          error: `You are too far. ${Math.round(distance)}m away — must be within ${SCAN_PROXIMITY_M}m.`,
        });
      }
    }
  }

  // Check class match
  if (student.className !== session.className) {
    return res.status(400).json({ error: 'Class mismatch.' });
  }

  // Check not already marked
  const alreadyMarked = store.attendance.find(
    a => a.sessionId === session.id && a.studentId === userId
  );
  if (alreadyMarked) {
    return res.status(400).json({ error: 'Attendance already marked.' });
  }

  // Create attendance record
  const teacher = store.users.find(u => u.id === session.teacherId);
  const record = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    studentId: userId,
    studentName: student.name,
    sessionId: session.id,
    className: session.className,
    markedAt: new Date().toISOString(),
    subject: session.subject,
    lectureStart: session.lectureStart,
    lectureEnd: session.lectureEnd,
    teacherName: teacher?.name,
  };

  store.attendance.push(record);
  persistStore(); // SAVE TO DISK

  res.json(record);
});

// GET /attendance - Get all attendance (Admin only)
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const { className, date } = req.query;
  const store = getStore();

  let records = store.attendance.slice();

  if (className) {
    records = records.filter(a => a.className === className);
  }

  if (date) {
    records = records.filter(a => {
      const d = new Date(a.markedAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === date;
    });
  }

  res.json(records.reverse());
});

export default router;
```

#### **5. src/middleware/auth.ts** (Security)
```typescript
import { Request, Response, NextFunction } from 'express';
import { getStore } from '../store.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    const store = getStore();
    const user = store.users.find(u => u.id === userId);

    if (!user || user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
```

#### **6. src/app.ts** (Server Setup)
```typescript
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import router from './routes/index.js';
import { loadStore, seedStore } from './store.js';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'campus-attendance-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Routes
app.use('/api', router);

// Load store from disk
loadStore();

// Seed demo accounts (only first run)
seedStore().then(() => {
  console.log('Demo accounts seeded');
});

export default app;
```

### **Backend Libraries Used**

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.18+ | Web framework |
| `typescript` | 5.0+ | Type safety |
| `bcryptjs` | 2.4+ | Password hashing |
| `express-session` | 1.17+ | Cookie-based auth |
| `cors` | 2.8+ | Cross-origin requests |
| `pino` | 8.0+ | Logging |
| `esbuild` | 0.27+ | Build tool |
| `node-fetch` | (built-in) | HTTP requests |

---

## 🗄️ DATABASE STRUCTURE & PERSISTENCE

### **JSON Storage (.data.json)**

```json
{
  "users": [
    {
      "id": "admin-1",
      "name": "Admin User",
      "email": "admin@campus.edu",
      "role": "admin",
      "passwordHash": "$2b$10$hashedpassword...",
      "className": null,
      "subjects": null
    },
    {
      "id": "teacher-1",
      "name": "Anita Sharma",
      "email": "anita@campus.edu",
      "role": "teacher",
      "className": "CS-Y1-A",
      "subjects": ["Data Structures", "Algorithms"],
      "passwordHash": "$2b$10$hashedpassword..."
    },
    {
      "id": "student-1",
      "name": "Priya Mehta",
      "email": "priya@campus.edu",
      "role": "student",
      "className": "CS-Y1-A",
      "subjects": ["Data Structures", "Algorithms"],
      "passwordHash": "$2b$10$hashedpassword..."
    }
  ],
  "sessions": [
    {
      "id": "1704067200123abc123",
      "teacherId": "teacher-1",
      "className": "CS-Y1-A",
      "latitude": 19.1805,
      "longitude": 72.9808,
      "qrToken": "SESSION_teacher-1_1704067200123_abc123xyz",
      "expiresAt": "2026-03-31T10:05:00Z",
      "createdAt": "2026-03-31T10:00:00Z",
      "subject": "Data Structures",
      "lectureStart": "09:00",
      "lectureEnd": "10:00",
      "durationSecs": 300,
      "blockedStudents": [],
      "cancelledAt": null
    }
  ],
  "attendance": [
    {
      "id": "1704067320456def456",
      "studentId": "student-1",
      "studentName": "Priya Mehta",
      "sessionId": "1704067200123abc123",
      "className": "CS-Y1-A",
      "markedAt": "2026-03-31T10:02:30Z",
      "subject": "Data Structures",
      "lectureStart": "09:00",
      "lectureEnd": "10:00",
      "teacherName": "Anita Sharma"
    }
  ],
  "departments": [
    {
      "id": "dept-cs-1",
      "name": "Computer Science",
      "code": "CS",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "classes": [
    {
      "id": "class-cs-y1-a",
      "departmentId": "dept-cs-1",
      "departmentCode": "CS",
      "year": 1,
      "division": "A",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### **Persistence Flow**

```
1. Server starts
   ├─ loadStore() called
   └─ Read .data.json from disk
            ↓
2. Parse JSON
   └─ Convert to JavaScript objects
            ↓
3. Load into memory (store variable)
   ├─ store.users = [...]
   ├─ store.sessions = [...]
   ├─ store.attendance = [...]
   └─ store.departments = [...]
            ↓
4. User creates data (session/attendance)
   ├─ Add to memory array
   ├─ Example: store.sessions.push(newSession)
   └─ Continue
            ↓
5. Call persistStore()
   ├─ Serialize entire store to JSON
   ├─ Write to .data.json file
   └─ Sync to disk immediately
            ↓
6. Server restarts
   ├─ All old data is in .data.json
   ├─ loadStore() reads it back
   └─ Zero data loss!
```

---

## 🌐 API ENDPOINTS REFERENCE

### **Authentication Routes**
```
POST   /api/auth/login        → Login with email/password
POST   /api/auth/logout       → Destroy session
GET    /api/auth/me           → Get current user info
```

### **Session Routes (QR Management)**
```
POST   /api/sessions          → Create new session (teacher)
GET    /api/sessions/my       → Get teacher's sessions
GET    /api/sessions/active   → Get all active sessions
GET    /api/sessions/class    → Get sessions for student's class
GET    /api/sessions/by-class → Get sessions for class (admin)
GET    /api/sessions/:id/attendance → Get attendance for session
POST   /api/sessions/:id/cancel     → Cancel session
POST   /api/sessions/:id/block/:studentId → Block student
```

### **Attendance Routes**
```
POST   /api/attendance        → Mark attendance by scanning QR
GET    /api/attendance/my     → Get student's attendance
GET    /api/attendance        → Get all attendance (admin, filterable)
DELETE /api/attendance/:id    → Delete attendance record
```

### **Data Routes**
```
GET    /api/users             → Get all users (admin)
GET    /api/departments       → Get all departments
GET    /api/classes           → Get all classes
```

---

## 🔒 SECURITY IMPLEMENTATION

### **Password Hashing (bcryptjs)**
```typescript
// Before storing
const passwordHash = await bcrypt.hash(plainPassword, 10);
// Salt rounds = 10 (higher = more secure but slower)

// During login
const isValid = await bcrypt.compare(plainPassword, storedHash);
```

### **Session-Based Authentication**
```typescript
// After successful login
req.session.userId = user.id;
req.session.userRole = user.role;

// Cookie automatically sent with each request
// credentials: 'include' in fetch options

// Middleware validates
if (!req.session.userId) return 401 Unauthorized;
```

### **Role-Based Access Control**
```typescript
// Middleware checks
router.post('/endpoint', requireAuth, requireRole('admin'), handler);

// Only logged in + admin users can access
// Others get 403 Forbidden
```

### **Input Validation**
```typescript
// GPS validation
if (
  typeof latitude !== 'number' ||
  !isFinite(latitude) ||
  latitude < -90 ||
  latitude > 90
) {
  return 400 { error: 'Invalid latitude' };
}

// Prevents injection attacks & invalid data
```

---

## 📈 SCALABILITY & FUTURE UPGRADES

### **Current Setup (File-Based)**
```
Pro: Simple, no setup, works immediately
Con: Single file, not for 10,000+ users
```

### **Upgrade Path 1: PostgreSQL**
```typescript
// Instead of: getStore().users
// Use: await db.query('SELECT * FROM users')

// Install: npm install pg
import pg from 'pg';
const pool = new pg.Pool({ /* config */ });
```

### **Upgrade Path 2: Firebase**
```typescript
// Instead of: persistStore()
// Use: await db.collection('store').doc('main').set(store)

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
```

### **Upgrade Path 3: MongoDB**
```typescript
// Instead of: store.sessions.push(session)
// Use: await sessions.insertOne(session)

import { MongoClient } from 'mongodb';
const client = new MongoClient(url);
```

**The great part**: Frontend code **doesn't change at all**!
Only backend `/src/store.ts` needs updating.

---

## 🚀 DEPLOYMENT TECHNOLOGIES

### **Frontend Deployment**
- **Build**: EAS CLI (`eas build --platform android`)
- **Output**: APK file (Android) or IPA (iOS)
- **Distribution**: Google Play Store, Apple App Store, direct APK

### **Backend Deployment Options**
- **Replit** (current) - Free, simple
- **Heroku** - PaaS, ~$5-50/month
- **AWS EC2** - VPS, ~$5/month
- **DigitalOcean** - VPS, ~$5-10/month
- **Firebase Cloud Functions** - Serverless
- **Vercel** - For Node.js apps

### **CI/CD Pipeline**
```bash
# Build frontend
npm run build  # or eas build

# Build backend
npm run build  # esbuild compilation

# Deploy backend
git push heroku main  # Auto-deploys

# Result: Live URL for API
# https://your-app.herokuapp.com/api/...
```

---

## 📊 CODE METRICS

| Metric | Count |
|--------|-------|
| Frontend TypeScript Files | 20+ |
| Backend TypeScript Files | 8+ |
| Total Lines of Code | 3000+ |
| React Components | 15+ |
| API Endpoints | 15+ |
| Database Tables (JSON) | 5 |
| Reusable Hooks | 5+ |
| Utility Functions | 10+ |
| Test Coverage | (Optional) |

---

## 🛠️ DEVELOPMENT TOOLS

```
Version Control: Git
Code Editor: VSCode recommended
Terminal: bash/zsh
Package Manager: pnpm (faster than npm)
Build Tools: esbuild (backend), Metro (frontend)
Testing: Jest (optional, not implemented yet)
Linting: ESLint (optional)
Type Checking: TypeScript strict mode
```

---

**This is the complete technical approach and implementation!** 🎉

Need more details on any specific part? (API patterns, state management, security details, deployment steps, etc.)
