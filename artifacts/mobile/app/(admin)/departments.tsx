import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
interface User { id: string; name: string; email: string; role: string; department?: string; className?: string; }

type ModalMode = "none" | "add_dept" | "add_teacher" | "add_student" | "edit_user" | "confirm_delete";

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const qc = useQueryClient();

  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("none");
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "", className: "", deptName: "", deptCode: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/departments"), { credentials: "include" });
      return res.json() as Promise<Department[]>;
    },
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/users"), { credentials: "include" });
      return res.json() as Promise<User[]>;
    },
  });

  function getTeachers(deptName: string) {
    return (users ?? []).filter((u) => u.role === "teacher" && u.department === deptName);
  }
  function getStudents(deptName: string) {
    return (users ?? []).filter((u) => u.role === "student" && u.department === deptName);
  }

  function openAddDept() {
    setForm({ name: "", email: "", password: "", className: "", deptName: "", deptCode: "" });
    setFormError("");
    setModalMode("add_dept");
  }

  function openAddMember(dept: Department, role: "add_teacher" | "add_student") {
    setSelectedDept(dept);
    setForm({ name: "", email: "", password: "", className: "", deptName: "", deptCode: "" });
    setFormError("");
    setModalMode(role);
  }

  function openEditMember(user: User) {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      className: user.className ?? "",
      deptName: "",
      deptCode: "",
    });
    setFormError("");
    setModalMode("edit_user");
  }

  function openConfirmDelete(user: User) {
    setSelectedUser(user);
    setModalMode("confirm_delete");
  }

  function closeModal() {
    setModalMode("none");
    setSelectedDept(null);
    setSelectedUser(null);
    setFormError("");
  }

  async function handleAddDept() {
    if (!form.deptName.trim() || !form.deptCode.trim()) {
      setFormError("Department name and code are required.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/departments", { name: form.deptName.trim(), code: form.deptCode.trim() });
      qc.invalidateQueries({ queryKey: ["departments"] });
      closeModal();
    } catch (e: any) {
      setFormError(e?.message || "Failed to add department");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUser(role: "teacher" | "student") {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.className.trim()) {
      setFormError("All fields are required.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role,
        department: selectedDept!.name,
        className: form.className.trim(),
      });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    } catch (e: any) {
      setFormError(e?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditUser() {
    if (!form.name.trim() || !form.className.trim()) {
      setFormError("Name and class are required.");
      return;
    }
    if (form.password && form.password.length > 0 && form.password.length < 6) {
      setFormError("New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        className: form.className.trim(),
      };
      if (form.password.trim()) body.password = form.password.trim();
      await apiRequest("PUT", `/users/${selectedUser!.id}`, body);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    } catch (e: any) {
      setFormError(e?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await apiRequest("DELETE", `/users/${selectedUser.id}`, undefined);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-sessions"] }),
        qc.invalidateQueries({ queryKey: ["admin-attendance"] }),
        qc.invalidateQueries({ queryKey: ["departments"] }),
      ]);
      closeModal();
    } catch (e: any) {
      setFormError(e?.message || "Failed to remove user");
    } finally {
      setDeleting(false);
    }
  }

  const isLoading = loadingDepts || loadingUsers;

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Departments"
        subtitle={`${departments?.length ?? 0} departments`}
        right={
          <TouchableOpacity style={styles.addDeptBtn} onPress={openAddDept}>
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
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
            const teachers = getTeachers(dept.name);
            const students = getStudents(dept.name);
            const isExpanded = expandedDept === dept.id;

            return (
              <View style={styles.deptCard}>
                <TouchableOpacity
                  style={styles.deptHeader}
                  onPress={() => setExpandedDept(isExpanded ? null : dept.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.deptIconWrap}>
                    <Text style={styles.deptCode}>{dept.code}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deptName}>{dept.name}</Text>
                    <Text style={styles.deptMeta}>
                      {teachers.length} teacher{teachers.length !== 1 ? "s" : ""} · {students.length} student{students.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.deptBody}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionLabel}>Teachers</Text>
                      <TouchableOpacity
                        style={styles.addMemberBtn}
                        onPress={() => openAddMember(dept, "add_teacher")}
                      >
                        <Ionicons name="add" size={14} color={Colors.accent} />
                        <Text style={styles.addMemberText}>Add Teacher</Text>
                      </TouchableOpacity>
                    </View>

                    {teachers.length === 0 ? (
                      <Text style={styles.noMemberText}>No teachers assigned</Text>
                    ) : (
                      teachers.map((t) => (
                        <MemberRow
                          key={t.id}
                          user={t}
                          color={Colors.warning}
                          onEdit={() => openEditMember(t)}
                          onDelete={() => openConfirmDelete(t)}
                        />
                      ))
                    )}

                    <View style={[styles.sectionRow, { marginTop: 16 }]}>
                      <Text style={styles.sectionLabel}>Students</Text>
                      <TouchableOpacity
                        style={styles.addMemberBtn}
                        onPress={() => openAddMember(dept, "add_student")}
                      >
                        <Ionicons name="add" size={14} color={Colors.accent} />
                        <Text style={styles.addMemberText}>Add Student</Text>
                      </TouchableOpacity>
                    </View>

                    {students.length === 0 ? (
                      <Text style={styles.noMemberText}>No students enrolled</Text>
                    ) : (
                      students.map((s) => (
                        <MemberRow
                          key={s.id}
                          user={s}
                          color={Colors.accent}
                          onEdit={() => openEditMember(s)}
                          onDelete={() => openConfirmDelete(s)}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalMode !== "none"} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={[styles.modalSheet, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>

            {modalMode === "add_dept" && (
              <DeptForm
                form={form}
                setForm={setForm}
                error={formError}
                saving={saving}
                onSubmit={handleAddDept}
                onClose={closeModal}
              />
            )}

            {(modalMode === "add_teacher" || modalMode === "add_student") && (
              <UserForm
                role={modalMode === "add_teacher" ? "teacher" : "student"}
                dept={selectedDept!}
                form={form}
                setForm={setForm}
                error={formError}
                saving={saving}
                onSubmit={() => handleAddUser(modalMode === "add_teacher" ? "teacher" : "student")}
                onClose={closeModal}
              />
            )}

            {modalMode === "edit_user" && selectedUser && (
              <EditUserForm
                user={selectedUser}
                form={form}
                setForm={setForm}
                error={formError}
                saving={saving}
                onSubmit={handleEditUser}
                onClose={closeModal}
              />
            )}

            {modalMode === "confirm_delete" && selectedUser && (
              <ConfirmDeleteSheet
                user={selectedUser}
                deleting={deleting}
                onConfirm={handleDelete}
                onCancel={closeModal}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function MemberRow({
  user,
  color,
  onEdit,
  onDelete,
}: {
  user: User;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: color + "18" }]}>
        <Text style={[styles.memberAvatarText, { color }]}>{user.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{user.name}</Text>
        <Text style={styles.memberEmail}>{user.email}</Text>
        {user.className ? (
          <Text style={styles.memberClass}>Class: {user.className}</Text>
        ) : null}
      </View>
      <View style={styles.actionBtns}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="pencil-outline" size={15} color={Colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="trash-outline" size={15} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DeptForm({
  form, setForm, error, saving, onSubmit, onClose,
}: {
  form: any; setForm: any; error: string; saving: boolean; onSubmit: () => void; onClose: () => void;
}) {
  return (
    <>
      <View style={styles.modalHandle} />
      <Text style={styles.modalTitle}>Add New Department</Text>
      <Text style={styles.modalSubtitle}>Create a new academic department</Text>

      {error ? <ErrorBox msg={error} /> : null}

      <FieldLabel label="Department Name" />
      <InputRow icon="business-outline" placeholder="e.g. Civil Engineering" value={form.deptName} onChange={(v: string) => setForm((f: any) => ({ ...f, deptName: v }))} />

      <FieldLabel label="Department Code" />
      <InputRow icon="code-outline" placeholder="e.g. CE" value={form.deptCode} onChange={(v: string) => setForm((f: any) => ({ ...f, deptCode: v.toUpperCase() }))} autoCapitalize="characters" maxLength={6} />

      <SubmitBtn saving={saving} label="Add Department" icon="add-circle-outline" onPress={onSubmit} />
    </>
  );
}

function UserForm({
  role, dept, form, setForm, error, saving, onSubmit, onClose,
}: {
  role: "teacher" | "student"; dept: Department; form: any; setForm: any;
  error: string; saving: boolean; onSubmit: () => void; onClose: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const isTeacher = role === "teacher";
  const accentColor = isTeacher ? Colors.warning : Colors.accent;

  return (
    <>
      <View style={styles.modalHandle} />
      <View style={styles.rolePillRow}>
        <View style={[styles.rolePill, { backgroundColor: accentColor + "18" }]}>
          <Ionicons name={isTeacher ? "school-outline" : "person-outline"} size={14} color={accentColor} />
          <Text style={[styles.rolePillText, { color: accentColor }]}>{isTeacher ? "Teacher" : "Student"}</Text>
        </View>
      </View>
      <Text style={styles.modalTitle}>Add {isTeacher ? "Teacher" : "Student"}</Text>
      <Text style={styles.modalSubtitle}>Department: {dept.name}</Text>

      {error ? <ErrorBox msg={error} /> : null}

      <FieldLabel label="Full Name" />
      <InputRow icon="person-outline" placeholder="Full name" value={form.name} onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} />

      <FieldLabel label="Email Address" />
      <InputRow icon="mail-outline" placeholder="email@campus.edu" value={form.email} onChange={(v: string) => setForm((f: any) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />

      <FieldLabel label="Password" />
      <PasswordRow placeholder="Min. 6 characters" value={form.password} onChange={(v: string) => setForm((f: any) => ({ ...f, password: v }))} showPw={showPw} togglePw={() => setShowPw((p) => !p)} />

      <FieldLabel label="Class / Section" />
      <InputRow icon="layers-outline" placeholder={`e.g. ${dept.code}-A`} value={form.className} onChange={(v: string) => setForm((f: any) => ({ ...f, className: v }))} autoCapitalize="characters" />

      <View style={styles.credentialNote}>
        <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
        <Text style={styles.credentialNoteText}>Share these credentials with the {role} so they can log in.</Text>
      </View>

      <SubmitBtn saving={saving} label={`Add ${isTeacher ? "Teacher" : "Student"}`} icon="person-add-outline" onPress={onSubmit} color={accentColor} />
    </>
  );
}

function EditUserForm({
  user, form, setForm, error, saving, onSubmit, onClose,
}: {
  user: User; form: any; setForm: any;
  error: string; saving: boolean; onSubmit: () => void; onClose: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const isTeacher = user.role === "teacher";
  const accentColor = isTeacher ? Colors.warning : Colors.accent;

  return (
    <>
      <View style={styles.modalHandle} />
      <View style={styles.rolePillRow}>
        <View style={[styles.rolePill, { backgroundColor: accentColor + "18" }]}>
          <Ionicons name="pencil-outline" size={14} color={accentColor} />
          <Text style={[styles.rolePillText, { color: accentColor }]}>Edit {isTeacher ? "Teacher" : "Student"}</Text>
        </View>
      </View>
      <Text style={styles.modalTitle}>Edit Details</Text>
      <Text style={styles.modalSubtitle}>{user.email}</Text>

      {error ? <ErrorBox msg={error} /> : null}

      <FieldLabel label="Full Name" />
      <InputRow icon="person-outline" placeholder="Full name" value={form.name} onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} />

      <FieldLabel label="Class / Section" />
      <InputRow icon="layers-outline" placeholder="e.g. CS-A" value={form.className} onChange={(v: string) => setForm((f: any) => ({ ...f, className: v }))} autoCapitalize="characters" />

      <FieldLabel label="New Password (optional)" />
      <PasswordRow placeholder="Leave blank to keep current" value={form.password} onChange={(v: string) => setForm((f: any) => ({ ...f, password: v }))} showPw={showPw} togglePw={() => setShowPw((p) => !p)} />

      <View style={styles.credentialNote}>
        <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
        <Text style={styles.credentialNoteText}>If you set a new password, remember to share it with the {user.role}.</Text>
      </View>

      <SubmitBtn saving={saving} label="Save Changes" icon="checkmark-circle-outline" onPress={onSubmit} color={accentColor} />
    </>
  );
}

function ConfirmDeleteSheet({
  user, deleting, onConfirm, onCancel,
}: {
  user: User; deleting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <>
      <View style={styles.modalHandle} />
      <View style={styles.deleteIconWrap}>
        <Ionicons name="person-remove-outline" size={40} color={Colors.error} />
      </View>
      <Text style={styles.confirmTitle}>Remove {user.role === "teacher" ? "Teacher" : "Student"}?</Text>
      <Text style={styles.confirmBody}>
        <Text style={{ fontFamily: "Inter_600SemiBold" }}>{user.name}</Text> will be permanently removed and will no longer be able to log in.
      </Text>
      <View style={styles.confirmBtnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={deleting}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmDeleteBtn} onPress={onConfirm} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={Colors.white} />
              <Text style={styles.confirmDeleteBtnText}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

function InputRow({
  icon, placeholder, value, onChange, keyboardType, autoCapitalize, maxLength,
}: {
  icon: any; placeholder: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any; maxLength?: number;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={17} color={Colors.textMuted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}

function PasswordRow({
  placeholder, value, onChange, showPw, togglePw,
}: {
  placeholder: string; value: string; onChange: (v: string) => void; showPw: boolean; togglePw: () => void;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name="lock-closed-outline" size={17} color={Colors.textMuted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!showPw}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={togglePw} style={{ padding: 4 }}>
        <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={17} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function SubmitBtn({
  saving, label, icon, onPress, color = Colors.accent,
}: {
  saving: boolean; label: string; icon: any; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.submitBtn, { backgroundColor: color }]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.85}
    >
      {saving ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <>
          <Ionicons name={icon} size={18} color={Colors.white} />
          <Text style={styles.submitBtnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  addDeptBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },

  deptCard: {
    backgroundColor: Colors.card, borderRadius: 18, marginBottom: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  deptHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  deptIconWrap: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center",
  },
  deptCode: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.accent },
  deptName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  deptMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deptBody: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, backgroundColor: "#FAFBFC" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.text,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  addMemberBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.accentPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  addMemberText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  noMemberText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, fontStyle: "italic", paddingVertical: 4 },

  memberRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.card,
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  memberAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  memberEmail: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  memberClass: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  actionBtns: { flexDirection: "row", gap: 6, alignItems: "center" },
  editBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
  },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },

  rolePillRow: { flexDirection: "row", marginBottom: 6 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  rolePillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 4 },
  modalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10, marginBottom: 12,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.error, flex: 1 },

  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.text, marginBottom: 6, marginTop: 10 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, paddingVertical: 13 },

  credentialNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: Colors.accentPale, borderRadius: 10, padding: 10, marginTop: 14, marginBottom: 4,
  },
  credentialNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, marginTop: 16,
  },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },

  deleteIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#FEE2E2", alignSelf: "center",
    alignItems: "center", justifyContent: "center", marginBottom: 16, marginTop: 8,
  },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, textAlign: "center", marginBottom: 8 },
  confirmBody: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  confirmBtnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  confirmDeleteBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    backgroundColor: Colors.error, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  confirmDeleteBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },
});
