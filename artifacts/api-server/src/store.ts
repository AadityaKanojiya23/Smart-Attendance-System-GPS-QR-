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

export async function migrateCETeachers(): Promise<void> {
  // Idempotent: skip if CE teachers already added
  if (store.users.some((u) => u.email === "ce.shweta.gaikwad@kccemsr.edu.in")) return;

  // Find CE department
  const ceDept = store.departments.find((d) => d.code === "CE");
  if (!ceDept) return;

  const passwordHash = await bcrypt.hash("teacher@123", 10);
  const ceId = ceDept.id;
  const className = classCode("CE", 2, "B");

  const teachers: Array<{ name: string; email: string; subjects: string[] }> = [
    {
      name: "Shweta Gaikwad",
      email: "ce.shweta.gaikwad@kccemsr.edu.in",
      subjects: ["Web Technology", "WT LAB"],
    },
    {
      name: "Rujuta Dhon",
      email: "ce.rujuta.dhon@kccemsr.edu.in",
      subjects: ["Operating System", "OS LAB"],
    },
    {
      name: "Ashwini Gaikwad",
      email: "ce.ashwini.gaikwad@kccemsr.edu.in",
      subjects: ["DBMS", "DBMS LAB"],
    },
    {
      name: "Pranita Sangit",
      email: "ce.pranita.sangit@kccemsr.edu.in",
      subjects: ["BMD", "BMD LAB"],
    },
    {
      name: "Monali Patil",
      email: "ce.monali.patil@kccemsr.edu.in",
      subjects: ["CT", "DT", "DT LAB"],
    },
    {
      name: "Ravi Prakash",
      email: "ce.ravi.prakash@kccemsr.edu.in",
      subjects: ["OE"],
    },
  ];

  for (const t of teachers) {
    store.users.push({
      id: makeId(),
      name: t.name,
      email: t.email,
      role: "teacher",
      department: "Computer Engineering",
      departmentId: ceId,
      year: 2,
      division: "B",
      className,
      subjects: t.subjects,
      assignments: [
        {
          className,
          departmentId: ceId,
          departmentCode: "CE",
          year: 2,
          division: "B",
          subjects: t.subjects,
        },
      ],
      passwordHash,
    });
    await new Promise((r) => setTimeout(r, 2));
  }

  saveStore();
}

export async function migrateCEDivisionA(): Promise<void> {
  // Idempotent: skip if CE-Y2-A class already exists
  if (store.classes.some((c) => c.departmentCode === "CE" && c.year === 2 && c.division === "A")) return;

  const ceDept = store.departments.find((d) => d.code === "CE");
  if (!ceDept) return;

  const ceId = ceDept.id;

  store.classes.push({
    id: makeId(),
    departmentId: ceId,
    departmentCode: "CE",
    year: 2,
    division: "A",
    createdAt: new Date().toISOString(),
  });

  const className = classCode("CE", 2, "A");
  const subjects = [
    "Web Technology", "Operating System", "DBMS", "BMD", "OE",
    "WT LAB", "OS LAB", "DBMS LAB", "BMD LAB", "CT", "DT", "DT LAB",
  ];

  const passwordHash = await bcrypt.hash("student@123", 10);

  // Rolls 15, 16, 26, 35 are vacant — represented as null
  const studentList: Array<{ roll: number; name: string; email: string } | null> = [
    { roll: 1,  name: "Anchan Riya Atul",                   email: "ce24.riya.anchan@kccemsr.edu.in" },
    { roll: 2,  name: "Kulkarni Anurag Vaibhav",            email: "ce24.anurag.kulkarni@kccemsr.edu.in" },
    { roll: 3,  name: "Gujarathi Anushka Rupesh",           email: "ce24.anushka.gujarathi@kccemsr.edu.in" },
    { roll: 4,  name: "Arora Bhavjeet Singh",               email: "ce24.bhavjeet.arora@kccemsr.edu.in" },
    { roll: 5,  name: "Barge Yash Pandurang",               email: "ce24.yash.barge@kccemsr.edu.in" },
    { roll: 6,  name: "Bharti Gaurav Kumar",                email: "ce24.gaurav.bharti@kccemsr.edu.in" },
    { roll: 7,  name: "Bhatt Prakash",                      email: "ce24.prakash.bhatt@kccemsr.edu.in" },
    { roll: 8,  name: "Bhatti Rabjeet Singh",               email: "ce24.rabjeet.bhatti@kccemsr.edu.in" },
    { roll: 9,  name: "Bhere Sudhanshu Swapnil",            email: "ce24.sudhanshu.bhere@kccemsr.edu.in" },
    { roll: 10, name: "Bhor Manas Santosh",                 email: "ce24.manas.bhor@kccemsr.edu.in" },
    { roll: 11, name: "Bhosale Siddhi Hanmant",             email: "ce24.siddhi.bhosale@kccemsr.edu.in" },
    { roll: 12, name: "Biradar Shubham Prabhakar",          email: "ce24.shubham.biradar@kccemsr.edu.in" },
    { roll: 13, name: "Chaudhari Anushree Chandrashekhar",  email: "ce24.anushree.chaudhari@kccemsr.edu.in" },
    { roll: 14, name: "Chaudhari Atharva Vishal",           email: "ce24.atharva.chaudhari@kccemsr.edu.in" },
    null, // roll 15 — vacant
    null, // roll 16 — vacant
    { roll: 17, name: "Chavan Tushar",                      email: "ce24.tushar.chavan@kccemsr.edu.in" },
    { roll: 18, name: "Choudhary Jodharam",                 email: "ce24.jodharam.choudhary@kccemsr.edu.in" },
    { roll: 19, name: "Choudhury Adyasa",                   email: "ce24.adyasa.choudhury@kccemsr.edu.in" },
    { roll: 20, name: "Chutake Swarup Mangesh",             email: "ce24.swarup.chutake@kccemsr.edu.in" },
    { roll: 21, name: "Dagade Kaveri Khandu",               email: "ce24.kaveri.dagade@kccemsr.edu.in" },
    { roll: 22, name: "Damal Rani Lakshmidhar",             email: "ce24.rani.damal@kccemsr.edu.in" },
    { roll: 23, name: "Dehot Kabir Singh",                  email: "ce24.kabir.dehot@kccemsr.edu.in" },
    { roll: 24, name: "Desai Janhavi Santosh",              email: "ce24.janhavi.desai@kccemsr.edu.in" },
    { roll: 25, name: "Devkate Sakshi Mahesh",              email: "ce24.sakshi.devkate@kccemsr.edu.in" },
    null, // roll 26 — vacant
    { roll: 27, name: "Dhankute Neha Narayan",              email: "ce24.neha.dhankute@kccemsr.edu.in" },
    { roll: 28, name: "Dhembare Pratik Ganpat",             email: "ce24.pratik.dhembare@kccemsr.edu.in" },
    { roll: 29, name: "Rathod Dhruvi Dharmeshkumar",        email: "ce24.dhruvi.rathod@kccemsr.edu.in" },
    { roll: 30, name: "Dubey Aditya Pradeep",               email: "ce24.aditya.dubey@kccemsr.edu.in" },
    { roll: 31, name: "Dubey Kritarth Chandraprakash",      email: "ce24.kritarth.dubey@kccemsr.edu.in" },
    { roll: 32, name: "Dusane Punit",                       email: "ce24.punit.dusane@kccemsr.edu.in" },
    { roll: 33, name: "Gaikwad Sarthak",                    email: "ce24.sarthak.gaikwad@kccemsr.edu.in" },
    { roll: 34, name: "Gaikwad Vinit Ravindra",             email: "ce24.vinit.gaikwad@kccemsr.edu.in" },
    null, // roll 35 — vacant
    { roll: 36, name: "Gautam Aayush Rakesh",               email: "ce24.aayush.gautam@kccemsr.edu.in" },
    { roll: 37, name: "Ghadge Shruti",                      email: "ce24.shruti.ghadge@kccemsr.edu.in" },
    { roll: 38, name: "Ghanekar Adwait Abhijit",            email: "ce24.adwait.ghanekar@kccemsr.edu.in" },
    { roll: 39, name: "Ghone Vihang Santosh",               email: "ce24.vihang.ghone@kccemsr.edu.in" },
    { roll: 40, name: "Ghude Prathmesh Janardan",           email: "ce24.prathmesh.ghude@kccemsr.edu.in" },
    { roll: 41, name: "Gole Mansi Mangesh",                 email: "ce24.mansi.gole@kccemsr.edu.in" },
    { roll: 42, name: "Gore Parth Bhagwan",                 email: "ce24.parth.gore@kccemsr.edu.in" },
    { roll: 43, name: "Govilkar Prathamesh Sachin",         email: "ce24.prathamesh.govilkar@kccemsr.edu.in" },
    { roll: 44, name: "Gujuri Kishan Sanyasi",              email: "ce24.kishan.gujuri@kccemsr.edu.in" },
    { roll: 45, name: "Gundeti Rohith Ganesh",              email: "ce24.rohith.gundeti@kccemsr.edu.in" },
    { roll: 46, name: "Gupta Karan Arun",                   email: "ce24.karan.gupta@kccemsr.edu.in" },
    { roll: 47, name: "Gupta Shubham Shashi",               email: "ce24.shubham.gupta@kccemsr.edu.in" },
    { roll: 48, name: "Haliat Manbir Singh",                email: "ce24.manbir.haliat@kccemsr.edu.in" },
    { roll: 49, name: "Hutait Aditya Asim",                 email: "ce24.aditya.hutait@kccemsr.edu.in" },
    { roll: 50, name: "Lanjekar Isha Vijay",                email: "ce24.isha.lanjekar@kccemsr.edu.in" },
    { roll: 51, name: "Jadhav Ayushi Ashok",                email: "ce24.ayushi.jadhav@kccemsr.edu.in" },
    { roll: 52, name: "Jadhav Laksh Sandeep",               email: "ce24.laksh.jadhav@kccemsr.edu.in" },
    { roll: 53, name: "Jadhav Shridhar",                    email: "ce24.shridhar.jadhav@kccemsr.edu.in" },
    { roll: 54, name: "Jadhav Tanvi Prashant",              email: "ce24.tanvi.jadhav@kccemsr.edu.in" },
    { roll: 55, name: "Patil Jagrut Rajeev",                email: "ce24.jagrut.patil@kccemsr.edu.in" },
    { roll: 56, name: "Jena Smruti S",                      email: "ce24.smruti.jena@kccemsr.edu.in" },
    { roll: 57, name: "Jha Divya Sanjay",                   email: "ce24.divya.jha@kccemsr.edu.in" },
    { roll: 58, name: "Jha Pooja Ajit",                     email: "ce24.pooja.jha@kccemsr.edu.in" },
    { roll: 59, name: "Kanekar Mourvika Mahendra",          email: "ce24.mourvika.kanekar@kccemsr.edu.in" },
    { roll: 60, name: "Singh Harsh",                        email: "ce24.harsh.singh@kccemsr.edu.in" },
    { roll: 61, name: "Disale Pranali",                     email: "ce24.pranali.disale@kccemsr.edu.in" },
    { roll: 62, name: "Sonawane Maithili",                  email: "ce24.maithili.sonawane@kccemsr.edu.in" },
    { roll: 63, name: "Chorghe Anushree",                   email: "ce24.anushree.chorghe@kccemsr.edu.in" },
    { roll: 64, name: "Ludbe Sanskruti",                    email: "ce24.sanskruti.ludbe@kccemsr.edu.in" },
    { roll: 65, name: "Bhekara Ashwath",                    email: "ce24.ashwath.bhekara@kccemsr.edu.in" },
    { roll: 66, name: "Pawar Shirish",                      email: "ce24.shirish.pawar@kccemsr.edu.in" },
  ];

  for (const s of studentList) {
    if (!s) continue; // skip vacant rolls
    store.users.push({
      id: makeId(),
      name: s.name,
      email: s.email,
      role: "student",
      department: "Computer Engineering",
      departmentId: ceId,
      year: 2,
      division: "A",
      className,
      subjects,
      rollNumber: s.roll,
      passwordHash,
    });
    await new Promise((r) => setTimeout(r, 2));
  }

  saveStore();
}

export async function migrateCEDivisionATeachers(): Promise<void> {
  // Idempotent: skip if Archana Kalia already exists
  if (store.users.some((u) => u.email === "ce.archana.kalia@kccemsr.edu.in")) return;

  const ceDept = store.departments.find((d) => d.code === "CE");
  if (!ceDept) return;

  const ceId = ceDept.id;
  const classNameA = classCode("CE", 2, "A");
  const passwordHash = await bcrypt.hash("teacher@123", 10);

  // 4 new teachers specific to CE-Y2-A
  const newTeachers = [
    { name: "Kalia Archana",  email: "ce.archana.kalia@kccemsr.edu.in",  subjects: ["Web Technology", "WT LAB"] },
    { name: "Gharde Ashwini", email: "ce.ashwini.gharde@kccemsr.edu.in", subjects: ["DBMS", "DBMS LAB"] },
    { name: "Bhujbal Suman",  email: "ce.suman.bhujbal@kccemsr.edu.in",  subjects: ["BMD", "BMD LAB"] },
    { name: "Patil Sandeep",  email: "ce.sandeep.patil@kccemsr.edu.in",  subjects: ["DT", "DT LAB"] },
  ];

  for (const t of newTeachers) {
    store.users.push({
      id: makeId(),
      name: t.name,
      email: t.email,
      role: "teacher",
      department: "Computer Engineering",
      departmentId: ceId,
      year: 2,
      division: "A",
      className: classNameA,
      subjects: t.subjects,
      assignments: [
        {
          className: classNameA,
          departmentId: ceId,
          departmentCode: "CE",
          year: 2,
          division: "A",
          subjects: t.subjects,
        },
      ],
      passwordHash,
    });
    await new Promise((r) => setTimeout(r, 2));
  }

  // 3 shared teachers: Rujuta Dhon, Monali Patil, Ravi Prakash — add CE-Y2-A assignment
  const sharedMap: Array<{ email: string; subjects: string[] }> = [
    { email: "ce.rujuta.dhon@kccemsr.edu.in",  subjects: ["Operating System", "OS LAB"] },
    { email: "ce.monali.patil@kccemsr.edu.in",  subjects: ["CT"] },
    { email: "ce.ravi.prakash@kccemsr.edu.in",  subjects: ["OE"] },
  ];

  for (const s of sharedMap) {
    const teacher = store.users.find((u) => u.email === s.email);
    if (!teacher) continue;
    if (!teacher.assignments) teacher.assignments = [];
    const alreadyHasA = teacher.assignments.some(
      (a) => a.departmentCode === "CE" && a.year === 2 && a.division === "A"
    );
    if (!alreadyHasA) {
      teacher.assignments.push({
        className: classNameA,
        departmentId: ceId,
        departmentCode: "CE",
        year: 2,
        division: "A",
        subjects: s.subjects,
      });
    }
  }

  saveStore();
}
