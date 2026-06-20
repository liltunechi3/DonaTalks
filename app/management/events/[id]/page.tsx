"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  name: string;
  status: "planned" | "on_progress" | "done";
  event_date: string | null;
  event_time: string | null;
  format: "online" | "offline";
  theme: string | null;
  key_points: string | null;
  target_count: number | null;
  folder_link: string | null;
  created_at: string;
  team: TeamMember[];
}

interface Task {
  id: string;
  event_id: string;
  title: string;
  category: "acara" | "marketing" | "design";
  pic: string | null;
  deadline: string | null;
  status: "todo" | "in_progress" | "done";
  notes: string | null;
  link: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  faculty: string | null;
  major: string | null;
  registered_at: string;
  attended: boolean;
  certificate_sent: boolean;
  feedback_rating: number | null;
  feedback_comment: string | null;
}

interface TeamMember {
  id: string;
  event_id: string;
  member_name: string;
  role: "pm" | "acara" | "marketing" | "design";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TASK_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  todo: { bg: "#e5e7eb", color: "#374151" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
  done: { bg: "#d1fae5", color: "#065f46" },
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

const EVENT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planned: { bg: "#e5e7eb", color: "#374151" },
  on_progress: { bg: "#fef3c7", color: "#b45309" },
  done: { bg: "#d1fae5", color: "#065f46" },
};

const CATEGORY_LABELS: Record<string, string> = {
  acara: "Acara",
  marketing: "Marketing",
  design: "Design",
};

const ROLE_LABELS: Record<string, string> = {
  pm: "Project Manager",
  acara: "Acara",
  marketing: "Marketing",
  design: "Design",
};

// ─── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg style={{ animation: "spin 1s linear infinite", height: 28, width: 28, display: "block", color: "#1E3832" }} viewBox="0 0 24 24" fill="none">
      <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "participants" | "team">("tasks");

  // Edit event state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<string>("");

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", category: "acara", pic: "", deadline: "", status: "todo", notes: "", link: "" });
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  // Participant form
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participantForm, setParticipantForm] = useState({ name: "", email: "", phone: "", faculty: "", major: "" });
  const [participantFormError, setParticipantFormError] = useState<string | null>(null);
  const [creatingParticipant, setCreatingParticipant] = useState(false);

  // Team form
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamForm, setTeamForm] = useState({ member_name: "", role: "pm" });
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, tasksRes, participantsRes] = await Promise.all([
        fetch(`/api/management/events/${id}`),
        fetch(`/api/management/tasks?event_id=${id}`),
        fetch(`/api/management/participants?event_id=${id}`),
      ]);
      if (!eventRes.ok) throw new Error("Event tidak ditemukan");
      const [eventData, tasksData, participantsData] = await Promise.all([
        eventRes.json(),
        tasksRes.json(),
        participantsRes.json(),
      ]);
      setEvent(eventData);
      setTasks(tasksData);
      setParticipants(participantsData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Event field inline edit ──────────────────────────────────────────────

  function startEdit(field: string, current: string) {
    setEditingField(field);
    setFieldValue(current || "");
  }

  async function saveField(field: string) {
    if (!event) return;
    const payload: Record<string, unknown> = { [field]: fieldValue || null };
    if (field === "target_count") payload[field] = fieldValue ? parseInt(fieldValue) : null;
    const res = await fetch(`/api/management/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvent({ ...updated, team: event.team });
    }
    setEditingField(null);
  }

  async function updateEventStatus(status: string) {
    if (!event) return;
    const res = await fetch(`/api/management/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvent({ ...updated, team: event.team });
    }
  }

  // ─── Task actions ─────────────────────────────────────────────────────────

  async function toggleTaskStatus(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    const res = await fetch(`/api/management/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    }
  }

  async function updateTaskStatus(task: Task, status: string) {
    const res = await fetch(`/api/management/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Hapus task ini?")) return;
    const res = await fetch(`/api/management/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskFormError(null);
    if (!taskForm.title.trim()) { setTaskFormError("Judul task wajib diisi"); return; }
    setCreatingTask(true);
    try {
      const res = await fetch("/api/management/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: id, ...taskForm, deadline: taskForm.deadline || null, pic: taskForm.pic || null, notes: taskForm.notes || null, link: taskForm.link || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal membuat task"); }
      const created = await res.json();
      setTasks((prev) => [...prev, created]);
      setShowTaskForm(false);
      setTaskForm({ title: "", category: "acara", pic: "", deadline: "", status: "todo", notes: "", link: "" });
    } catch (e: unknown) {
      setTaskFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreatingTask(false);
    }
  }

  // ─── Participant actions ──────────────────────────────────────────────────

  async function toggleParticipantField(participant: Participant, field: "attended" | "certificate_sent") {
    const res = await fetch(`/api/management/participants/${participant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !participant[field] }),
    });
    if (res.ok) {
      const updated = await res.json();
      setParticipants((prev) => prev.map((p) => (p.id === participant.id ? updated : p)));
    }
  }

  async function deleteParticipant(pid: string) {
    if (!confirm("Hapus peserta ini?")) return;
    const res = await fetch(`/api/management/participants/${pid}`, { method: "DELETE" });
    if (res.ok) setParticipants((prev) => prev.filter((p) => p.id !== pid));
  }

  async function handleCreateParticipant(e: React.FormEvent) {
    e.preventDefault();
    setParticipantFormError(null);
    if (!participantForm.name.trim()) { setParticipantFormError("Nama peserta wajib diisi"); return; }
    setCreatingParticipant(true);
    try {
      const res = await fetch("/api/management/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: id, ...participantForm, email: participantForm.email || null, phone: participantForm.phone || null, faculty: participantForm.faculty || null, major: participantForm.major || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal menambah peserta"); }
      const created = await res.json();
      setParticipants((prev) => [...prev, created]);
      setShowParticipantForm(false);
      setParticipantForm({ name: "", email: "", phone: "", faculty: "", major: "" });
    } catch (e: unknown) {
      setParticipantFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreatingParticipant(false);
    }
  }

  // ─── Team actions ─────────────────────────────────────────────────────────

  async function deleteTeamMember(memberId: string) {
    if (!confirm("Hapus anggota ini?")) return;
    const res = await fetch(`/api/management/event-team/${memberId}`, { method: "DELETE" });
    if (res.ok && event) {
      setEvent({ ...event, team: event.team.filter((m) => m.id !== memberId) });
    }
  }

  async function handleCreateTeamMember(e: React.FormEvent) {
    e.preventDefault();
    setTeamFormError(null);
    if (!teamForm.member_name.trim()) { setTeamFormError("Nama anggota wajib diisi"); return; }
    setCreatingTeam(true);
    try {
      const res = await fetch("/api/management/event-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: id, ...teamForm }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal menambah anggota"); }
      const created = await res.json();
      if (event) setEvent({ ...event, team: [...event.team, created] });
      setShowTeamForm(false);
      setTeamForm({ member_name: "", role: "pm" });
    } catch (e: unknown) {
      setTeamFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreatingTeam(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "#991b1b", fontSize: "1rem" }}>{error || "Event tidak ditemukan"}</p>
        <Link href="/management" style={{ color: "#1E3832", textDecoration: "underline", fontSize: "0.9rem" }}>Kembali ke Dashboard</Link>
      </div>
    );
  }

  const statusStyle = EVENT_STATUS_COLORS[event.status] || EVENT_STATUS_COLORS.planned;
  const tasksByCategory: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!tasksByCategory[task.category]) tasksByCategory[task.category] = [];
    tasksByCategory[task.category].push(task);
  }
  const teamByRole: Record<string, TeamMember[]> = {};
  for (const m of event.team) {
    if (!teamByRole[m.role]) teamByRole[m.role] = [];
    teamByRole[m.role].push(m);
  }

  const attendedCount = participants.filter((p) => p.attended).length;
  const certCount = participants.filter((p) => p.certificate_sent).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#1E3832", borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: "#F5F0E8", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.04em" }}>DonaTalks</span>
          </Link>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.5)" }}>
            Management
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* Back */}
        <Link href="/management" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "rgba(30,56,50,0.55)", textDecoration: "none", marginBottom: 20 }}>
          ← Kembali ke Dashboard
        </Link>

        {/* Event header card */}
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {/* Name (editable) */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {editingField === "name" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    autoFocus
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveField("name"); if (e.key === "Escape") setEditingField(null); }}
                    style={{ ...inlineInputStyle, fontSize: "1.4rem", fontWeight: 700 }}
                  />
                  <button onClick={() => saveField("name")} style={saveBtnStyle}>Simpan</button>
                  <button onClick={() => setEditingField(null)} style={cancelBtnStyle}>Batal</button>
                </div>
              ) : (
                <h1
                  onClick={() => startEdit("name", event.name)}
                  style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1E3832", cursor: "pointer", borderBottom: "1px dashed rgba(30,56,50,0.2)", display: "inline-block", paddingBottom: 2 }}
                  title="Klik untuk edit"
                >
                  {event.name}
                </h1>
              )}
            </div>

            {/* Status dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...statusStyle, fontSize: "0.72rem", fontWeight: 600, padding: "3px 8px", borderRadius: 5 }}>
                {event.status === "on_progress" ? "On Progress" : event.status === "done" ? "Done" : "Planned"}
              </span>
              <select
                value={event.status}
                onChange={(e) => updateEventStatus(e.target.value)}
                style={{ fontSize: "0.8rem", border: "1px solid rgba(30,56,50,0.2)", borderRadius: 6, padding: "4px 8px", color: "#1E3832", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="planned">Planned</option>
                <option value="on_progress">On Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Event meta */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {/* Date */}
            <div>
              <span style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", display: "block", marginBottom: 2 }}>Tanggal</span>
              {editingField === "event_date" ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="date" autoFocus value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={inlineInputStyle} />
                  <button onClick={() => saveField("event_date")} style={saveBtnStyle}>OK</button>
                  <button onClick={() => setEditingField(null)} style={cancelBtnStyle}>✕</button>
                </div>
              ) : (
                <span onClick={() => startEdit("event_date", event.event_date || "")} style={editableValueStyle}>
                  {event.event_date ? new Date(event.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </span>
              )}
            </div>

            {/* Time */}
            <div>
              <span style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", display: "block", marginBottom: 2 }}>Waktu</span>
              {editingField === "event_time" ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="time" autoFocus value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={inlineInputStyle} />
                  <button onClick={() => saveField("event_time")} style={saveBtnStyle}>OK</button>
                  <button onClick={() => setEditingField(null)} style={cancelBtnStyle}>✕</button>
                </div>
              ) : (
                <span onClick={() => startEdit("event_time", event.event_time || "")} style={editableValueStyle}>
                  {event.event_time || "—"}
                </span>
              )}
            </div>

            {/* Format */}
            <div>
              <span style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", display: "block", marginBottom: 2 }}>Format</span>
              <select
                value={event.format}
                onChange={async (e) => {
                  const res = await fetch(`/api/management/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: e.target.value }) });
                  if (res.ok) { const u = await res.json(); setEvent({ ...u, team: event.team }); }
                }}
                style={{ fontSize: "0.85rem", border: "none", background: "none", color: "#1E3832", cursor: "pointer", fontWeight: 500, padding: 0 }}
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <span style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", display: "block", marginBottom: 2 }}>Tema</span>
              {editingField === "theme" ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input autoFocus value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveField("theme"); if (e.key === "Escape") setEditingField(null); }} style={{ ...inlineInputStyle, width: 200 }} />
                  <button onClick={() => saveField("theme")} style={saveBtnStyle}>OK</button>
                  <button onClick={() => setEditingField(null)} style={cancelBtnStyle}>✕</button>
                </div>
              ) : (
                <span onClick={() => startEdit("theme", event.theme || "")} style={editableValueStyle}>{event.theme || "—"}</span>
              )}
            </div>

            {/* Folder */}
            {event.folder_link && (
              <div>
                <span style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", display: "block", marginBottom: 2 }}>Folder</span>
                <a href={event.folder_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "#1E3832", textDecoration: "underline" }}>Buka Drive</a>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid rgba(30,56,50,0.1)", marginBottom: 24 }}>
          {(["tasks", "participants", "team"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                border: "none",
                backgroundColor: "transparent",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
                color: activeTab === tab ? "#1E3832" : "rgba(30,56,50,0.4)",
                borderBottom: activeTab === tab ? "2px solid #1E3832" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {tab === "tasks" ? "Tasks" : tab === "participants" ? `Peserta (${participants.length})` : "Tim"}
            </button>
          ))}
        </div>

        {/* ─── TASKS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setShowTaskForm(true)} style={primaryBtnStyle}>+ Tambah Task</button>
            </div>

            {tasks.length === 0 && !showTaskForm && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(30,56,50,0.4)", fontSize: "0.9rem" }}>Belum ada task. Tambah task pertama!</div>
            )}

            {(["acara", "marketing", "design"] as const).map((cat) => {
              const catTasks = tasksByCategory[cat] || [];
              if (catTasks.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgba(30,56,50,0.55)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {catTasks.map((task) => {
                      const tStyle = TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo;
                      return (
                        <div key={task.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            style={{
                              width: 20, height: 20, borderRadius: 5, border: `2px solid ${task.status === "done" ? "#1E3832" : "rgba(30,56,50,0.3)"}`,
                              backgroundColor: task.status === "done" ? "#1E3832" : "transparent", cursor: "pointer", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {task.status === "done" && <span style={{ color: "#F5F0E8", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                          </button>

                          {/* Title */}
                          <span style={{ flex: 1, fontSize: "0.9rem", color: task.status === "done" ? "rgba(30,56,50,0.4)" : "#1E3832", textDecoration: task.status === "done" ? "line-through" : "none" }}>
                            {task.title}
                          </span>

                          {/* PIC */}
                          {task.pic && (
                            <span style={{ fontSize: "0.75rem", backgroundColor: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
                              {task.pic}
                            </span>
                          )}

                          {/* Deadline */}
                          {task.deadline && (
                            <span style={{ fontSize: "0.75rem", color: "rgba(30,56,50,0.45)", whiteSpace: "nowrap" }}>
                              {new Date(task.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                            </span>
                          )}

                          {/* Status chip */}
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task, e.target.value)}
                            style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 6px", borderRadius: 4, border: "none", backgroundColor: tStyle.bg, color: tStyle.color, cursor: "pointer" }}
                          >
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>

                          {/* Link */}
                          {task.link && (
                            <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#1E3832", textDecoration: "underline" }}>Link</a>
                          )}

                          {/* Delete */}
                          <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.3)", cursor: "pointer", fontSize: "1rem", padding: "0 2px", lineHeight: 1 }} title="Hapus">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Task form */}
            {showTaskForm && (
              <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.15)", borderRadius: 10, padding: "20px", marginTop: 8 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E3832", marginBottom: 16 }}>Tambah Task</h3>
                {taskFormError && <div style={errorBoxStyle}>{taskFormError}</div>}
                <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Judul *</label>
                    <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="cth. Buat rundown acara" style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Kategori</label>
                      <select value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })} style={inputStyle}>
                        <option value="acara">Acara</option>
                        <option value="marketing">Marketing</option>
                        <option value="design">Design</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })} style={inputStyle}>
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>PIC</label>
                      <input value={taskForm.pic} onChange={(e) => setTaskForm({ ...taskForm, pic: e.target.value })} placeholder="Nama penanggung jawab" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Deadline</label>
                      <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Catatan</label>
                    <input value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} placeholder="Catatan tambahan" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Link</label>
                    <input value={taskForm.link} onChange={(e) => setTaskForm({ ...taskForm, link: e.target.value })} placeholder="https://..." style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => { setShowTaskForm(false); setTaskFormError(null); }} style={secondaryBtnStyle}>Batal</button>
                    <button type="submit" disabled={creatingTask} style={{ ...primaryBtnStyle, opacity: creatingTask ? 0.7 : 1 }}>{creatingTask ? "Menyimpan..." : "Simpan Task"}</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── PARTICIPANTS TAB ────────────────────────────────────────────────── */}
        {activeTab === "participants" && (
          <div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Terdaftar", value: participants.length },
                { label: "Hadir", value: attendedCount },
                { label: "Sertifikat Terkirim", value: certCount },
              ].map((s) => (
                <div key={s.label} style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 9, padding: "14px 18px" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1E3832" }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(30,56,50,0.5)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={() => setShowParticipantForm(true)} style={primaryBtnStyle}>+ Tambah Peserta</button>
            </div>

            {/* Participant form */}
            {showParticipantForm && (
              <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.15)", borderRadius: 10, padding: "20px", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E3832", marginBottom: 16 }}>Tambah Peserta</h3>
                {participantFormError && <div style={errorBoxStyle}>{participantFormError}</div>}
                <form onSubmit={handleCreateParticipant} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Nama *</label>
                    <input value={participantForm.name} onChange={(e) => setParticipantForm({ ...participantForm, name: e.target.value })} placeholder="Nama lengkap" style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={participantForm.email} onChange={(e) => setParticipantForm({ ...participantForm, email: e.target.value })} placeholder="email@contoh.com" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>No. HP</label>
                      <input value={participantForm.phone} onChange={(e) => setParticipantForm({ ...participantForm, phone: e.target.value })} placeholder="08xxxxxxxxxx" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Fakultas</label>
                      <input value={participantForm.faculty} onChange={(e) => setParticipantForm({ ...participantForm, faculty: e.target.value })} placeholder="Nama fakultas" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Jurusan</label>
                      <input value={participantForm.major} onChange={(e) => setParticipantForm({ ...participantForm, major: e.target.value })} placeholder="Program studi" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => { setShowParticipantForm(false); setParticipantFormError(null); }} style={secondaryBtnStyle}>Batal</button>
                    <button type="submit" disabled={creatingParticipant} style={{ ...primaryBtnStyle, opacity: creatingParticipant ? 0.7 : 1 }}>{creatingParticipant ? "Menyimpan..." : "Tambah Peserta"}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Participants table */}
            {participants.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(30,56,50,0.4)", fontSize: "0.9rem" }}>Belum ada peserta terdaftar.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#fff", borderBottom: "2px solid rgba(30,56,50,0.1)" }}>
                      {["Nama", "Email", "HP", "Fakultas / Jurusan", "Hadir", "Sertifikat", "Rating", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(30,56,50,0.5)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "rgba(245,240,232,0.4)", borderBottom: "1px solid rgba(30,56,50,0.06)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1E3832" }}>{p.name}</td>
                        <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>{p.email || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>{p.phone || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>
                          {[p.faculty, p.major].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            onClick={() => toggleParticipantField(p, "attended")}
                            style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${p.attended ? "#1E3832" : "rgba(30,56,50,0.3)"}`, backgroundColor: p.attended ? "#1E3832" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            {p.attended && <span style={{ color: "#F5F0E8", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            onClick={() => toggleParticipantField(p, "certificate_sent")}
                            style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${p.certificate_sent ? "#065f46" : "rgba(30,56,50,0.3)"}`, backgroundColor: p.certificate_sent ? "#065f46" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            {p.certificate_sent && <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>}
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {p.feedback_rating ? (
                            <span style={{ color: "#b45309", fontSize: "0.85rem" }}>{"★".repeat(p.feedback_rating)}</span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button onClick={() => deleteParticipant(p.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.3)", cursor: "pointer", fontSize: "1rem" }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TEAM TAB ───────────────────────────────────────────────────────── */}
        {activeTab === "team" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setShowTeamForm(true)} style={primaryBtnStyle}>+ Tambah Anggota</button>
            </div>

            {/* Team form */}
            {showTeamForm && (
              <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.15)", borderRadius: 10, padding: "20px", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E3832", marginBottom: 16 }}>Tambah Anggota Tim</h3>
                {teamFormError && <div style={errorBoxStyle}>{teamFormError}</div>}
                <form onSubmit={handleCreateTeamMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Nama *</label>
                    <input value={teamForm.member_name} onChange={(e) => setTeamForm({ ...teamForm, member_name: e.target.value })} placeholder="Nama anggota" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <select value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} style={inputStyle}>
                      <option value="pm">Project Manager</option>
                      <option value="acara">Acara</option>
                      <option value="marketing">Marketing</option>
                      <option value="design">Design</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => { setShowTeamForm(false); setTeamFormError(null); }} style={secondaryBtnStyle}>Batal</button>
                    <button type="submit" disabled={creatingTeam} style={{ ...primaryBtnStyle, opacity: creatingTeam ? 0.7 : 1 }}>{creatingTeam ? "Menyimpan..." : "Tambah"}</button>
                  </div>
                </form>
              </div>
            )}

            {event.team.length === 0 && !showTeamForm ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(30,56,50,0.4)", fontSize: "0.9rem" }}>Belum ada anggota tim.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {(["pm", "acara", "marketing", "design"] as const).map((role) => {
                  const members = teamByRole[role] || [];
                  if (members.length === 0) return null;
                  return (
                    <div key={role} style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: "16px 18px" }}>
                      <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(30,56,50,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                        {ROLE_LABELS[role]}
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {members.map((m) => (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#1E3832", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5F0E8", fontSize: "0.75rem", fontWeight: 700 }}>
                                {m.member_name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: "0.88rem", color: "#1E3832", fontWeight: 500 }}>{m.member_name}</span>
                            </div>
                            <button onClick={() => deleteTeamMember(m.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.3)", cursor: "pointer", fontSize: "1rem" }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#1E3832",
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid rgba(30,56,50,0.25)",
  borderRadius: 7,
  fontSize: "0.88rem",
  color: "#1E3832",
  backgroundColor: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const inlineInputStyle: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid rgba(30,56,50,0.3)",
  borderRadius: 5,
  fontSize: "0.88rem",
  color: "#1E3832",
  outline: "none",
};

const editableValueStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#1E3832",
  fontWeight: 500,
  cursor: "pointer",
  borderBottom: "1px dashed rgba(30,56,50,0.25)",
  paddingBottom: 1,
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#1E3832",
  color: "#F5F0E8",
  border: "none",
  borderRadius: 7,
  padding: "8px 16px",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#1E3832",
  border: "1px solid rgba(30,56,50,0.3)",
  borderRadius: 7,
  padding: "8px 16px",
  fontSize: "0.85rem",
  fontWeight: 500,
  cursor: "pointer",
};

const saveBtnStyle: React.CSSProperties = {
  backgroundColor: "#1E3832",
  color: "#F5F0E8",
  border: "none",
  borderRadius: 5,
  padding: "4px 10px",
  fontSize: "0.78rem",
  cursor: "pointer",
  fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "rgba(30,56,50,0.5)",
  border: "none",
  borderRadius: 5,
  padding: "4px 6px",
  fontSize: "0.78rem",
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  padding: "10px 14px",
  borderRadius: 7,
  fontSize: "0.83rem",
  marginBottom: 14,
};

