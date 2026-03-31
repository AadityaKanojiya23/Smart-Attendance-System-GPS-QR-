# 🚀 Campus Attendance System - Complete Start to End Flow

---

## 📱 COMPLETE USER JOURNEY (STEP BY STEP)

### **SCENARIO 1: STUDENT MARKS ATTENDANCE (COMPLETE FLOW)**

#### **STEP 1: Student Opens App**
```
User taps app icon on phone
    ↓
App launches (cold start)
    ↓
_layout.tsx runs:
  ├─ Load fonts (Inter)
  ├─ Create QueryClient (for data caching)
  ├─ Create AuthProvider (login state)
  ├─ Wrap with SafeAreaProvider (handle notches)
  └─ Render RootLayoutNav
    ↓
AuthProvider checks: Does session exist from previous login?
  ├─ YES → Fetch GET /auth/me → Get user object
  │    └─ Show dashboard for that user
  └─ NO → Show login screen
```

#### **STEP 2: Student Logs In**
```
Student sees login screen with:
├─ Email input
├─ Password input
├─ "Login" button
└─ Quick demo buttons (admin, teacher, student)

Student taps "Student Demo" button (or enters credentials)
    ↓
App calls: apiRequest("POST", "/auth/login", {
  email: "priya@campus.edu",
  password: "student123"
})
    ↓
Mobile app sends HTTPS request to backend:
POST https://replit-domain/api/auth/login
Content-Type: application/json
{
  "email": "priya@campus.edu",
  "password": "student123"
}
    ↓
BACKEND PROCESSING:
  1. Express receives request
  2. Body parser extracts JSON
  3. Router matches: POST /auth/login
  4. Handler executes:
     a. Get { email, password } from req.body
     b. Find user in store.users where email matches
     c. If not found → return 401 { error: "Invalid credentials" }
     d. If found → compare password hash using bcrypt
        ├─ Password wrong → return 401 { error: "Invalid credentials" }
        └─ Password correct → continue to step e
     e. Create session:
        ├─ req.session.userId = user.id
        ├─ req.session.userRole = user.role
        └─ express-session auto-saves to session store
     f. Return user object (without password):
        {
          "user": {
            "id": "1774898919286deb2zki2k",
            "name": "Priya Mehta",
            "email": "priya@campus.edu",
            "role": "student",
            "className": "CS-Y1-A",
            "department": "Computer Science",
            "year": 1,
            "division": "A",
            "subjects": ["Data Structures", "Algorithms"]
          }
        }
    ↓
MOBILE APP RECEIVES RESPONSE:
  1. Status 200 → parse JSON
  2. Extract user object
  3. Call: authContext.login(user)
  4. AuthProvider updates state:
     ├─ user = user object
     └─ isLoggedIn = true
  5. Session cookie auto-saved by fetch()
  6. React re-renders
  7. Navigation updates
  8. Show student dashboard
    ↓
STUDENT DASHBOARD APPEARS:
├─ GradientHeader: "Attendance Dashboard"
├─ Stats boxes:
│  ├─ Total Lectures: 0
│  ├─ Total Present: 0
│  └─ Attendance %: 0%
├─ Sessions for CS-Y1-A (empty list for new student)
└─ Tab navigation: [Dashboard] [Scan] [Profile]
```

#### **STEP 3: Teacher Creates QR Session (While Student Waits)**
```
MEANWHILE, TEACHER (anita@campus.edu) logs in...
    ↓
Teacher Dashboard shows:
├─ Upcoming sessions (empty initially)
├─ "Start Attendance Session" button
└─ Tab navigation: [Dashboard] [Session] [History]

Teacher taps "Session" tab
    ↓
Session screen appears:
├─ Idle state: "How it works" info card
└─ "Start Attendance Session" button

Teacher taps "Start Attendance Session"
    ↓
Setup form appears:
├─ Time picker: Start Time (09:00)
├─ Time picker: End Time (10:00)
├─ QR Duration options: [1] [2] [5] [10] [15] [30] minutes
├─ Year selector: [1st Year]
├─ Division selector: [Div A]
├─ Subject selector: [Data Structures] [Algorithms] etc.
└─ "Generate QR" button

Teacher selects:
├─ Start: 09:00
├─ End: 10:00
├─ Duration: 5 minutes
├─ Year: 1
├─ Division: A
├─ Subject: "Data Structures"

Teacher taps "Generate QR"
    ↓
startSession() function runs:

  STEP 1: Request GPS Permission
  ├─ Platform check: is this mobile (not web)?
  ├─ If YES:
  │  ├─ Call Location.requestForegroundPermissionsAsync()
  │  ├─ User sees: "Allow location access?"
  │  ├─ User taps: "Allow While Using App"
  │  └─ Permission granted
  └─ If NO (web): skip

  STEP 2: Get GPS Location (with timeout)
  ├─ Create promise: Location.getCurrentPositionAsync({timeout: 3000})
  ├─ Create timeout: 3.5 seconds max
  ├─ Promise.race() between both
  ├─ If GPS succeeds in time:
  │  ├─ lat = 19.1805 (from device)
  │  └─ lng = 72.9808 (from device)
  ├─ If GPS fails/timeout:
  │  ├─ console.warn("GPS unavailable")
  │  ├─ lat = 19.180010063951876 (campus center fallback)
  │  └─ lng = 72.98054933658015 (campus center fallback)
  └─ Continue regardless

  STEP 3: Generate QR Token
  ├─ token = "SESSION_" + userId + "_" + timestamp + "_" + random
  ├─ Example: "SESSION_17748989190921hvzir88f_1704067200123_abc123xyz"
  └─ This token is UNIQUE for this session

  STEP 4: Calculate Expiry Time
  ├─ expiresAt = now + (5 minutes × 60 seconds)
  ├─ expiresAt = "2026-03-31T10:05:00Z" (ISO format)
  └─ Store as string

  STEP 5: Prepare Session Object
  ├─ className = "CS-Y1-A" (computed from CS, 1, A)
  ├─ Create sessionPayload:
  │  {
  │    "className": "CS-Y1-A",
  │    "latitude": 19.1805,
  │    "longitude": 72.9808,
  │    "qrToken": "SESSION_...",
  │    "expiresAt": "2026-03-31T10:05:00Z",
  │    "subject": "Data Structures",
  │    "lectureStart": "09:00",
  │    "lectureEnd": "10:00",
  │    "durationSecs": 300
  │  }
  └─ Note: teacherId NOT included (backend derives from session)

  STEP 6: Send to Backend
  ├─ apiRequest("POST", "/sessions", sessionPayload)
  ├─ Mobile app sends:
  │  POST https://replit-domain/api/sessions
  │  Cookies: [session cookie auto-included by fetch()]
  │  Body: JSON serialized sessionPayload
  └─ Continue...
    ↓
BACKEND PROCESSING (POST /sessions):

  1. Express receives request
  2. Auth middleware (requireAuth):
     ├─ Check req.session.userId exists
     ├─ If NO → return 401 Unauthorized
     ├─ If YES → proceed
  3. Auth middleware (requireRole("teacher")):
     ├─ Look up user by req.session.userId
     ├─ Check user.role === "teacher"
     ├─ If NO → return 403 Forbidden
     ├─ If YES → proceed
  4. Destructure request body:
     ├─ className, latitude, longitude, qrToken, expiresAt, etc.
     └─ teacherId = req.session.userId (from session, not body!)
  5. Validate inputs:
     ├─ className exists? → YES
     ├─ qrToken exists? → YES
     ├─ expiresAt exists? → YES
     └─ All required? → YES → proceed
  6. Validate latitude/longitude:
     ├─ typeof latitude === "number"? → YES
     ├─ isFinite(latitude)? → YES
     ├─ -90 ≤ latitude ≤ 90? → YES
     ├─ -180 ≤ longitude ≤ 180? → YES
     └─ All valid? → proceed
  7. Create session ID:
     ├─ id = timestamp + random
     └─ Example: "1774898932191qy61t1maa"
  8. Create session object:
     {
       "id": "1774898932191qy61t1maa",
       "teacherId": "17748989190921hvzir88f",
       "className": "CS-Y1-A",
       "latitude": 19.1805,
       "longitude": 72.9808,
       "qrToken": "SESSION_17748989190921hvzir88f_1704067200123_abc123xyz",
       "expiresAt": "2026-03-31T10:05:00Z",
       "createdAt": "2026-03-31T10:00:00Z",
       "subject": "Data Structures",
       "lectureStart": "09:00",
       "lectureEnd": "10:00",
       "durationSecs": 300,
       "blockedStudents": []
     }
  9. Store in memory:
     ├─ Get store = getStore()
     ├─ store.sessions.push(session)
     └─ Session now in memory array
  10. Save to disk:
      ├─ persistStore()
      ├─ Serialize entire store to JSON
      ├─ Write to .data.json file
      └─ Data permanently saved
  11. Return to client:
      ├─ res.status(200).json(session)
      └─ Mobile receives full session object
    ↓
MOBILE APP RECEIVES RESPONSE:

  1. Check: res.ok? → YES (200 status)
  2. Parse JSON → session object
  3. Update state:
     ├─ setCurrentSessionId(session.id)
     ├─ setQrToken(session.qrToken)
     ├─ setTimeLeft(300 seconds)
     └─ setState("active")
  4. Start countdown timer:
     ├─ setInterval every 1 second
     ├─ timeLeft--
     ├─ When timeLeft === 0:
     │  ├─ Stop interval
     │  └─ setState("expired")
     └─ Continue while active
  5. Render QR screen:
     ├─ Display large QR code
     ├─ QR contains: session.qrToken (the unique token)
     ├─ Show timer: "5:00" (5 minutes)
     ├─ Show pulsing animation
     ├─ Show "GPS Active" indicator
     └─ "Cancel Session" button
```

#### **STEP 4: Student Scans QR Code**
```
Student sees QR on teacher's screen
    ↓
Student taps "Scan QR" tab
    ↓
Scan screen with:
├─ Requirements checklist
├─ "Open Scanner" button
└─ No camera view yet

Student taps "Open Scanner"
    ↓
App checks: Camera permission granted?
  ├─ NO:
  │  ├─ Call useCameraPermissions() hook
  │  ├─ User sees: "Allow camera access?"
  │  ├─ User taps: "Allow"
  │  └─ Permission stored
  └─ YES: skip

App requests GPS permission (same as teacher):
  ├─ User sees: "Allow location?"
  ├─ User taps: "Allow While Using App"
  └─ Continue

Camera view opens:
├─ Live video from back camera
├─ Overlay with QR frame (220x220 box in center)
├─ Corner brackets showing scan area
└─ Text: "Point camera at the teacher's QR code"

Student points phone at teacher's QR code
    ↓
Camera detects QR code:
├─ Computer vision algorithm recognizes pattern
├─ Extracts data from QR
├─ Data: "SESSION_17748989190921hvzir88f_1704067200123_abc123xyz"
└─ Calls: handleScan({data: "SESSION_..."})
    ↓
handleScan() function runs:

  STEP 1: Check if already processing
  ├─ isProcessing.current? → NO → continue
  ├─ Set isProcessing = true (prevent duplicate scans)
  └─ Continue

  STEP 2: Validate token format
  ├─ Does token start with "SESSION_"?
  ├─ YES → continue
  └─ NO → ignore (not a valid QR token)

  STEP 3: Check if already scanned
  ├─ Is token in scannedTokens Set?
  ├─ NO → continue
  └─ YES:
     ├─ Show warning: "Already Marked!"
     ├─ Haptic.notificationAsync(Warning)
     ├─ setScanState("already_marked")
     ├─ Wait 2.5 seconds
     ├─ Return to scanner
     └─ Exit function

  STEP 4: Set to processing
  ├─ setScanState("processing")
  ├─ Show spinner: "Verifying attendance..."
  └─ Continue

  STEP 5: Get Student GPS Location (OPTIONAL)
  ├─ Try to get location with 3 second timeout:
  │  ├─ Location.requestForegroundPermissionsAsync()
  │  ├─ Location.getCurrentPositionAsync({timeout: 3000})
  │  ├─ If success: lat & lng extracted
  │  └─ If fail/timeout: lat = undefined, lng = undefined (OK!)
  └─ Continue with or without GPS

  STEP 6: Send to Backend
  ├─ Create payload:
  │  {
  │    "qrToken": "SESSION_17748989190921hvzir88f_1704067200123_abc123xyz",
  │    "latitude": 19.1805,      // optional
  │    "longitude": 72.9808      // optional
  │  }
  ├─ apiRequest("POST", "/attendance", payload)
  ├─ Cookies auto-included
  └─ Continue...
    ↓
BACKEND PROCESSING (POST /attendance):

  1. Express receives request
  2. Auth middleware (requireAuth):
     ├─ Check req.session.userId exists
     ├─ If NO → return 401 Unauthorized
     ├─ If YES → continue (student is logged in)
  3. Auth middleware (requireRole("student")):
     ├─ Check user.role === "student"
     ├─ If NO → return 403 Forbidden
     ├─ If YES → continue
  4. Extract data:
     ├─ userId = req.session.userId ("1774898919286deb2zki2k")
     ├─ qrToken = req.body.qrToken
     ├─ latitude = req.body.latitude (might be undefined)
     ├─ longitude = req.body.longitude (might be undefined)
     └─ Get student user object from store
  5. Validate student exists:
     ├─ Find student in store.users by userId
     ├─ If found → continue
     └─ If not found → return 401 "Not authenticated"
  6. Find session by QR token:
     ├─ Find session in store.sessions where qrToken matches
     ├─ If found → continue
     └─ If not found → return 404 "Invalid QR code. Session not found."
  7. Check if session expired:
     ├─ Is now > session.expiresAt?
     ├─ YES → return 400 "This session has expired. Ask teacher to start new one."
     └─ NO → continue
  8. Validate GPS if provided:
     ├─ latitude && longitude provided?
     ├─ YES → validate them:
     │  ├─ Are they numbers? typeof === "number"
     │  ├─ Are they finite? isFinite() === true
     │  ├─ Is latitude in [-90, 90]?
     │  ├─ Is longitude in [-180, 180]?
     │  ├─ All valid? → Check proximity (below)
     │  └─ Any invalid? → return 400 "Invalid location"
     └─ NO → Skip proximity check (GPS optional)
  9. Check proximity (if GPS provided):
     ├─ Calculate distance using haversine formula:
     │  ├─ lat1 = student.latitude (from request)
     │  ├─ lng1 = student.longitude (from request)
     │  ├─ lat2 = session.latitude (teacher's location)
     │  ├─ lng2 = session.longitude (teacher's location)
     │  ├─ distance = haversineDistance(lat1, lng1, lat2, lng2)
     │  └─ Result in meters
     ├─ Is distance > 200m?
     ├─ YES → return 400:
     │  "You are too far from the class. You are 6118m away — must be within 200m."
     └─ NO → continue
  10. Check class match:
      ├─ student.className === session.className?
      ├─ YES → continue
      └─ NO → return 400 "Class mismatch. You are in CS-Y1-A but session is for..."
  11. Check subject enrolled (if session has subject):
      ├─ Does session have subject?
      ├─ YES → is student enrolled in that subject?
      │  ├─ YES → continue
      │  └─ NO → return 400 "Subject not assigned. You are not enrolled in..."
      └─ NO → skip check, continue
  12. Check if student blocked:
      ├─ Is student.id in session.blockedStudents array?
      ├─ YES → return 403 "You are blocked for this session."
      └─ NO → continue
  13. Check if already marked:
      ├─ Find attendance where sessionId === session.id AND studentId === student.id
      ├─ If found → return 400 "Attendance already marked for this session."
      └─ If not found → continue
  14. Create attendance record:
      {
        "id": "1774898943119dtpgdd9ur",
        "studentId": "1774898919286deb2zki2k",
        "studentName": "Priya Mehta",
        "sessionId": "1774898932191qy61t1maa",
        "className": "CS-Y1-A",
        "markedAt": "2026-03-31T10:02:30Z",
        "subject": "Data Structures",
        "lectureStart": "09:00",
        "lectureEnd": "10:00",
        "teacherName": "Anita Sharma"
      }
  15. Store in memory:
      ├─ store.attendance.push(record)
      └─ Record now in memory
  16. Save to disk:
      ├─ persistStore()
      ├─ Write entire store to .data.json
      └─ Data permanently saved
  17. Return success:
      ├─ res.status(200).json(record)
      └─ Send back full attendance record
    ↓
MOBILE APP RECEIVES RESPONSE:

  1. Check: res.ok? → YES (200 status)
  2. Parse JSON → attendance record
  3. Success actions:
     ├─ scannedTokens.current.add(token) // Mark as scanned
     ├─ Haptics.notificationAsync(Success) // Vibrate phone
     ├─ setScanState("success")
     └─ Show green checkmark: "Attendance Marked!"
  4. Update React Query cache:
     ├─ Invalidate queryKey: ["student-attendance"]
     ├─ Next query will re-fetch latest data
     └─ Dashboard will auto-update
  5. After 2.5 seconds:
     ├─ setScanState("scanning")
     ├─ isProcessing.current = false
     └─ Return to camera (ready for next scan)
```

#### **STEP 5: Student Checks Profile**
```
Student taps "Profile" tab
    ↓
Profile screen shows:
├─ Personal info:
│  ├─ Name: Priya Mehta
│  ├─ Email: priya@campus.edu
│  ├─ Class: CS-Y1-A
│  ├─ Department: Computer Science
│  └─ Subjects: [Data Structures, Algorithms]
├─ Stats:
│  ├─ Total Attendance Records: 1
│  └─ Percentage: (1 lecture attended out of X total)
└─ Attendance History:
   └─ Scrollable list of all attendance records
       ├─ Data Structures - 09:00 - 31 Mar 2026
       │  Marked: 10:02:30 by Anita Sharma
       └─ (more records below)

Behind the scenes:
├─ useQuery with key ["student-attendance"]
├─ apiRequest("GET", "/attendance/my")
├─ Backend finds all records where studentId = student.id
├─ Returns array, React Query caches for 30 seconds
└─ If user re-visits in <30s: use cached data (no API call)
```

---

### **SCENARIO 2: ADMIN VIEWS REPORTS (COMPLETE FLOW)**

#### **Step 1: Admin Logs In**
```
Similar to student login, but role = "admin"
    ↓
Admin Dashboard appears:
├─ Stats:
│  ├─ Total Students: 6
│  ├─ Total Teachers: 4
│  └─ Total Attendance Records: 45
├─ Tab navigation: [Dashboard] [Students] [Teachers] [Reports] [Departments]
└─ Quick search for users
```

#### **Step 2: Admin Selects Reports**
```
Admin taps "Reports" tab
    ↓
Reports screen shows:
├─ Class dropdown: [Select Class]
├─ (Empty calendar initially)
└─ (No data shown until class selected)

Admin selects: "CS-Y1-A"
    ↓
MOBILE APP FETCHES DATA:

Query 1: GET /sessions/by-class?className=CS-Y1-A
  └─ Backend returns array of ALL sessions for this class
     ├─ Session 1: Data Structures, 09:00, Anita, 15 present
     ├─ Session 2: Algorithms, 10:15, Anita, 14 present
     ├─ Session 3: Math, 11:30, Anita, CANCELLED, 0 present
     └─ ... (more sessions)
     Backend joins teacher name for each session

Query 2: GET /attendance?className=CS-Y1-A
  └─ Backend returns array of ALL attendance records for class
     ├─ Record 1: Priya Mehta, 09:15, Data Structures, Anita
     ├─ Record 2: Arjun Singh, 09:14, Data Structures, Anita
     ├─ ... (more records)
     └─ Sorted reverse chronologically

React Query caches both with keys:
├─ ["admin-class-sessions", "CS-Y1-A"]
├─ ["admin-attendance", "CS-Y1-A"]
└─ Auto-invalidates when user navigates away
    ↓
DATA PROCESSING (MOBILE):

1. Group sessions by date:
   ├─ 31 Mar 2026:
   │  ├─ 09:00 Session: Data Structures, Anita, 15 present
   │  ├─ 10:15 Session: Algorithms, Anita, 14 present
   │  └─ 11:30 Session: Math [CANCELLED], Anita, 0 present
   └─ 30 Mar 2026:
      └─ 09:00 Session: ...
2. Group attendance by sessionId:
   ├─ For each session: which students marked attendance?
   └─ Create map for fast lookup
3. Calculate stats:
   ├─ Total Lectures: 3 (including cancelled)
   ├─ Total Present: Sum all attendance records
   └─ Attendance %: (Present / Total Lectures) × 100
    ↓
CALENDAR VIEW RENDERS:

Calendar shows:
├─ Month view: March 2026
├─ Dots on dates:
│  ├─ 31 Mar: 3 sessions (3 dots)
│  ├─ 30 Mar: 2 sessions (2 dots)
│  └─ 29 Mar: 1 session (1 dot)
└─ Stats at top: "3 Total Lectures | 29 Total Present"

Admin clicks: 31 Mar 2026
    ↓
Date view expands showing:

Session 1 (09:00 - 10:00):
├─ Subject: Data Structures
├─ Teacher: Anita Sharma
├─ Time: 09:00 – 10:00
├─ Status: Active (no badge)
├─ Attendance: 15 present
└─ Student List (scrollable):
   ├─ Priya Mehta - 09:15:30
   ├─ Arjun Singh - 09:14:25
   ├─ ... (13 more)
   └─ (collapse/expand option)

Session 2 (10:15 - 11:15):
├─ Subject: Algorithms
├─ Teacher: Anita Sharma
├─ Time: 10:15 – 11:15
├─ Status: Active
├─ Attendance: 14 present
└─ Student List: [similar structure]

Session 3 (11:30 - 12:30):
├─ Subject: Mathematics-I
├─ Teacher: Anita Sharma
├─ Time: 11:30 – 12:30
├─ Status: [RED "Cancelled" BADGE]
├─ Attendance: 0 present
└─ Note: "Session was cancelled"
    ↓
ADMIN TAPS "↓ PDF" BUTTON:

PDF Export function runs:

MOBILE PLATFORM (Android/iOS):
  1. buildAttendanceHtml() creates styled HTML:
     ├─ College header: "K.C. College of Engineering"
     ├─ Title: "Attendance Report"
     ├─ Class: CS-Y1-A, Date: 31 Mar 2026
     ├─ Stats boxes:
     │  ├─ 3 Total Lectures
     │  └─ 29 Total Present
     └─ For each session:
        ├─ Subject header (blue background)
        ├─ Time & teacher info
        └─ Student table with names & scan times
  2. Print.printToFileAsync({html}) called
     ├─ Native WebView renders HTML
     ├─ Renders as PDF
     └─ Returns URI on device
  3. Sharing.shareAsync(uri) called
     ├─ Native share sheet appears
     ├─ Options: Email, WhatsApp, Drive, Save, etc.
     └─ User selects destination
  4. File saved/shared based on choice

WEB PLATFORM (Chrome/Safari):
  1. dynamically import jsPDF (not loaded until needed)
  2. new jsPDF() creates document
  3. Add content:
     ├─ College header
     ├─ Title & date
     ├─ Stats boxes
     └─ Session tables
  4. Add page numbers & footer
  5. doc.save("Attendance_CS-Y1-A_31_Mar_2026.pdf")
     ├─ Direct browser download
     ├─ File appears in Downloads folder
     └─ No print dialog shown
```

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP (React Native)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  AuthContext ──── Session State ──── User Object               │
│  (Who am I?)      (am I logged in?) (name, role, class)         │
│                                                                   │
│  React Query ─ useQuery(fetchData) ─ Cache(30s) ─ Auto-retry   │
│  (Data Management)                    (fast!)      (reliable)    │
│                                                                   │
│  Form Inputs ──── Validation ──── apiRequest() ──┐              │
│  (email, password, etc.) (check rules)  (send)   │              │
└────────────────────────────────────────┬─────────┘              │
                                         │                         │
                    HTTPS / COOKIES      │      HTTPS / COOKIES    │
                                         │                         │
┌────────────────────────────────────────┼─────────────────────────┐
│                     BACKEND (Express.js)                          │
├────────────────────────────────────────┼─────────────────────────┤
│                                         ▼                         │
│  Session Cookies ──── Auth Middleware ──── Validate Role        │
│  (who is this?) (require logged in?) (admin/teacher/student)    │
│                                                                   │
│  Request Body ──── Input Validation ──── Business Logic         │
│  (email, password, (check ranges) (GPS check, time check)       │
│   qrToken, etc.)                                                 │
│                                                                   │
│                          ▼                                        │
│                   ┌──────────────┐                               │
│                   │ In-Memory    │                               │
│                   │ Store        │                               │
│                   │ (fast)       │                               │
│                   │ ┌──────────┐ │                               │
│                   │ │ users    │ │                               │
│                   │ │ sessions │ │                               │
│                   │ │ attendance│ │                               │
│                   │ │ etc.     │ │                               │
│                   │ └──────────┘ │                               │
│                   └──────────────┘                               │
│                          │                                        │
│                     persistStore()                               │
│                   (after every change)                           │
│                          │                                        │
│                          ▼                                        │
│                   ┌──────────────┐                               │
│                   │ .data.json   │                               │
│                   │ (on disk)    │                               │
│                   │ Persistent   │                               │
│                   │ Survives     │                               │
│                   │ restarts!    │                               │
│                   └──────────────┘                               │
│                                                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY FLOW

```
User Login Request
    ↓
bcrypt: Compare password hash (never stores plain password)
    ├─ Password wrong → 401 Unauthorized → Fail
    └─ Password correct → Create session → Continue
    ↓
Express-session: Store userId in req.session
    ├─ Session stored in memory
    └─ Cookie sent to client (httpOnly, secure flags)
    ↓
Client: Cookie automatically stored
    ├─ Every fetch() includes cookie
    └─ No manual token handling needed
    ↓
Subsequent Requests:
├─ Middleware: requireAuth checks session exists
├─ Middleware: requireRole("teacher") checks user.role
├─ If checks fail → 401/403 error returned
└─ If checks pass → Endpoint executes
```

---

## ⏱️ TIMELINE (Student Attendance Example)

```
09:00:00 - Teacher creates session
├─ GPS captured
├─ QR token generated
├─ Session saved to disk
└─ QR starts displaying

09:00:01 - Student scans QR
├─ Student GPS requested
├─ QR token extracted
└─ Attendance request sent

09:00:02 - Backend validates
├─ Check all constraints
├─ Create attendance record
├─ Save to disk
└─ Return success

09:00:03 - Student sees checkmark
├─ "Attendance Marked!"
└─ Vibration feedback

09:05:00 - QR expires
├─ Timer reaches 0
├─ Session marked "expired"
└─ No more scans allowed

--- SERVER RESTARTS AT 10:00:00 ---

10:00:01 - loadStore() called
├─ Read .data.json
├─ All sessions & attendance restored
└─ Student's attendance NOT lost!
```

---

## 🔄 RECURRING FLOWS

### **Data Refresh Flow**
```
User navigates to a screen
    ↓
useQuery hook runs
    ↓
Check: Is cached data fresh (< 30s)?
  ├─ YES → Use cache (instant)
  └─ NO → Fetch from API
    ↓
API returns fresh data
    ↓
React Query stores in cache
    ↓
Component re-renders with new data
```

### **Error Handling Flow**
```
API request fails
    ↓
Try/catch catches error
    ↓
Extract error message from response
    ↓
Display to user: "Class mismatch" / "Too far away" / etc.
    ↓
User sees clear message
    ↓
User can retry or fix issue
```

### **Permission Flow**
```
App needs permission (Camera/Location)
    ↓
Check: Already granted?
  ├─ YES → Use immediately
  └─ NO → Show system dialog
    ↓
User sees: "Allow [App] to access camera?"
    ↓
User taps: "Allow" or "Don't Allow"
    ↓
Result stored in device OS
    ↓
App proceeds or shows error message
```

---

## 📊 COMPLETE DATA JOURNEY

```
1. USER CREATES DATA
   ├─ Teacher: Creates session (QR)
   ├─ Student: Scans QR (Attendance)
   ├─ Admin: Views reports (no new data)
   └─ Mobile app validates & sends to backend

2. BACKEND RECEIVES
   ├─ Express parses JSON
   ├─ Auth middleware validates
   ├─ Role middleware checks permissions
   ├─ Request handler validates data
   └─ Business logic executes

3. DATA STORED (DUAL)
   ├─ Memory: store.sessions / store.attendance arrays
   └─ Disk: .data.json file (JSON serialized)

4. RESPONSE SENT
   ├─ Success: Return 200 + data
   ├─ Validation error: Return 400 + message
   ├─ Auth error: Return 401 + message
   └─ Permission error: Return 403 + message

5. MOBILE UPDATES
   ├─ Parse response
   ├─ Update React state
   ├─ Invalidate React Query cache
   ├─ UI re-renders
   └─ User sees update immediately

6. PERSISTENCE
   ├─ Data in .data.json survives server restart
   ├─ Mobile can re-fetch from restored server
   └─ No data loss ever!
```

---

## 🎯 KEY DECISION POINTS IN FLOW

| Decision | Options | Chosen |
|----------|---------|--------|
| **GPS Available?** | Get precise location OR Use campus center | Get if available, use center as fallback |
| **GPS Timeout?** | Wait longer OR Continue without GPS | 3-sec timeout, continue anyway (optional) |
| **Session Expired?** | Allow old QRs OR Reject | Reject expired QRs |
| **Student Far Away?** | Block OR Allow (with GPS optional) | Block only if GPS provided AND >200m |
| **Already Marked?** | Allow duplicate OR Prevent | Prevent (one attendance per session) |
| **Student Blocked?** | Show generic error OR Specific message | Show specific "you are blocked" message |
| **Class Mismatch?** | Suggest right class OR Generic error | Show which class, which session for |
| **PDF on Web?** | jsPDF download OR Print dialog | Direct download (no dialog) |
| **PDF on Mobile?** | Share sheet OR Auto-save | Share sheet (let user choose) |

---

This is the **COMPLETE START TO END FLOW** of the Campus Attendance System! 🚀

Kya aur detail chahiye? (Need more details?)
