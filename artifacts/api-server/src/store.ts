import bcrypt from "bcryptjs";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  department?: string;
  className?: string;
  passwordHash: string;
}

export interface StoredDepartment {
  id: string;
  name: string;
  code: string;
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
  sessions: StoredSession[];
  attendance: StoredAttendance[];
}

const store: Store = {
  users: [],
  departments: [],
  sessions: [],
  attendance: [],
};

export function getStore(): Store {
  return store;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export async function seedStore() {
  store.departments.push(
    { id: makeId(), name: "Computer Science", code: "CS", createdAt: new Date().toISOString() },
    { id: makeId(), name: "Electronics Engineering", code: "EE", createdAt: new Date().toISOString() },
    { id: makeId(), name: "Mechanical Engineering", code: "ME", createdAt: new Date().toISOString() },
  );

  const demoUsers: Array<Omit<StoredUser, "id" | "passwordHash"> & { password: string }> = [
    { name: "Admin User",  email: "admin@campus.edu",  password: "admin123",   role: "admin" },
    { name: "Anita Sharma", email: "anita@campus.edu", password: "teacher123", role: "teacher", department: "Computer Science",       className: "CS-A" },
    { name: "Rahul Verma",  email: "rahul@campus.edu", password: "teacher123", role: "teacher", department: "Computer Science",       className: "CS-B" },
    { name: "Priya Mehta",  email: "priya@campus.edu", password: "student123", role: "student", department: "Computer Science",       className: "CS-A" },
    { name: "Arjun Singh",  email: "arjun@campus.edu", password: "student123", role: "student", department: "Computer Science",       className: "CS-A" },
    { name: "Sneha Patil",  email: "sneha@campus.edu", password: "student123", role: "student", department: "Computer Science",       className: "CS-B" },
    { name: "Vikram Nair",  email: "vikram@campus.edu",password: "teacher123", role: "teacher", department: "Electronics Engineering",className: "EE-A" },
    { name: "Riya Joshi",   email: "riya@campus.edu",  password: "student123", role: "student", department: "Electronics Engineering",className: "EE-A" },
    { name: "Suresh Patil", email: "suresh@campus.edu",password: "teacher123", role: "teacher", department: "Mechanical Engineering", className: "ME-A" },
  ];

  for (const u of demoUsers) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    store.users.push({ id: makeId(), passwordHash, ...rest });
    await new Promise((r) => setTimeout(r, 10));
  }
}
