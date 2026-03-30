import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

/* ─── Types ─────────────────────────────────────────── */
interface Department { id: string; name: string; code: string; }
interface ClassRecord { id: string; departmentId: string; departmentCode: string; year: number; division: string; }
interface AttendanceRecord {
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
interface ClassSession {
  id: string;
  className: string;
  subject?: string;
  lectureStart?: string;
  lectureEnd?: string;
  createdAt: string;
  cancelledAt?: string;
  teacherName?: string;
}

type NavLevel =
  | { screen: "depts" }
  | { screen: "years";   dept: Department }
  | { screen: "divs";    dept: Department; year: number }
  | { screen: "report";  dept: Department; year: number; division: string; };

/* ─── Helpers ────────────────────────────────────────── */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const ORDINAL     = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isoToDateStr(iso: string) { return toDateStr(new Date(iso)); }
function classCode(deptCode: string, year: number, div: string) { return `${deptCode}-Y${year}-${div}`; }

/* ─── Mini Calendar ──────────────────────────────────── */
function MiniCalendar({
  selectedDate, onSelect, highlightDates,
}: { selectedDate: string | null; onSelect: (d: string) => void; highlightDates: Set<string>; }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0);  } else setViewMonth(m => m+1); }

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
        </TouchableOpacity>
      </View>
      <View style={cal.dayRow}>
        {DAY_LABELS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {blanks.map((_, i) => <View key={`b${i}`} style={cal.cell} />)}
        {days.map(day => {
          const ds = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isSelected  = selectedDate === ds;
          const hasRecords  = highlightDates.has(ds);
          const isToday     = ds === toDateStr(today);
          return (
            <TouchableOpacity
              key={day}
              style={[cal.cell, isSelected && cal.cellSelected, isToday && !isSelected && cal.cellToday]}
              onPress={() => onSelect(ds)}
            >
              <Text style={[cal.cellText, isSelected && cal.cellTextSelected, isToday && !isSelected && cal.cellTextToday]}>
                {day}
              </Text>
              {hasRecords && !isSelected && <View style={cal.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Main Screen ────────────────────────────────────── */
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const [nav, setNav] = useState<NavLevel>({ screen: "depts" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* ── Data queries ─ */
  const { data: depts, isLoading: deptsLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/departments"), { credentials: "include" });
      return res.json() as Promise<Department[]>;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: allClasses } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/classes"), { credentials: "include" });
      return res.json() as Promise<ClassRecord[]>;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Only fetch attendance when on report screen
  const reportNav = nav.screen === "report" ? nav : null;
  const reportClassName = reportNav
    ? classCode(reportNav.dept.code, reportNav.year, reportNav.division)
    : null;

  const { data: attendanceRecords, isLoading: attLoading } = useQuery({
    queryKey: ["admin-attendance", reportClassName],
    queryFn: async () => {
      const url = getApiUrl(`/attendance?className=${encodeURIComponent(reportClassName!)}`);
      const res = await fetch(url, { credentials: "include" });
      return res.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !!reportClassName,
  });

  const { data: classSessions } = useQuery({
    queryKey: ["admin-class-sessions", reportClassName],
    queryFn: async () => {
      const url = getApiUrl(`/sessions/by-class?className=${encodeURIComponent(reportClassName!)}`);
      const res = await fetch(url, { credentials: "include" });
      return res.json() as Promise<ClassSession[]>;
    },
    enabled: !!reportClassName,
  });

  const totalLectures = (classSessions ?? []).filter(s => !s.cancelledAt).length;

  /* ── Derived data ─ */
  const availableYears = useMemo(() => {
    if (nav.screen !== "years") return [];
    const classes = (allClasses ?? []).filter(c => c.departmentId === nav.dept.id);
    return Array.from(new Set(classes.map(c => c.year))).sort();
  }, [nav, allClasses]);

  const availableDivisions = useMemo(() => {
    if (nav.screen !== "divs") return [];
    const classes = (allClasses ?? []).filter(c => c.departmentId === nav.dept.id && c.year === nav.year);
    return Array.from(new Set(classes.map(c => c.division))).sort();
  }, [nav, allClasses]);

  // Highlight dates = any date a session was conducted (not cancelled)
  const highlightDates = useMemo(() => {
    const dates = new Set<string>();
    (classSessions ?? [])
      .filter(cs => !cs.cancelledAt)
      .forEach(cs => cs.createdAt && dates.add(isoToDateStr(cs.createdAt)));
    return dates;
  }, [classSessions]);

  // Sessions that happened on the selected date (using createdAt), with their attendance records
  const sessionsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const daySessions = (classSessions ?? [])
      .filter(s => !s.cancelledAt && isoToDateStr(s.createdAt) === selectedDate);
    return daySessions.map(session => ({
      session,
      attendees: (attendanceRecords ?? []).filter(r => r.sessionId === session.id),
    }));
  }, [classSessions, attendanceRecords, selectedDate]);

  /* ── Nav helpers ─ */
  function goBack() {
    if (nav.screen === "years")  setNav({ screen: "depts" });
    if (nav.screen === "divs")   setNav({ screen: "years", dept: nav.dept });
    if (nav.screen === "report") { setNav({ screen: "divs", dept: nav.dept, year: nav.year }); setSelectedDate(null); }
  }

  /* ── Header info ─ */
  const headerTitle = "Reports";
  const headerSubtitle =
    nav.screen === "depts"  ? "Select a department" :
    nav.screen === "years"  ? nav.dept.name :
    nav.screen === "divs"   ? `${nav.dept.name} · ${ORDINAL(nav.year)} Year` :
    `${nav.dept.code}-Y${nav.year}-${nav.division}`;

  /* ── Breadcrumb ─ */
  const crumbs: string[] = [];
  if (nav.screen !== "depts") crumbs.push(nav.dept.name);
  if (nav.screen === "divs" || nav.screen === "report") crumbs.push(`${ORDINAL(nav.year)} Year`);
  if (nav.screen === "report") crumbs.push(`Div ${nav.division}`);

  return (
    <View style={styles.screen}>
      <GradientHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        left={nav.screen !== "depts" ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Breadcrumb */}
      {crumbs.length > 0 && (
        <View style={styles.breadcrumb}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.breadcrumbText}>{crumbs.join(" › ")}</Text>
        </View>
      )}

      {/* ── DEPTS ── */}
      {nav.screen === "depts" && (
        deptsLoading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          : (
            <FlatList
              data={depts ?? []}
              keyExtractor={d => d.id}
              contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
              ListEmptyComponent={<EmptyState icon="business-outline" text="No departments found" />}
              renderItem={({ item: dept }) => {
                const classCount = (allClasses ?? []).filter(c => c.departmentId === dept.id).length;
                return (
                  <DrillRow
                    icon="school-outline"
                    label={dept.name}
                    sub={`${dept.code} · ${classCount} class${classCount !== 1 ? "es" : ""}`}
                    onPress={() => setNav({ screen: "years", dept })}
                  />
                );
              }}
            />
          )
      )}

      {/* ── YEARS ── */}
      {nav.screen === "years" && (
        <FlatList
          data={availableYears}
          keyExtractor={y => String(y)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListEmptyComponent={<EmptyState icon="layers-outline" text="No classes in this department" />}
          renderItem={({ item: year }) => {
            const divCount = (allClasses ?? []).filter(c => c.departmentId === nav.dept.id && c.year === year).length;
            return (
              <DrillRow
                icon="library-outline"
                label={`${ORDINAL(year)} Year`}
                sub={`${divCount} division${divCount !== 1 ? "s" : ""}`}
                onPress={() => setNav({ screen: "divs", dept: nav.dept, year })}
              />
            );
          }}
        />
      )}

      {/* ── DIVISIONS ── */}
      {nav.screen === "divs" && (
        <FlatList
          data={availableDivisions}
          keyExtractor={d => d}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListEmptyComponent={<EmptyState icon="layers-outline" text="No divisions found" />}
          renderItem={({ item: div }) => (
            <DrillRow
              icon="people-outline"
              label={`Division ${div}`}
              sub={classCode(nav.dept.code, nav.year, div)}
              onPress={() => { setSelectedDate(null); setNav({ screen: "report", dept: nav.dept, year: nav.year, division: div }); }}
            />
          )}
        />
      )}

      {/* ── REPORT ── */}
      {nav.screen === "report" && (
        attLoading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}>
              {/* Stats bar */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{totalLectures}</Text>
                  <Text style={styles.statLabel}>Total Lectures</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{attendanceRecords?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>Total Present</Text>
                </View>
              </View>

              {/* Calendar */}
              <Text style={styles.sectionTitle}>Select Date</Text>
              <MiniCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                highlightDates={highlightDates}
              />

              {/* Sessions for selected date */}
              {selectedDate ? (
                <>
                  <View style={styles.dateHeaderRow}>
                    <Ionicons name="calendar" size={16} color={Colors.accent} />
                    <Text style={styles.dateHeaderText}>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </Text>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{sessionsForDate.length} lecture{sessionsForDate.length !== 1 ? "s" : ""}</Text>
                    </View>
                  </View>

                  {sessionsForDate.length === 0 ? (
                    <EmptyState icon="calendar-outline" text="No lectures on this date" />
                  ) : (
                    sessionsForDate.map(({ session, attendees }) => (
                      <View key={session.id} style={styles.subjectGroup}>
                        {/* Session header: subject + count */}
                        <View style={styles.subjectHeader}>
                          <View style={styles.subjectIconWrap}>
                            <Ionicons name="book-outline" size={16} color={Colors.accent} />
                          </View>
                          <Text style={styles.subjectName}>{session.subject ?? "Lecture"}</Text>
                          <View style={styles.subjectBadge}>
                            <Text style={styles.subjectBadgeText}>{attendees.length}</Text>
                          </View>
                        </View>

                        {/* Teacher + timing row */}
                        <View style={styles.teacherRow}>
                          {session.teacherName ? (
                            <>
                              <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.teacherName}>{session.teacherName}</Text>
                            </>
                          ) : null}
                          {session.lectureStart ? (
                            <>
                              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.teacherName}>
                                {session.lectureStart}{session.lectureEnd ? ` – ${session.lectureEnd}` : ""}
                              </Text>
                            </>
                          ) : null}
                        </View>

                        {/* Students who attended — no "Present" chip */}
                        {attendees.length === 0 ? (
                          <View style={[styles.studentRow, { opacity: 0.5 }]}>
                            <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                            <Text style={[styles.studentName, { color: Colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                              No attendance recorded
                            </Text>
                          </View>
                        ) : (
                          attendees.map(r => (
                            <View key={r.id} style={styles.studentRow}>
                              <View style={styles.studentAvatar}>
                                <Text style={styles.studentAvatarText}>{r.studentName[0]?.toUpperCase()}</Text>
                              </View>
                              <Text style={styles.studentName}>{r.studentName}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    ))
                  )}
                </>
              ) : (
                <View style={styles.pickDateHint}>
                  <Ionicons name="hand-left-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.pickDateHintText}>Tap a date to see attendance</Text>
                  <Text style={styles.pickDateHintSub}>Dots on dates indicate recorded sessions</Text>
                </View>
              )}
            </ScrollView>
          )
      )}
    </View>
  );
}

/* ─── Shared sub-components ──────────────────────────── */
function DrillRow({ icon, label, sub, onPress }: {
  icon: any; label: string; sub: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.drillRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.drillIcon}>
        <Ionicons name={icon} size={20} color={Colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.drillLabel}>{label}</Text>
        <Text style={styles.drillSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ alignItems: "center", marginTop: 60, gap: 10 }}>
      <Ionicons name={icon} size={44} color={Colors.textMuted} />
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted }}>{text}</Text>
    </View>
  );
}

/* ─── Calendar styles ────────────────────────────────── */
const CELL = 38;
const cal = StyleSheet.create({
  wrap: { backgroundColor: Colors.card, borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  dayRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 4 },
  dayLabel: { width: CELL, textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center" },
  cellSelected: { backgroundColor: Colors.accent, borderRadius: CELL / 2 },
  cellToday: { borderWidth: 1.5, borderColor: Colors.accent, borderRadius: CELL / 2 },
  cellText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text },
  cellTextSelected: { color: Colors.white, fontFamily: "Inter_700Bold" },
  cellTextToday: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent, position: "absolute", bottom: 3 },
});

/* ─── Main styles ────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  backBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, marginRight: 6 },

  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  breadcrumbText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  drillRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  drillIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  drillLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  drillSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statBox: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginTop: 3, textAlign: "center" },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 10 },

  dateHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  dateHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, flex: 1 },
  dateBadge: { backgroundColor: Colors.accentPale, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  dateBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },

  subjectGroup: { backgroundColor: Colors.card, borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  subjectHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderColor: Colors.border },
  subjectIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  subjectName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, flex: 1 },
  subjectBadge: { backgroundColor: Colors.accent, borderRadius: 12, minWidth: 26, height: 26, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  subjectBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.white },

  teacherRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#F8FAFD", borderBottomWidth: 1, borderColor: Colors.border },
  teacherName: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  studentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.border },
  studentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  studentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.accent },
  studentName: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
  presentChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.successPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  presentChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },

  pickDateHint: { alignItems: "center", marginTop: 30, gap: 8 },
  pickDateHintText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  pickDateHintSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "center" },
});
