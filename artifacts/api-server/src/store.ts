import bcrypt from "bcryptjs";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const STORE_FILE = join(process.cwd(), ".data.json");

export interface TeacherAssignment {
  className: string;
  departmentId: string;
  departmentCode: string;
  year: number;
  division: string;
  subjects: string[];
}

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
  subjects?: string[];
  assignments?: TeacherAssignment[];
  rollNumber?: number;
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
  subject?: string;
  lectureStart?: string;
  lectureEnd?: string;
  durationSecs?: number;
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
  lectureStart?: string;
  lectureEnd?: string;
  teacherName?: string;
}

interface Store {
  users: StoredUser[];
  departments: StoredDepartment[];
  classes: StoredClass[];
  sessions: StoredSession[];
  attendance: StoredAttendance[];
}

let store: Store = {
  users: [],
  departments: [],
  classes: [],
  sessions: [],
  attendance: [],
};

export function loadStore(): void {
  try {
    if (existsSync(STORE_FILE)) {
      const data = readFileSync(STORE_FILE, "utf-8");
      store = JSON.parse(data);
      return;
    }
  } catch (e) {
    console.error("Failed to load store from disk:", e);
  }
}

function saveStore(): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save store to disk:", e);
  }
}

export function getStore(): Store {
  return store;
}

export function persistStore(): void {
  saveStore();
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function classCode(deptCode: string, year: number, division: string) {
  return `${deptCode}-Y${year}-${division}`;
}

export async function seedStore() {
  // Only seed if store is empty (fresh start)
  if (store.users.length > 0) return;

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
    { name: "Anita Sharma", email: "anita@campus.edu",  password: "teacher123", role: "teacher", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A"), subjects: ["Data Structures", "Algorithms", "C Programming", "Mathematics-I"],
      assignments: [{ className: classCode("CS", 1, "A"), departmentId: csId, departmentCode: "CS", year: 1, division: "A", subjects: ["Data Structures", "Algorithms", "C Programming", "Mathematics-I"] }] },
    { name: "Rahul Verma",  email: "rahul@campus.edu",  password: "teacher123", role: "teacher", department: "Computer Science",        departmentId: csId, year: 1, division: "B", className: classCode("CS", 1, "B"), subjects: ["Digital Electronics", "Basic Electronics", "Mathematics-I"],
      assignments: [{ className: classCode("CS", 1, "B"), departmentId: csId, departmentCode: "CS", year: 1, division: "B", subjects: ["Digital Electronics", "Basic Electronics", "Mathematics-I"] }] },
    { name: "Priya Mehta",  email: "priya@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A") },
    { name: "Arjun Singh",  email: "arjun@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "A", className: classCode("CS", 1, "A") },
    { name: "Sneha Patil",  email: "sneha@campus.edu",  password: "student123", role: "student", department: "Computer Science",        departmentId: csId, year: 1, division: "B", className: classCode("CS", 1, "B") },
    { name: "Vikram Nair",  email: "vikram@campus.edu", password: "teacher123", role: "teacher", department: "Electronics Engineering", departmentId: eeId, year: 1, division: "A", className: classCode("EE", 1, "A"), subjects: ["Basic Electrical", "Circuit Theory", "Physics", "Mathematics-II"],
      assignments: [{ className: classCode("EE", 1, "A"), departmentId: eeId, departmentCode: "EE", year: 1, division: "A", subjects: ["Basic Electrical", "Circuit Theory", "Physics", "Mathematics-II"] }] },
    { name: "Riya Joshi",   email: "riya@campus.edu",   password: "student123", role: "student", department: "Electronics Engineering", departmentId: eeId, year: 1, division: "A", className: classCode("EE", 1, "A") },
    { name: "Suresh Patil", email: "suresh@campus.edu", password: "teacher123", role: "teacher", department: "Mechanical Engineering",  departmentId: meId, year: 1, division: "A", className: classCode("ME", 1, "A"), subjects: ["Engineering Mechanics", "Thermodynamics", "Workshop", "Mathematics-II"],
      assignments: [{ className: classCode("ME", 1, "A"), departmentId: meId, departmentCode: "ME", year: 1, division: "A", subjects: ["Engineering Mechanics", "Thermodynamics", "Workshop", "Mathematics-II"] }] },
  ];

  for (const u of demoUsers) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    store.users.push({ id: makeId(), passwordHash, ...rest });
    await new Promise((r) => setTimeout(r, 10));
  }

  // Save seeded data to disk
  saveStore();
}

export async function migrateCEStudents(): Promise<void> {
  // Idempotent: skip if CE dept already added
  if (store.departments.some((d) => d.code === "CE")) return;

  const ceId = makeId();
  await new Promise((r) => setTimeout(r, 5));

  store.departments.push({
    id: ceId,
    name: "Computer Engineering",
    code: "CE",
    createdAt: new Date().toISOString(),
  });

  // Add CE Year-2 Division-B class
  store.classes.push({
    id: makeId(),
    departmentId: ceId,
    departmentCode: "CE",
    year: 2,
    division: "B",
    createdAt: new Date().toISOString(),
  });

  const className = classCode("CE", 2, "B");
  const subjects = [
    "Web Technology",
    "Operating System",
    "DBMS",
    "BMD",
    "OE",
    "WT LAB",
    "OS LAB",
    "DBMS LAB",
    "BMD LAB",
    "CT",
    "DT",
    "DT LAB",
  ];

  // Hash once and reuse (same password for all students)
  const passwordHash = await bcrypt.hash("student@123", 10);

  const studentList: Array<{ name: string; email: string }> = [
    { name: "Kanojiya Aditya Ramjanam",       email: "ce24.aditya.kanojiya@kccemsr.edu.in" },
    { name: "Karkera Saakshi Pavan",           email: "ce24.saakshi.karkera@kccemsr.edu.in" },
    { name: "Karkera Samiksha Praveenkumar",   email: "ce24.samiksha.karkera@kccemsr.edu.in" },
    { name: "Kasturi Shreya Venkatesh",        email: "ce24.shreya.kasturi@kccemsr.edu.in" },
    { name: "Kathe Ninad Shailesh",            email: "ce24.ninad.kathe@kccemsr.edu.in" },
    { name: "Kawle Leisha Kiran",              email: "ce24.leisha.kawle@kccemsr.edu.in" },
    { name: "Khade Atharva Aashish",           email: "ce24.atharva.khade@kccemsr.edu.in" },
    { name: "Khaire Vedant Datta",             email: "ce24.vedant.khaire@kccemsr.edu.in" },
    { name: "Khan Asif Md Ashfaque",           email: "ce24.asif.khan@kccemsr.edu.in" },
    { name: "Khan Sania Mohd Yusuf",           email: "ce24.sania.khan@kccemsr.edu.in" },
    { name: "Kharat Mayuresh Yogesh",          email: "ce24.mayuresh.kharat@kccemsr.edu.in" },
    { name: "Kharatmol Saumya Sushil",         email: "ce24.saumya.kharatmol@kccemsr.edu.in" },
    { name: "Khatal Akshata Avinash",          email: "ce24.akshata.khatal@kccemsr.edu.in" },
    { name: "Khavanekar Jayesh Vishnu",        email: "ce24.jayesh.khavanekar@kccemsr.edu.in" },
    { name: "Khedekar Shruti Balu",            email: "ce24.shruti.khedekar@kccemsr.edu.in" },
    { name: "Kolambekar Yash Nilesh",          email: "ce24.yash.kolambekar@kccemsr.edu.in" },
    { name: "Kotian Srishti Harish",           email: "ce24.srishti.kotian@kccemsr.edu.in" },
    { name: "Parab Krupa Arvind",              email: "ce24.krupa.parab@kccemsr.edu.in" },
    { name: "Kudalkar Aryan Rajendra",         email: "ce24.aryan.kudalkar@kccemsr.edu.in" },
    { name: "Kundgar Sairaj Sandip",           email: "ce24.sairaj.kundgar@kccemsr.edu.in" },
    { name: "Labana Meharsingh Harneksingh",   email: "ce24.meharsingh.labana@kccemsr.edu.in" },
    { name: "Lokhande Durva Sunil",            email: "ce24.durva.lokhande@kccemsr.edu.in" },
    { name: "Lonkar Atharva Ganesh",           email: "ce24.atharva.lonkar@kccemsr.edu.in" },
    { name: "Makannawar Yesshasvi Bahubali",   email: "ce24.yesshasvi.makannawar@kccemsr.edu.in" },
    { name: "Makhare Mahesh Raju",             email: "ce24.mahesh.makhare@kccemsr.edu.in" },
    { name: "Mane Arya Arjun",                 email: "ce24.arya.mane@kccemsr.edu.in" },
    { name: "Manjrekar Aniruddha Dinesh",      email: "ce24.aniruddha.manjrekar@kccemsr.edu.in" },
    { name: "Manjrekar Madhura Mahesh",        email: "ce24.madhura.manjrekar@kccemsr.edu.in" },
    { name: "Mastkar Vibha Shankarlal",        email: "ce24.vibha.mastkar@kccemsr.edu.in" },
    { name: "Mhaske Himanshu Nitin",           email: "ce24.himanshu.mhaske@kccemsr.edu.in" },
    { name: "Mishra Aditya Sujeet",            email: "ce24.aditya.mishra@kccemsr.edu.in" },
    { name: "Mohammad Akil Ahemad Kazi",       email: "ce24.akil.mohammad@kccemsr.edu.in" },
    { name: "Mohanty Ritin Sushant",           email: "ce24.ritin.mohanty@kccemsr.edu.in" },
    { name: "Mir Anees Nagesh",                email: "ce24.anees.mir@kccemsr.edu.in" },
    { name: "Mori Dhruv Dinesh",               email: "ce24.dhruv.mori@kccemsr.edu.in" },
    { name: "More Mrunal Sachin",              email: "ce24.mrunal.more@kccemsr.edu.in" },
    { name: "Mourya Shivani Ghanshyam",        email: "ce24.shivani.mourya@kccemsr.edu.in" },
    { name: "Mundhara Krishna Govind",         email: "ce24.krishna.mundhara@kccemsr.edu.in" },
    { name: "Mungekar Bhavik Mahesh",          email: "ce24.bhavik.mungekar@kccemsr.edu.in" },
    { name: "Nair Jiya Hari",                  email: "ce24.jiya.nair@kccemsr.edu.in" },
    { name: "Narvekar Vaishnavi Vasudev",      email: "ce24.vaishnavi.narvekar@kccemsr.edu.in" },
    { name: "Nikam Siddhesh Nilesh",           email: "ce24.siddhesh.nikam@kccemsr.edu.in" },
    { name: "Paithankar Devang Lumavati",      email: "ce24.devang.paithankar@kccemsr.edu.in" },
    { name: "Pal Deepika Ramkumar",            email: "ce24.deepika.pal@kccemsr.edu.in" },
    { name: "Pal Pratibha Brijendrakumar",     email: "ce24.pratibha.pal@kccemsr.edu.in" },
    { name: "Palav Aayush Kanchan",            email: "ce24.aayush.palav@kccemsr.edu.in" },
    { name: "Paradkar Rohan Nilesh",           email: "ce24.rohan.paradkar@kccemsr.edu.in" },
    { name: "Shirke Parth Ajit",               email: "ce24.parth.shirke@kccemsr.edu.in" },
    { name: "Patil Aradhya Kiran",             email: "ce24.aradhya.patil@kccemsr.edu.in" },
    { name: "Patil Kasturi Sandeep",           email: "ce24.kasturi.patil@kccemsr.edu.in" },
    { name: "Patil Rahul Arun",                email: "ce24.rahul.patil@kccemsr.edu.in" },
    { name: "Patkar Raaj Satish",              email: "ce24.raaj.patkar@kccemsr.edu.in" },
    { name: "Pawar Daivik Hemant",             email: "ce24.daivik.pawar@kccemsr.edu.in" },
    { name: "Pawar Mahendra Suresh",           email: "ce24.mahendra.pawar@kccemsr.edu.in" },
    { name: "Pawar Onkar Keshawrao",           email: "ce24.onkar.pawar@kccemsr.edu.in" },
    { name: "Peddharaju Ramesh Veerla",        email: "ce24.ramesh.peddharaju@kccemsr.edu.in" },
    { name: "Phadtare Harsh Sandesh",          email: "ce24.harsh.phadtare@kccemsr.edu.in" },
    { name: "Kumbhar Sarthak Vinod",           email: "ce24.sarthak.kumbhar@kccemsr.edu.in" },
    { name: "Gowda Nishant Manjunath",         email: "ce24.nishant.gowda@kccemsr.edu.in" },
    { name: "Parulekar Vaishnavi",             email: "ce24.vaishnavi.parulekar@kccemsr.edu.in" },
    { name: "Dalvi Abhishek",                  email: "ce24.abhishek.dalvi@kccemsr.edu.in" },
    { name: "Chaurasia Aditya",                email: "ce24.aditya.chaurasia@kccemsr.edu.in" },
    { name: "Harmalkar Om",                    email: "ce24.om.harmalkar@kccemsr.edu.in" },
    { name: "Pande Om",                        email: "ce24.om.pande@kccemsr.edu.in" },
  ];

  for (let i = 0; i < studentList.length; i++) {
    const s = studentList[i];
    store.users.push({
      id: makeId(),
      name: s.name,
      email: s.email,
      role: "student",
      department: "Computer Engineering",
      departmentId: ceId,
      year: 2,
      division: "B",
      className,
      subjects,
      rollNumber: i + 1,
      passwordHash,
    });
    await new Promise((r) => setTimeout(r, 2));
  }

  saveStore();
}
