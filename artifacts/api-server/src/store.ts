import bcrypt from "bcryptjs";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  department?: string;
  departmentId?: string;
  year?: number;
  division?: string;
  className?: string;
  passwordHash: string;
}

export interface StoredDepartment {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface StoredClass {
  id: string;
  departmentId: string;
  departmentCode: string;
  year: number;
  division: string;
  createdAt: string;
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
}

export interface StoredAttendance {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  className: string;
  markedAt: string;
}

interface Store {
  users: StoredUser[];
  departments: StoredDepartment[];
  classes: StoredClass[];
  sessions: StoredSession[];
  attendance: StoredAttendance[];
}

const store: Store = {
  users: [],
  departments: [],
  classes: [],
  sessions: [],
  attendance: [],
};

export function getStore(): Store {
  return store;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function classCode(deptCode: string, year: number, division: string) {
  return `${deptCode}-Y${year}-${division}`;
}

export async function seedStore() {
  const csId = makeId();
  const eeId = makeId();
  const meId = makeId();

  store.departments.push(
    { id: csId, name: "Computer Science", code: "CS", createdAt: new Date().toISOString() },
    { id: eeId, name: "Electronics Engineering", code: "EE", createdAt: new Date().toISOString() },
    { id: meId, name: "Mechanical Engineering", code: "ME", createdAt: new Date().toISOString() },
  );

  const seedClasses: Omit<StoredClass, "id" | "createdAt">[] = [
    { departmentId: csId, departmentCode: "CS", year: 1, division: "A" },
    { departmentId: csId, departmentCode: "CS", year: 1, division: "B" },
    { departmentId: csId, departmentCode: "CS", year: 2, division: "A" },
    { departmentId: csId, departmentCode: "CS", year: 2, division: "B" },
    { departmentId: csId, departmentCode: "CS", year: 3, division: "A" },
    { departmentId: csId, departmentCode: "CS", year: 4, division: "A" },
    { departmentId: eeId, departmentCode: "EE", year: 1, division: "A" },
    { departmentId: eeId, departmentCode: "EE", year: 2, division: "A" },
    { departmentId: meId, departmentCode: "ME", year: 1, division: "A" },
    { departmentId: meId, departmentCode: "ME", year: 2, division: "A" },
  ];
  for (const c of seedClasses) {
    store.classes.push({ id: makeId(), createdAt: new Date().toISOString(), ...c });
    await new Promise((r) => setTimeout(r, 5));
  }

  const demoUsers: Array<Omit<StoredUser, "id" | "passwordHash"> & { password: string }> = [
    { name: "Admin User",   email: "admin@campus.edu",  password: "admin123",   role: "admin" },
    { name: "Anita Sharma", email: "anita@campus.edu",  password: "teacher123", role: "teacher", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A") },
    { name: "Rahul Verma",  email: "rahul@campus.edu",  password: "teacher123", role: "teacher", department: "Computer Science",        departmentId: csId, year: 1, division: "B", className: classCode("CS", 1, "B") },
    { name: "Priya Mehta",  email: "priya@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A") },
    { name: "Arjun Singh",  email: "arjun@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A") },
    { name: "Sneha Patil",  email: "sneha@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "B", className: classCode("CS", 1, "B") },
    { name: "Vikram Nair",  email: "vikram@campus.edu", password: "teacher123", role: "teacher", department: "Electronics Engineering", departmentId: eeId, year: 1, division: "A", className: classCode("EE", 1, "A") },
    { name: "Riya Joshi",   email: "riya@campus.edu",   password: "student123", role: "student", department: "Electronics Engineering", departmentId: eeId, year: 1, division: "A", className: classCode("EE", 1, "A") },
    { name: "Suresh Patil", email: "suresh@campus.edu", password: "teacher123", role: "teacher", department: "Mechanical Engineering",  departmentId: meId, year: 1, division: "A", className: classCode("ME", 1, "A") },
  ];

  for (const u of demoUsers) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    store.users.push({ id: makeId(), passwordHash, ...rest });
    await new Promise((r) => setTimeout(r, 10));
  }
}
