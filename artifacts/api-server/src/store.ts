import bcrypt from "bcryptjs";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  className?: string;
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
  sessions: StoredSession[];
  attendance: StoredAttendance[];
}

const store: Store = {
  users: [],
  sessions: [],
  attendance: [],
};

export function getStore(): Store {
  return store;
}

export async function seedStore() {
  const demoUsers: Array<Omit<StoredUser, "id" | "passwordHash"> & { password: string }> = [
    { name: "Admin User", email: "admin@campus.edu", password: "admin123", role: "admin" },
    { name: "Anita Sharma", email: "anita@campus.edu", password: "teacher123", role: "teacher", className: "CS-A" },
    { name: "Rahul Verma", email: "rahul@campus.edu", password: "teacher123", role: "teacher", className: "CS-B" },
    { name: "Priya Mehta", email: "priya@campus.edu", password: "student123", role: "student", className: "CS-A" },
    { name: "Arjun Singh", email: "arjun@campus.edu", password: "student123", role: "student", className: "CS-A" },
    { name: "Sneha Patil", email: "sneha@campus.edu", password: "student123", role: "student", className: "CS-B" },
  ];

  for (const u of demoUsers) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    store.users.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      passwordHash,
      ...rest,
    });
    await new Promise((r) => setTimeout(r, 10));
  }
}
