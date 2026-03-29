import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { Colors } from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface Department { id: string; name: string; code: string; }
interface ClassRecord { id: string; departmentId: string; departmentCode: string; year: number; division: string; }
interface User { id: string; name: string; email: string; role: string; department?: string; departmentId?: string; year?: number; division?: string; className?: string; subjects?: string[]; }

type NavLevel =
  | { screen: "depts" }
  | { screen: "years"; dept: Department }
  | { screen: "divs"; dept: Department; year: number }
  | { screen: "members"; dept: Department; year: number; cls: ClassRecord };

type ModalMode = "none" | "add_dept" | "add_div" | "add_teacher" | "add_student" | "edit_user" | "confirm_delete" | "confirm_delete_div";

const YEAR_LABELS: Record<number, string> = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
const YEAR_ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

function mkClassName(code: string, year: number, div: string) {
  return `${code}-Y${year}-${div}`;
}

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const qc = useQueryClient();
  const router = useRouter();

  const [nav, setNav] = useState<NavLevel>({ screen: "depts" });
  const [modalMode, setModalMode] = useState<ModalMode>("none");

  // Store context explicitly when opening a modal — avoids any stale closure issues
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [activeYear, setActiveYear] = useState<number>(1);
  const [activeCls, setActiveCls] = useState<ClassRecord | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDiv, setSelectedDiv] = useState<ClassRecord | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [division, setDivision] = useState("");
  const [subjects, setSubjects] = useState<string[]>([""]);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/departments"), { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error || `${res.status}`); }
      return res.json() as Promise<Department[]>;
    },
  });

  const { data: allClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/classes"), { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error || `${res.status}`); }
      return res.json() as Promise<ClassRecord[]>;
    },
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/users"), { credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error || `${res.status}`); }
      return res.json() as Promise<User[]>;
    },
  });

  function getClassesForDept(deptId: string) { return (allClasses ?? []).filter((c) => c.departmentId === deptId); }
  function getClassesForYear(deptId: string, year: number) { return (allClasses ?? []).filter((c) => c.departmentId === deptId && c.year === year); }
  function getUsersForClass(cls: ClassRecord) {
    const cn = mkClassName(cls.departmentCode, cls.year, cls.division);
    return (users ?? []).filter((u) => u.className === cn);
  }

  function resetFields() { setName(""); setEmail(""); setPassword(""); setDeptName(""); setDeptCode(""); setDivision(""); setSubjects([""]); setFormError(""); }

  function closeModal() { setModalMode("none"); setSelectedUser(null); setSelectedDiv(null); resetFields(); }

  function openAddDept() { resetFields(); setModalMode("add_dept"); }

  function openAddDiv(dept: Department, year: number) {
    resetFields();
    setActiveDept(dept);
    setActiveYear(year);
    setModalMode("add_div");
  }

  function openAddUser(mode: "add_teacher" | "add_student", dept: Department, year: number, cls: ClassRecord) {
    resetFields();
    setActiveDept(dept);
    setActiveYear(year);
    setActiveCls(cls);
    setModalMode(mode);
  }

  function openEditUser(u: User) {
    setSelectedUser(u);
    setName(u.name); setEmail(u.email); setPassword(""); setSubjects(u.subjects?.length ? [...u.subjects, ""] : [""]);
    setFormError("");
    setModalMode("edit_user");
  }

  function openDeleteUser(u: User) { setSelectedUser(u); setModalMode("confirm_delete"); }
  function openDeleteDiv(cls: ClassRecord) { setSelectedDiv(cls); setModalMode("confirm_delete_div"); }

  function invalidateAll() {
    return Promise.all([
      qc.invalidateQueries({ queryKey: ["departments"] }),
      qc.invalidateQueries({ queryKey: ["all-classes"] }),
      qc.invalidateQueries({ queryKey: ["admin-users"] }),
      qc.invalidateQueries({ queryKey: ["admin-sessions"] }),
      qc.invalidateQueries({ queryKey: ["admin-attendance"] }),
    ]);
  }

  function handleApiError(e: any) {
    const msg: string = e?.message || "Failed";
    if (msg.includes("authenticated") || msg.includes("401") || msg.includes("session")) {
      setFormError("SESSION_EXPIRED");
    } else {
      setFormError(msg);
    }
  }

  async function handleAddDept() {
    if (!deptName.trim() || !deptCode.trim()) { setFormError("Name and code are required."); return; }
    setSaving(true);
    try {
      await apiRequest("POST", "/departments", { name: deptName.trim(), code: deptCode.trim().toUpperCase() });
      await qc.invalidateQueries({ queryKey: ["departments"] });
      closeModal();
    } catch (e: any) { handleApiError(e); }
    finally { setSaving(false); }
  }

  async function handleAddDiv() {
    if (!division.trim()) { setFormError("Division letter is required."); return; }
    if (!activeDept) { setFormError("Context lost, please try again."); return; }
    setSaving(true);
    try {
      const newCls: ClassRecord = await apiRequest("POST", "/classes", {
        departmentId: activeDept.id,
        year: activeYear,
        division: division.trim().toUpperCase(),
      });
      await qc.invalidateQueries({ queryKey: ["all-classes"] });
      closeModal();
      // Auto-navigate into the new division
      setNav({ screen: "members", dept: activeDept, year: activeYear, cls: newCls });
    } catch (e: any) { handleApiError(e); }
    finally { setSaving(false); }
  }

  function cleanSubjects() { return subjects.map((s) => s.trim()).filter(Boolean); }

  async function handleAddUser(role: "teacher" | "student") {
    if (!name.trim() || !email.trim() || !password.trim()) { setFormError("Name, email and password are required."); return; }
    if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (!activeDept || !activeCls) { setFormError("Context lost, please try again."); return; }
    const cn = mkClassName(activeCls.departmentCode, activeCls.year, activeCls.division);
    setSaving(true);
    try {
      await apiRequest("POST", "/users", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department: activeDept.name,
        departmentId: activeDept.id,
        year: activeCls.year,
        division: activeCls.division,
        className: cn,
        subjects: cleanSubjects(),
      });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    } catch (e: any) { handleApiError(e); }
    finally { setSaving(false); }
  }

  async function handleEditUser() {
    if (!name.trim()) { setFormError("Name is required."); return; }
    if (password && password.length > 0 && password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      const body: any = { name: name.trim(), subjects: cleanSubjects() };
      if (password.trim()) body.password = password.trim();
      await apiRequest("PUT", `/users/${selectedUser!.id}`, body);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    } catch (e: any) { handleApiError(e); }
    finally { setSaving(false); }
  }

  async function handleDeleteUser() {
    setDeleting(true);
    try {
      await apiRequest("DELETE", `/users/${selectedUser!.id}`, undefined);
      await invalidateAll();
      closeModal();
    } catch (e: any) { handleApiError(e); }
    finally { setDeleting(false); }
  }

  async function handleDeleteDiv() {
    if (!selectedDiv) return;
    setDeleting(true);
    try {
      await apiRequest("DELETE", `/classes/${selectedDiv.id}`, undefined);
      await invalidateAll();
      closeModal();
      if (nav.screen === "members") setNav({ screen: "divs", dept: nav.dept, year: nav.year });
    } catch (e: any) { handleApiError(e); }
    finally { setDeleting(false); }
  }

  function onBack() {
    if (nav.screen === "years") setNav({ screen: "depts" });
    else if (nav.screen === "divs") setNav({ screen: "years", dept: nav.dept });
    else if (nav.screen === "members") setNav({ screen: "divs", dept: nav.dept, year: nav.year });
  }

  function navTitle() {
    if (nav.screen === "depts") return { title: "Departments", subtitle: `${departments?.length ?? 0} departments` };
    if (nav.screen === "years") return { title: nav.dept.name, subtitle: nav.dept.code };
    if (nav.screen === "divs") return { title: YEAR_LABELS[nav.year] ?? `Year ${nav.year}`, subtitle: nav.dept.name };
    return { title: `Division ${nav.cls.division}`, subtitle: `${YEAR_LABELS[nav.year] ?? ""} · ${nav.dept.name}` };
  }

  const { title, subtitle } = navTitle();
  const isLoading = loadingDepts || loadingClasses || loadingUsers;

  function renderDepts() {
    return (
      <FlatList
        data={departments ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No departments yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAddDept}>
              <Text style={styles.emptyBtnText}>Add First Department</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: dept }) => {
          const classes = getClassesForDept(dept.id);
          const memberCount = (users ?? []).filter((u) => u.departmentId === dept.id).length;
          return (
            <TouchableOpacity style={styles.deptCard} onPress={() => setNav({ screen: "years", dept })} activeOpacity={0.82}>
              <LinearGradient colors={[Colors.primaryDark, Colors.accent]} style={styles.deptIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.deptCode}>{dept.code}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.deptName}>{dept.name}</Text>
                <Text style={styles.deptMeta}>{classes.length} classes · {memberCount} members</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  function renderYears() {
    if (nav.screen !== "years") return null;
    const dept = nav.dept;
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        <Text style={styles.sectionHint}>Select a year to manage its divisions</Text>
        {[1, 2, 3, 4].map((yr) => {
          const divs = getClassesForYear(dept.id, yr);
          const memberCount = divs.reduce((sum, cls) => sum + getUsersForClass(cls).length, 0);
          return (
            <TouchableOpacity key={yr} style={styles.yearCard} onPress={() => setNav({ screen: "divs", dept, year: yr })} activeOpacity={0.82}>
              <View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{YEAR_ORDINALS[yr]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.yearLabel}>{YEAR_LABELS[yr]}</Text>
                <Text style={styles.yearMeta}>{divs.length} division{divs.length !== 1 ? "s" : ""}{memberCount > 0 ? ` · ${memberCount} members` : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  function renderDivs() {
    if (nav.screen !== "divs") return null;
    const { dept, year } = nav;
    const divs = getClassesForYear(dept.id, year);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        <View style={styles.divHeaderRow}>
          <Text style={styles.sectionHint}>Divisions in {YEAR_LABELS[year]}</Text>
          <TouchableOpacity style={styles.addDivBtn} onPress={() => openAddDiv(dept, year)}>
            <Ionicons name="add" size={14} color={Colors.accent} />
            <Text style={styles.addDivBtnText}>Add Division</Text>
          </TouchableOpacity>
        </View>
        {divs.length === 0 ? (
          <View style={styles.emptyInner}>
            <Ionicons name="grid-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyInnerText}>No divisions yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openAddDiv(dept, year)}>
              <Text style={styles.emptyBtnText}>Add First Division</Text>
            </TouchableOpacity>
          </View>
        ) : divs.map((cls) => {
          const members = getUsersForClass(cls);
          const teachers = members.filter((u) => u.role === "teacher");
          const students = members.filter((u) => u.role === "student");
          return (
            <TouchableOpacity key={cls.id} style={styles.divCard} onPress={() => setNav({ screen: "members", dept, year, cls })} activeOpacity={0.82}>
              <View style={styles.divBadge}><Text style={styles.divBadgeText}>{cls.division}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.divName}>Division {cls.division}</Text>
                <Text style={styles.divMeta}>{teachers.length} teacher{teachers.length !== 1 ? "s" : ""} · {students.length} student{students.length !== 1 ? "s" : ""}</Text>
                <Text style={styles.divClassName}>{mkClassName(cls.departmentCode, cls.year, cls.division)}</Text>
              </View>
              <View style={styles.divActions}>
                <TouchableOpacity style={styles.trashBtn} onPress={() => openDeleteDiv(cls)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  function renderMembers() {
    if (nav.screen !== "members") return null;
    const { dept, year, cls } = nav;
    const members = getUsersForClass(cls);
    const teachers = members.filter((u) => u.role === "teacher");
    const students = members.filter((u) => u.role === "student");
    const cn = mkClassName(cls.departmentCode, cls.year, cls.division);

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
        <View style={styles.classInfoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.classInfoLabel}>Class ID</Text>
            <Text style={styles.classInfoValue}>{cn}</Text>
          </View>
          <View style={styles.classInfoStats}>
            <View style={styles.classInfoStat}>
              <Text style={styles.classInfoStatNum}>{teachers.length}</Text>
              <Text style={styles.classInfoStatLabel}>Teachers</Text>
            </View>
            <View style={styles.classInfoStat}>
              <Text style={styles.classInfoStatNum}>{students.length}</Text>
              <Text style={styles.classInfoStatLabel}>Students</Text>
            </View>
          </View>
        </View>

        <View style={styles.memberSection}>
          <View style={styles.memberSectionRow}>
            <Text style={styles.memberSectionLabel}>TEACHERS</Text>
            <TouchableOpacity style={styles.addMemberBtn} onPress={() => openAddUser("add_teacher", dept, year, cls)}>
              <Ionicons name="add" size={13} color={Colors.warning} />
              <Text style={[styles.addMemberText, { color: Colors.warning }]}>Add Teacher</Text>
            </TouchableOpacity>
          </View>
          {teachers.length === 0 ? <Text style={styles.noMemberText}>No teachers assigned</Text>
            : teachers.map((u) => <MemberRow key={u.id} user={u} color={Colors.warning} onEdit={() => openEditUser(u)} onDelete={() => openDeleteUser(u)} />)}
        </View>

        <View style={[styles.memberSection, { marginTop: 20 }]}>
          <View style={styles.memberSectionRow}>
            <Text style={styles.memberSectionLabel}>STUDENTS</Text>
            <TouchableOpacity style={styles.addMemberBtn} onPress={() => openAddUser("add_student", dept, year, cls)}>
              <Ionicons name="add" size={13} color={Colors.accent} />
              <Text style={[styles.addMemberText, { color: Colors.accent }]}>Add Student</Text>
            </TouchableOpacity>
          </View>
          {students.length === 0 ? <Text style={styles.noMemberText}>No students enrolled</Text>
            : students.map((u) => <MemberRow key={u.id} user={u} color={Colors.accent} onEdit={() => openEditUser(u)} onDelete={() => openDeleteUser(u)} />)}
        </View>
      </ScrollView>
    );
  }

  const showModal = modalMode !== "none";

  return (
    <View style={styles.screen}>
      <GradientHeader
        title={title}
        subtitle={subtitle}
        left={nav.screen !== "depts" ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : undefined}
        right={nav.screen === "depts" ? (
          <TouchableOpacity style={styles.headerAddBtn} onPress={openAddDept}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {nav.screen === "depts" && renderDepts()}
          {nav.screen === "years" && renderYears()}
          {nav.screen === "divs" && renderDivs()}
          {nav.screen === "members" && renderMembers()}
        </>
      )}

      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} />
          <ScrollView
            style={[styles.modalSheet, { maxHeight: "90%" }]}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHandle} />

            {formError === "SESSION_EXPIRED" ? (
              <SessionExpiredView onGoLogin={() => { closeModal(); router.replace("/"); }} />
            ) : (
              <>
                {modalMode === "add_dept" && (
                  <DeptForm
                    deptName={deptName} setDeptName={setDeptName}
                    deptCode={deptCode} setDeptCode={setDeptCode}
                    error={formError} saving={saving} onSubmit={handleAddDept}
                  />
                )}
                {modalMode === "add_div" && activeDept && (
                  <DivForm
                    division={division} setDivision={setDivision}
                    year={activeYear} dept={activeDept}
                    error={formError} saving={saving} onSubmit={handleAddDiv}
                  />
                )}
                {(modalMode === "add_teacher" || modalMode === "add_student") && activeDept && activeCls && (
                  <UserForm
                    role={modalMode === "add_teacher" ? "teacher" : "student"}
                    cls={activeCls} dept={activeDept}
                    name={name} setName={setName}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    subjects={subjects} setSubjects={setSubjects}
                    error={formError} saving={saving}
                    onSubmit={() => handleAddUser(modalMode === "add_teacher" ? "teacher" : "student")}
                  />
                )}
                {modalMode === "edit_user" && selectedUser && (
                  <EditUserForm
                    user={selectedUser}
                    name={name} setName={setName}
                    password={password} setPassword={setPassword}
                    subjects={subjects} setSubjects={setSubjects}
                    error={formError} saving={saving} onSubmit={handleEditUser}
                  />
                )}
                {modalMode === "confirm_delete" && selectedUser && (
                  <ConfirmSheet
                    icon="person-remove-outline"
                    title={`Remove ${selectedUser.role === "teacher" ? "Teacher" : "Student"}?`}
                    body={`${selectedUser.name} will be permanently removed.`}
                    confirmLabel="Remove"
                    deleting={deleting}
                    onConfirm={handleDeleteUser}
                    onCancel={closeModal}
                  />
                )}
                {modalMode === "confirm_delete_div" && selectedDiv && (
                  <ConfirmSheet
                    icon="trash-outline"
                    title="Delete Division?"
                    body={`Division ${selectedDiv.division} and all its members will be permanently removed.`}
                    confirmLabel="Delete Division"
                    deleting={deleting}
                    onConfirm={handleDeleteDiv}
                    onCancel={closeModal}
                  />
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ------------- Sub-components ---------------

function MemberRow({ user, color, onEdit, onDelete }: { user: User; color: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: color + "18" }]}>
        <Text style={[styles.memberAvatarText, { color }]}>{user.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{user.name}</Text>
        <Text style={styles.memberEmail}>{user.email}</Text>
        {user.subjects && user.subjects.length > 0 && (
          <View style={styles.subjectTags}>
            {user.subjects.slice(0, 3).map((s, i) => (
              <View key={i} style={[styles.subjectTag, { backgroundColor: color + "15" }]}>
                <Text style={[styles.subjectTagText, { color }]}>{s}</Text>
              </View>
            ))}
            {user.subjects.length > 3 && <Text style={styles.subjectMore}>+{user.subjects.length - 3}</Text>}
          </View>
        )}
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SessionExpiredView({ onGoLogin }: { onGoLogin: () => void }) {
  return (
    <View style={styles.sessionExpiredWrap}>
      <Ionicons name="lock-closed-outline" size={44} color={Colors.warning} />
      <Text style={styles.sessionExpiredTitle}>Session Expired</Text>
      <Text style={styles.sessionExpiredBody}>Your login session has expired. Please sign in again to continue.</Text>
      <TouchableOpacity style={styles.loginAgainBtn} onPress={onGoLogin}>
        <Ionicons name="log-in-outline" size={18} color={Colors.white} />
        <Text style={styles.loginAgainText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

function Handle() { return <View style={styles.modalHandle} />; }
function FL({ label }: { label: string }) { return <Text style={styles.fieldLabel}>{label}</Text>; }
function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

function InputRow({ icon, placeholder, value, onChange, keyboardType, autoCapitalize, maxLength }: {
  icon: any; placeholder: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any; maxLength?: number;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={Colors.textMuted} value={value} onChangeText={onChange} keyboardType={keyboardType} autoCapitalize={autoCapitalize} maxLength={maxLength} />
    </View>
  );
}

function PasswordRow({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.inputWrap}>
      <Ionicons name="lock-closed-outline" size={17} color={Colors.textMuted} style={{ marginRight: 8 }} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={Colors.textMuted} value={value} onChangeText={onChange} secureTextEntry={!show} autoCapitalize="none" />
      <TouchableOpacity onPress={() => setShow((s) => !s)} style={{ padding: 4 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={17} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function SubjectsInput({ subjects, setSubjects }: { subjects: string[]; setSubjects: (s: string[]) => void }) {
  function updateAt(i: number, val: string) {
    const next = [...subjects];
    next[i] = val;
    // Auto-add a new empty row if the last field has text
    if (i === next.length - 1 && val.trim()) next.push("");
    setSubjects(next);
  }
  function removeAt(i: number) {
    if (subjects.length <= 1) { setSubjects([""]); return; }
    setSubjects(subjects.filter((_, idx) => idx !== i));
  }
  return (
    <View style={{ gap: 8 }}>
      {subjects.map((s, i) => (
        <View key={i} style={styles.subjectInputRow}>
          <Ionicons name="book-outline" size={15} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={i === 0 ? "e.g. Mathematics" : "Add another subject…"}
            placeholderTextColor={Colors.textMuted}
            value={s}
            onChangeText={(v) => updateAt(i, v)}
            autoCapitalize="words"
          />
          {subjects.length > 1 && (
            <TouchableOpacity onPress={() => removeAt(i)} style={styles.removeSubBtn}>
              <Ionicons name="close" size={14} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addSubBtn} onPress={() => setSubjects([...subjects, ""])}>
        <Ionicons name="add-circle-outline" size={15} color={Colors.accent} />
        <Text style={styles.addSubText}>Add subject</Text>
      </TouchableOpacity>
    </View>
  );
}

function SubmitBtn({ saving, label, icon, onPress, color = Colors.accent }: { saving: boolean; label: string; icon: any; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: color }]} onPress={onPress} disabled={saving} activeOpacity={0.85}>
      {saving ? <ActivityIndicator color={Colors.white} /> : (
        <><Ionicons name={icon} size={18} color={Colors.white} /><Text style={styles.submitBtnText}>{label}</Text></>
      )}
    </TouchableOpacity>
  );
}

function DeptForm({ deptName, setDeptName, deptCode, setDeptCode, error, saving, onSubmit }: any) {
  return (
    <>
      <Text style={styles.modalTitle}>Add Department</Text>
      <Text style={styles.modalSubtitle}>Create a new academic department</Text>
      {error ? <ErrorBox msg={error} /> : null}
      <FL label="Department Name" />
      <InputRow icon="business-outline" placeholder="e.g. Civil Engineering" value={deptName} onChange={setDeptName} />
      <FL label="Short Code" />
      <InputRow icon="code-outline" placeholder="e.g. CE" value={deptCode} onChange={(v) => setDeptCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} />
      <SubmitBtn saving={saving} label="Add Department" icon="add-circle-outline" onPress={onSubmit} />
    </>
  );
}

function DivForm({ division, setDivision, year, dept, error, saving, onSubmit }: any) {
  const suggestions = ["A", "B", "C", "D", "E", "F"];
  return (
    <>
      <Text style={styles.modalTitle}>Add Division</Text>
      <Text style={styles.modalSubtitle}>{YEAR_LABELS[year] ?? `Year ${year}`} · {dept.name}</Text>
      {error ? <ErrorBox msg={error} /> : null}
      <FL label="Pick a division letter" />
      <View style={styles.divSuggestions}>
        {suggestions.map((s) => (
          <TouchableOpacity key={s} style={[styles.divSugBtn, division === s && styles.divSugBtnActive]} onPress={() => setDivision(s)}>
            <Text style={[styles.divSugText, division === s && styles.divSugTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FL label="Or type custom" />
      <InputRow icon="layers-outline" placeholder="e.g. A" value={division} onChange={(v) => setDivision(v.toUpperCase())} autoCapitalize="characters" maxLength={3} />
      <SubmitBtn saving={saving} label="Add Division" icon="add-circle-outline" onPress={onSubmit} />
    </>
  );
}

function UserForm({ role, cls, dept, name, setName, email, setEmail, password, setPassword, subjects, setSubjects, error, saving, onSubmit }: any) {
  const isTeacher = role === "teacher";
  const color = isTeacher ? Colors.warning : Colors.accent;
  const cn = mkClassName(cls.departmentCode, cls.year, cls.division);
  return (
    <>
      <View style={[styles.rolePill, { backgroundColor: color + "18", alignSelf: "flex-start", marginBottom: 10 }]}>
        <Ionicons name={isTeacher ? "school-outline" : "person-outline"} size={13} color={color} />
        <Text style={[styles.rolePillText, { color }]}>{isTeacher ? "Teacher" : "Student"}</Text>
      </View>
      <Text style={styles.modalTitle}>Add {isTeacher ? "Teacher" : "Student"}</Text>
      <Text style={styles.modalSubtitle}>{dept.name} · {YEAR_LABELS[cls.year]} · Div {cls.division}</Text>
      <View style={styles.classTag}>
        <Ionicons name="layers-outline" size={13} color={Colors.accent} />
        <Text style={styles.classTagText}>Class: {cn}</Text>
      </View>
      {error ? <ErrorBox msg={error} /> : null}
      <FL label="Full Name" />
      <InputRow icon="person-outline" placeholder="Full name" value={name} onChange={setName} />
      <FL label="Email" />
      <InputRow icon="mail-outline" placeholder="email@campus.edu" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <FL label="Password" />
      <PasswordRow placeholder="Min. 6 characters" value={password} onChange={setPassword} />
      <FL label={isTeacher ? "Subjects Taught" : "Subjects Enrolled"} />
      <SubjectsInput subjects={subjects} setSubjects={setSubjects} />
      <View style={styles.credNote}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.credNoteText}>Share these login details with the {role}.</Text>
      </View>
      <SubmitBtn saving={saving} label={`Add ${isTeacher ? "Teacher" : "Student"}`} icon="person-add-outline" onPress={onSubmit} color={color} />
    </>
  );
}

function EditUserForm({ user, name, setName, password, setPassword, subjects, setSubjects, error, saving, onSubmit }: any) {
  const isTeacher = user.role === "teacher";
  const color = isTeacher ? Colors.warning : Colors.accent;
  return (
    <>
      <View style={[styles.rolePill, { backgroundColor: color + "18", alignSelf: "flex-start", marginBottom: 10 }]}>
        <Ionicons name="pencil-outline" size={13} color={color} />
        <Text style={[styles.rolePillText, { color }]}>Edit {isTeacher ? "Teacher" : "Student"}</Text>
      </View>
      <Text style={styles.modalTitle}>Edit Details</Text>
      <Text style={styles.modalSubtitle}>{user.email}</Text>
      {error ? <ErrorBox msg={error} /> : null}
      <FL label="Full Name" />
      <InputRow icon="person-outline" placeholder="Full name" value={name} onChange={setName} />
      <FL label="New Password (optional)" />
      <PasswordRow placeholder="Leave blank to keep current" value={password} onChange={setPassword} />
      <FL label={isTeacher ? "Subjects Taught" : "Subjects Enrolled"} />
      <SubjectsInput subjects={subjects} setSubjects={setSubjects} />
      <SubmitBtn saving={saving} label="Save Changes" icon="checkmark-circle-outline" onPress={onSubmit} color={color} />
    </>
  );
}

function ConfirmSheet({ icon, title, body, confirmLabel, deleting, onConfirm, onCancel }: any) {
  return (
    <View>
      <View style={styles.deleteIconWrap}><Ionicons name={icon} size={38} color={Colors.error} /></View>
      <Text style={styles.confirmTitle}>{title}</Text>
      <Text style={styles.confirmBody}>{body}</Text>
      <View style={styles.confirmBtnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={deleting}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={styles.confirmDeleteBtn} onPress={onConfirm} disabled={deleting}>
          {deleting ? <ActivityIndicator color={Colors.white} size="small" /> : <><Ionicons name="trash-outline" size={15} color={Colors.white} /><Text style={styles.confirmDeleteBtnText}>{confirmLabel}</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },

  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyInner: { alignItems: "center", marginTop: 32, gap: 10 },
  emptyInnerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  emptyBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },

  sectionHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },

  deptCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  deptIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  deptCode: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white },
  deptName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  deptMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  yearCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  yearBadge: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  yearBadgeText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.accent },
  yearLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  yearMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  divHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  addDivBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.accentPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addDivBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  divCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  divBadge: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primaryDark + "18", alignItems: "center", justifyContent: "center" },
  divBadgeText: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.primaryDark },
  divName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  divMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  divClassName: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.accent, marginTop: 3 },
  divActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  trashBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },

  classInfoCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 16, marginBottom: 20 },
  classInfoLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  classInfoValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  classInfoStats: { flexDirection: "row", gap: 20 },
  classInfoStat: { alignItems: "center" },
  classInfoStatNum: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white },
  classInfoStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },

  memberSection: {},
  memberSectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  memberSectionLabel: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textMuted, letterSpacing: 0.8 },
  addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.accentPale },
  addMemberText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  noMemberText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, fontStyle: "italic", paddingVertical: 4 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.card, borderRadius: 13, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  memberAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  memberEmail: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  memberActions: { flexDirection: "row", gap: 6 },
  editBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },

  subjectTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  subjectTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  subjectTagText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  subjectMore: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, alignSelf: "center" },

  subjectInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12 },
  removeSubBtn: { padding: 4 },
  addSubBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  addSubText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.accent },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 4 },
  modalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },

  divSuggestions: { flexDirection: "row", gap: 8, marginBottom: 12 },
  divSugBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  divSugBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  divSugText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  divSugTextActive: { color: Colors.white },

  classTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.accentPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start", marginBottom: 14 },
  classTagText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  rolePillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  credNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: Colors.accentPale, borderRadius: 10, padding: 10, marginTop: 12, marginBottom: 4 },
  credNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.error, flex: 1 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, marginBottom: 6, marginTop: 10 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, paddingVertical: 13 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },

  sessionExpiredWrap: { alignItems: "center", paddingVertical: 30, gap: 12 },
  sessionExpiredTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  sessionExpiredBody: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  loginAgainBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  loginAgainText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },

  deleteIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#FEE2E2", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 14, marginTop: 4 },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: Colors.text, textAlign: "center", marginBottom: 8 },
  confirmBody: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 22 },
  confirmBtnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  confirmDeleteBtn: { flex: 1, borderRadius: 14, paddingVertical: 15, backgroundColor: Colors.error, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  confirmDeleteBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },
});
