"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const G = "#1E3832";
const C = "#F5F0E8";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  name: string;
  status: string;
  event_date: string | null;
  event_time: string | null;
  format: string;
  theme: string | null;
  key_points: string | null;
  target_count: number | null;
  folder_link: string | null;
  narasumber: string | null;
  mc: string | null;
  platform_link: string | null;
  team: TeamMember[];
}

interface TeamMember {
  id: string;
  member_name: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  category: string;
  pic: string | null;
  deadline: string | null;
  status: string;
  notes: string | null;
  link: string | null;
}

interface Evaluation {
  id: string;
  rating_overall: number | null;
  rating_relevance: number | null;
  rating_delivery: number | null;
  rating_technical: number | null;
  comments: string | null;
  interested_next: string | null;
  created_at: string;
}

// ── Template jobdesk per divisi ────────────────────────────────────────────────

const TASK_TEMPLATES: Record<string, { title: string; notes?: string }[]> = {
  acara: [
    { title: "Briefing narasumber", notes: "Kirim rundown & brief materi H-3" },
    { title: "Susun rundown acara" },
    { title: "Koordinasi dengan MC" },
    { title: "Technical check (sound, slide, platform)" },
    { title: "Registrasi & check-in peserta" },
    { title: "Dokumentasi foto/video" },
    { title: "Distribusi sertifikat peserta" },
    { title: "Buat laporan kegiatan post-event" },
    { title: "Evaluasi internal post-event" },
    { title: "Gladi bersih / rehearsal" },
    { title: "Koordinasi venue / platform Zoom", notes: "Cek kapasitas & fitur" },
  ],
  marketing: [
    { title: "Buat copy caption IG" },
    { title: "Distribusi info event ke komunitas/grup" },
    { title: "Follow up calon peserta", notes: "DM atau WA blast" },
    { title: "Live report di story IG saat acara" },
    { title: "Repost story peserta" },
    { title: "Buat konten recap post-event" },
    { title: "Kirim email newsletter / WA blast" },
    { title: "Publish event di linktree / bio IG" },
    { title: "Tracking insight & engagement IG" },
  ],
  design: [
    { title: "Desain poster utama" },
    { title: "Desain story Instagram (1:1 & 9:16)" },
    { title: "Desain template sertifikat" },
    { title: "Desain rundown visual" },
    { title: "Desain banner / backdrop (offline)" },
    { title: "Desain twibbon peserta" },
    { title: "Desain deck slide presenter" },
    { title: "Desain highlight cover IG" },
    { title: "Desain quote card post-event" },
  ],
};

// ── Shared styles ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid rgba(30,56,50,0.22)", borderRadius: 7,
  fontSize: "0.85rem", color: G, backgroundColor: "#fff",
  outline: "none", boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: "0.73rem", fontWeight: 600,
  color: G, marginBottom: 4, letterSpacing: "0.01em",
};

const btnP: React.CSSProperties = {
  backgroundColor: G, color: C, border: "none", borderRadius: 7,
  padding: "8px 16px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
};

const btnS: React.CSSProperties = {
  backgroundColor: "transparent", color: G,
  border: "1px solid rgba(30,56,50,0.28)", borderRadius: 7,
  padding: "8px 14px", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer",
};

function Spinner() {
  return (
    <svg style={{ animation: "spin 1s linear infinite", height: 26, width: 26, color: G }} viewBox="0 0 24 24" fill="none">
      <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  planned:     { bg: "#e5e7eb", color: "#374151", label: "Planned" },
  on_progress: { bg: "#fef3c7", color: "#b45309", label: "On Progress" },
  done:        { bg: "#d1fae5", color: "#065f46", label: "Done" },
  todo:        { bg: "#e5e7eb", color: "#374151", label: "Todo" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8", label: "In Progress" },
};

const ROLES = [
  { value: "pm", label: "Project Manager" },
  { value: "acara", label: "Acara" },
  { value: "marketing", label: "Marketing & PR" },
  { value: "design", label: "Design" },
];

const TASK_CATEGORIES = ["acara", "marketing", "design"];
const CATEGORY_LABELS: Record<string, string> = { acara: "Acara", marketing: "Marketing & PR", design: "Design" };

// ── Stars component ────────────────────────────────────────────────────────────

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          style={{ background: "none", border: "none", cursor: onChange ? "pointer" : "default", fontSize: "1.1rem", color: n <= value ? "#f59e0b" : "#d1d5db", padding: 0 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function avg(evals: Evaluation[], field: keyof Evaluation): string {
  const vals = evals.map((e) => e[field] as number).filter(Boolean);
  if (!vals.length) return "—";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

const emptyTf = { title: "", category: "acara", pic: "", deadline: "", status: "todo", notes: "", link: "" };

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rancangan" | "jobdesk" | "evaluasi">("rancangan");

  // Rancangan edit
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState<Partial<Event>>({});
  const [saving, setSaving] = useState(false);

  // Team
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ member_name: "", role: "acara" });
  const [savingTeam, setSavingTeam] = useState(false);

  // Task modal — create & edit
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tf, setTf] = useState(emptyTf);
  const [savingTask, setSavingTask] = useState(false);

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSelections, setTemplateSelections] = useState<Record<string, boolean>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Eval modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evf, setEvf] = useState({ rating_overall: 5, rating_relevance: 5, rating_delivery: 5, rating_technical: 5, comments: "", interested_next: "ya" });
  const [savingEval, setSavingEval] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, taskRes, evalRes] = await Promise.all([
        fetch(`/api/management/events/${id}`),
        fetch(`/api/management/tasks?event_id=${id}`),
        fetch(`/api/management/evaluations?event_id=${id}`),
      ]);
      if (!evRes.ok) { router.push("/management"); return; }
      const [evData, taskData, evalData] = await Promise.all([evRes.json(), taskRes.json(), evalRes.json()]);
      setEvent(evData);
      setEf(evData);
      setTasks(taskData);
      setEvaluations(evalData);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Open task modal helpers
  function openCreateTask() {
    setEditingTask(null);
    setTf(emptyTf);
    setShowTaskModal(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTf({
      title: task.title,
      category: task.category,
      pic: task.pic || "",
      deadline: task.deadline || "",
      status: task.status,
      notes: task.notes || "",
      link: task.link || "",
    });
    setShowTaskModal(true);
  }

  // ── Event save ─────────────────────────────────────────────────────────────

  async function saveEvent() {
    setSaving(true);
    const res = await fetch(`/api/management/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ef),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvent((prev) => prev ? { ...prev, ...updated } : null);
      setEditing(false);
    }
    setSaving(false);
  }

  async function deleteEvent() {
    if (!confirm("Hapus event ini beserta semua jobdesk dan evaluasinya?")) return;
    await fetch(`/api/management/events/${id}`, { method: "DELETE" });
    router.push("/management");
  }

  // ── Team ───────────────────────────────────────────────────────────────────

  async function addTeamMember(e: React.FormEvent) {
    e.preventDefault();
    setSavingTeam(true);
    const res = await fetch("/api/management/event-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...teamForm, event_id: id }),
    });
    if (res.ok) {
      const newMember = await res.json();
      setEvent((prev) => prev ? { ...prev, team: [...(prev.team || []), newMember] } : null);
    }
    setTeamForm({ member_name: "", role: "acara" });
    setShowTeamModal(false);
    setSavingTeam(false);
  }

  async function removeTeamMember(tid: string) {
    await fetch(`/api/management/event-team/${tid}`, { method: "DELETE" });
    setEvent((prev) => prev ? { ...prev, team: prev.team.filter((m) => m.id !== tid) } : null);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    setSavingTask(true);
    const body = {
      ...tf,
      pic: tf.pic || null,
      deadline: tf.deadline || null,
      notes: tf.notes || null,
      link: tf.link || null,
    };

    if (editingTask) {
      // Edit mode
      const res = await fetch(`/api/management/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updated : t));
      }
    } else {
      // Create mode
      const res = await fetch("/api/management/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, event_id: id }),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks((prev) => [...prev, newTask]);
      }
    }

    setTf(emptyTf);
    setEditingTask(null);
    setShowTaskModal(false);
    setSavingTask(false);
  }

  async function cycleTaskStatus(task: Task) {
    const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    await fetch(`/api/management/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t));
  }

  async function deleteTask(tid: string) {
    await fetch(`/api/management/tasks/${tid}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== tid));
  }

  async function copyTask(task: Task) {
    const res = await fetch("/api/management/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: id,
        title: `${task.title} (Copy)`,
        category: task.category,
        pic: task.pic,
        deadline: task.deadline,
        status: "todo",
        notes: task.notes,
        link: task.link,
      }),
    });
    if (res.ok) {
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
    }
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  function openTemplateModal() {
    // Pre-check tasks not already in list
    const existing = new Set(tasks.map((t) => t.title.toLowerCase()));
    const initial: Record<string, boolean> = {};
    for (const [cat, items] of Object.entries(TASK_TEMPLATES)) {
      for (const item of items) {
        const key = `${cat}::${item.title}`;
        initial[key] = !existing.has(item.title.toLowerCase());
      }
    }
    setTemplateSelections(initial);
    setShowTemplateModal(true);
  }

  async function loadTemplates() {
    // Build member lists per category role
    const membersByRole: Record<string, string[]> = {};
    for (const r of ROLES) {
      membersByRole[r.value] = (event?.team || [])
        .filter((m) => m.role === r.value)
        .map((m) => m.member_name);
    }
    const randomPic = (cat: string) => {
      const members = membersByRole[cat] || [];
      if (!members.length) return null;
      return members[Math.floor(Math.random() * members.length)];
    };

    const toAdd: { title: string; category: string; notes?: string; pic: string | null }[] = [];
    for (const [cat, items] of Object.entries(TASK_TEMPLATES)) {
      for (const item of items) {
        const key = `${cat}::${item.title}`;
        if (templateSelections[key]) {
          toAdd.push({ title: item.title, category: cat, notes: item.notes, pic: randomPic(cat) });
        }
      }
    }
    if (!toAdd.length) { setShowTemplateModal(false); return; }

    setLoadingTemplates(true);
    const created = await Promise.all(
      toAdd.map((t) =>
        fetch("/api/management/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: id, ...t, status: "todo", deadline: null, link: null }),
        }).then((r) => r.ok ? r.json() : null)
      )
    );
    setTasks((prev) => [...prev, ...created.filter(Boolean)]);
    setLoadingTemplates(false);
    setShowTemplateModal(false);
  }

  // ── Evaluations ────────────────────────────────────────────────────────────

  async function createEval(e: React.FormEvent) {
    e.preventDefault();
    setSavingEval(true);
    const res = await fetch("/api/management/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...evf, event_id: id, comments: evf.comments || null }),
    });
    if (res.ok) {
      const newEval = await res.json();
      setEvaluations((prev) => [newEval, ...prev]);
    }
    setEvf({ rating_overall: 5, rating_relevance: 5, rating_delivery: 5, rating_technical: 5, comments: "", interested_next: "ya" });
    setShowEvalModal(false);
    setSavingEval(false);
  }

  async function deleteEval(eid: string) {
    await fetch(`/api/management/evaluations/${eid}`, { method: "DELETE" });
    setEvaluations((prev) => prev.filter((e) => e.id !== eid));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }
  if (!event) return null;

  const evStatus = STATUS_BADGE[event.status] || STATUS_BADGE.planned;
  const tasksByCategory = TASK_CATEGORIES.reduce<Record<string, Task[]>>((acc, cat) => {
    acc[cat] = tasks.filter((t) => t.category === cat);
    return acc;
  }, {});
  const teamByRole = ROLES.reduce<Record<string, TeamMember[]>>((acc, r) => {
    acc[r.value] = (event.team || []).filter((m) => m.role === r.value);
    return acc;
  }, {});

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const selectedCount = Object.values(templateSelections).filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C }}>
      {/* Navbar */}
      <header style={{ backgroundColor: G, borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/management" style={{ textDecoration: "none", color: "rgba(245,240,232,0.5)", fontSize: "0.8rem" }}>← Dashboard</Link>
          <span style={{ color: "rgba(245,240,232,0.2)" }}>|</span>
          <span style={{ color: C, fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>{event.name}</span>
          <span style={{ ...evStatus, fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>{evStatus.label}</span>
          <button
            onClick={async () => { await fetch("/api/management/auth", { method: "DELETE" }); window.location.href = "/management/login"; }}
            style={{ background: "none", border: "1px solid rgba(245,240,232,0.2)", borderRadius: 6, padding: "4px 12px", color: "rgba(245,240,232,0.5)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}
          >
            Keluar
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* Quick stats bar */}
        <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.8rem", color: "rgba(30,56,50,0.5)" }}>
            Jobdesk: <strong style={{ color: G }}>{doneTasks}/{tasks.length}</strong> selesai
            {tasks.length > 0 && <span style={{ marginLeft: 6, color: taskPct === 100 ? "#059669" : "rgba(30,56,50,0.4)" }}>({taskPct}%)</span>}
          </div>
          {evaluations.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: "rgba(30,56,50,0.5)" }}>
              Evaluasi: <strong style={{ color: G }}>{evaluations.length}</strong> responden · rata-rata <strong style={{ color: G }}>{avg(evaluations, "rating_overall")}/5</strong>
            </div>
          )}
          {event.event_date && (
            <div style={{ fontSize: "0.8rem", color: "rgba(30,56,50,0.5)" }}>
              {new Date(event.event_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {event.event_time ? `, ${event.event_time.slice(0, 5)} WIB` : ""}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(30,56,50,0.1)" }}>
          {(["rancangan", "jobdesk", "evaluasi"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 22px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              border: "none", backgroundColor: "transparent",
              color: tab === t ? G : "rgba(30,56,50,0.4)",
              borderBottom: `2px solid ${tab === t ? G : "transparent"}`,
              textTransform: "capitalize",
            }}>
              {t === "rancangan" ? "Rancangan" : t === "jobdesk" ? `Jobdesk (${tasks.length})` : `Evaluasi (${evaluations.length})`}
            </button>
          ))}
        </div>

        {/* ── RANCANGAN TAB ── */}
        {tab === "rancangan" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: G }}>Detail Event</h2>
                {!editing ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditing(true)} style={btnS}>Edit</button>
                    <button onClick={deleteEvent} style={{ ...btnS, color: "#dc2626", borderColor: "rgba(220,38,38,0.25)" }}>Hapus</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditing(false)} style={btnS}>Batal</button>
                    <button onClick={saveEvent} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? "Menyimpan..." : "Simpan"}</button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Nama Event", val: event.name },
                    { label: "Status", val: evStatus.label },
                    { label: "Format", val: event.format },
                    { label: "Tanggal", val: event.event_date ? new Date(event.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                    { label: "Waktu", val: event.event_time ? `${event.event_time.slice(0, 5)} WIB` : "—" },
                    { label: "Target Peserta", val: event.target_count ? `${event.target_count} orang` : "—" },
                    { label: "Narasumber", val: event.narasumber || "—" },
                    { label: "MC", val: event.mc || "—" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: "0.88rem", color: G, fontWeight: 500 }}>{item.val}</div>
                    </div>
                  ))}
                  {event.theme && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Tema</div>
                      <div style={{ fontSize: "0.88rem", color: G }}>{event.theme}</div>
                    </div>
                  )}
                  {event.key_points && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Key Talking Points</div>
                      <div style={{ fontSize: "0.85rem", color: G, whiteSpace: "pre-wrap", lineHeight: 1.6, backgroundColor: "#F5F0E8", padding: "12px 14px", borderRadius: 7 }}>{event.key_points}</div>
                    </div>
                  )}
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {event.folder_link && <a href={event.folder_link} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: G, textDecoration: "underline" }}>Folder Drive</a>}
                    {event.platform_link && <a href={event.platform_link} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: G, textDecoration: "underline" }}>Link Platform</a>}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Nama Event</label>
                    <input type="text" value={ef.name || ""} onChange={(e) => setEf({ ...ef, name: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Status</label>
                    <select value={ef.status || "planned"} onChange={(e) => setEf({ ...ef, status: e.target.value })} style={inp}>
                      <option value="planned">Planned</option>
                      <option value="on_progress">On Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Format</label>
                    <select value={ef.format || "online"} onChange={(e) => setEf({ ...ef, format: e.target.value })} style={inp}>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Tanggal</label>
                    <input type="date" value={ef.event_date || ""} onChange={(e) => setEf({ ...ef, event_date: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Waktu</label>
                    <input type="time" value={ef.event_time || ""} onChange={(e) => setEf({ ...ef, event_time: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Narasumber</label>
                    <input type="text" value={ef.narasumber || ""} onChange={(e) => setEf({ ...ef, narasumber: e.target.value })} placeholder="Nama narasumber" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>MC</label>
                    <input type="text" value={ef.mc || ""} onChange={(e) => setEf({ ...ef, mc: e.target.value })} placeholder="Nama MC" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Target Peserta</label>
                    <input type="number" value={ef.target_count || ""} onChange={(e) => setEf({ ...ef, target_count: parseInt(e.target.value) || null })} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Link Platform (Zoom/dll)</label>
                    <input type="url" value={ef.platform_link || ""} onChange={(e) => setEf({ ...ef, platform_link: e.target.value })} placeholder="https://..." style={inp} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Tema</label>
                    <input type="text" value={ef.theme || ""} onChange={(e) => setEf({ ...ef, theme: e.target.value })} style={inp} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Key Talking Points</label>
                    <textarea value={ef.key_points || ""} onChange={(e) => setEf({ ...ef, key_points: e.target.value })} rows={4} placeholder="1. Point pertama&#10;2. Point kedua&#10;3. ..." style={{ ...inp, resize: "vertical" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Folder Drive</label>
                    <input type="url" value={ef.folder_link || ""} onChange={(e) => setEf({ ...ef, folder_link: e.target.value })} style={inp} />
                  </div>
                </div>
              )}
            </div>

            {/* Tim card */}
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: G }}>Tim</h2>
                <button onClick={() => setShowTeamModal(true)} style={btnP}>+ Tambah</button>
              </div>
              {(event.team || []).length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "rgba(30,56,50,0.35)" }}>Belum ada anggota tim.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {ROLES.map((r) => {
                    const members = teamByRole[r.value];
                    if (!members.length) return null;
                    return (
                      <div key={r.value} style={{ backgroundColor: C, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(30,56,50,0.4)", marginBottom: 8 }}>{r.label}</div>
                        {members.map((m) => (
                          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.85rem", color: G, fontWeight: 500 }}>{m.member_name}</span>
                            <button onClick={() => removeTeamMember(m.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.3)", cursor: "pointer", fontSize: "1rem" }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── JOBDESK TAB ── */}
        {tab === "jobdesk" && (
          <div>
            {/* Progress */}
            {tasks.length > 0 && (
              <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "rgba(30,56,50,0.55)", marginBottom: 6 }}>
                  <span>Progress keseluruhan</span>
                  <span>{doneTasks}/{tasks.length} selesai ({taskPct}%)</span>
                </div>
                <div style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${taskPct}%`, backgroundColor: taskPct === 100 ? "#059669" : G, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={openTemplateModal} style={btnS}>Template Divisi</button>
              <button onClick={openCreateTask} style={btnP}>+ Tambah Jobdesk</button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(30,56,50,0.35)", padding: "48px 0", fontSize: "0.9rem" }}>
                <div style={{ marginBottom: 12 }}>Belum ada jobdesk.</div>
                <button onClick={openTemplateModal} style={{ ...btnS, fontSize: "0.85rem" }}>Muat Template Divisi</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {TASK_CATEGORIES.map((cat) => {
                  const catTasks = tasksByCategory[cat];
                  if (!catTasks.length) return null;
                  const catDone = catTasks.filter((t) => t.status === "done").length;
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {CATEGORY_LABELS[cat]}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "rgba(30,56,50,0.35)" }}>{catDone}/{catTasks.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {catTasks.map((task) => {
                          const st = STATUS_BADGE[task.status] || STATUS_BADGE.todo;
                          const isDone = task.status === "done";
                          return (
                            <div
                              key={task.id}
                              style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 8, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}
                            >
                              {/* Status cycle */}
                              <button
                                onClick={() => cycleTaskStatus(task)}
                                title={`${st.label} — klik ganti`}
                                style={{
                                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                                  border: `2px solid ${isDone ? "#059669" : task.status === "in_progress" ? "#3b82f6" : "rgba(30,56,50,0.25)"}`,
                                  backgroundColor: isDone ? "#059669" : task.status === "in_progress" ? "#3b82f6" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                              >
                                {task.status !== "todo" && (
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>

                              {/* Title + notes */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: "0.87rem", color: G, fontWeight: 500, textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.45 : 1 }}>
                                  {task.title}
                                </span>
                                {task.notes && <p style={{ fontSize: "0.73rem", color: "rgba(30,56,50,0.45)", margin: "2px 0 0" }}>{task.notes}</p>}
                              </div>

                              {/* Meta + actions */}
                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                                {task.pic && (
                                  <span style={{ fontSize: "0.7rem", backgroundColor: C, color: G, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{task.pic}</span>
                                )}
                                {task.deadline && (
                                  <span style={{ fontSize: "0.7rem", color: "rgba(30,56,50,0.45)" }}>
                                    {new Date(task.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                                <span style={{ ...st, fontSize: "0.68rem", fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{st.label}</span>
                                {task.link && <a href={task.link} target="_blank" rel="noreferrer" style={{ fontSize: "0.7rem", color: G, textDecoration: "underline" }}>link</a>}
                                {/* Edit */}
                                <button
                                  onClick={() => openEditTask(task)}
                                  title="Edit"
                                  style={{ background: "none", border: "none", color: "rgba(30,56,50,0.35)", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, padding: "2px 3px" }}
                                >✎</button>
                                {/* Copy */}
                                <button
                                  onClick={() => copyTask(task)}
                                  title="Duplikat"
                                  style={{ background: "none", border: "none", color: "rgba(30,56,50,0.35)", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, padding: "2px 3px" }}
                                >⧉</button>
                                {/* Delete */}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  title="Hapus"
                                  style={{ background: "none", border: "none", color: "rgba(30,56,50,0.22)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px 3px" }}
                                >×</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EVALUASI TAB ── */}
        {tab === "evaluasi" && (
          <div>
            {evaluations.length > 0 && (
              <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: G, marginBottom: 16 }}>Ringkasan — {evaluations.length} Responden</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
                  {[
                    { label: "Keseluruhan", field: "rating_overall" as keyof Evaluation },
                    { label: "Relevansi Materi", field: "rating_relevance" as keyof Evaluation },
                    { label: "Penyampaian", field: "rating_delivery" as keyof Evaluation },
                    { label: "Teknis Acara", field: "rating_technical" as keyof Evaluation },
                  ].map((item) => {
                    const a = parseFloat(avg(evaluations, item.field));
                    return (
                      <div key={item.label}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: G, lineHeight: 1 }}>{isNaN(a) ? "—" : a.toFixed(1)}</div>
                        {!isNaN(a) && (
                          <div style={{ marginTop: 5, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${(a / 5) * 100}%`, backgroundColor: a >= 4.5 ? "#059669" : a >= 3.5 ? "#f59e0b" : "#ef4444", borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: "1px solid rgba(30,56,50,0.08)", paddingTop: 16 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Tertarik ikut event selanjutnya?</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                      { key: "ya", label: "Ya, sangat tertarik", color: "#059669", bg: "#d1fae5" },
                      { key: "mungkin", label: "Mungkin", color: "#b45309", bg: "#fef3c7" },
                      { key: "tidak", label: "Tidak", color: "#6b7280", bg: "#f3f4f6" },
                    ].map((opt) => {
                      const count = evaluations.filter((e) => e.interested_next === opt.key).length;
                      const pct = evaluations.length > 0 ? Math.round((count / evaluations.length) * 100) : 0;
                      return (
                        <div key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ backgroundColor: opt.bg, color: opt.color, fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4 }}>{opt.label}</span>
                          <span style={{ fontSize: "0.82rem", color: G, fontWeight: 700 }}>{count}</span>
                          <span style={{ fontSize: "0.75rem", color: "rgba(30,56,50,0.4)" }}>({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setShowEvalModal(true)} style={btnP}>+ Tambah Evaluasi</button>
            </div>

            {evaluations.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(30,56,50,0.35)", padding: "48px 0", fontSize: "0.9rem" }}>Belum ada data evaluasi.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {evaluations.map((e, i) => (
                  <div key={e.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 8, padding: "14px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: C, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: G, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
                        {[
                          { label: "Overall", val: e.rating_overall },
                          { label: "Relevansi", val: e.rating_relevance },
                          { label: "Penyampaian", val: e.rating_delivery },
                          { label: "Teknis", val: e.rating_technical },
                        ].map((r) => r.val != null && (
                          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: "0.7rem", color: "rgba(30,56,50,0.45)" }}>{r.label}</span>
                            <Stars value={r.val} />
                          </div>
                        ))}
                        {e.interested_next && (
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 4, backgroundColor: e.interested_next === "ya" ? "#d1fae5" : e.interested_next === "mungkin" ? "#fef3c7" : "#f3f4f6", color: e.interested_next === "ya" ? "#065f46" : e.interested_next === "mungkin" ? "#b45309" : "#6b7280", fontWeight: 600 }}>
                            {e.interested_next === "ya" ? "Tertarik lagi" : e.interested_next === "mungkin" ? "Mungkin" : "Tidak tertarik"}
                          </span>
                        )}
                      </div>
                      {e.comments && <p style={{ fontSize: "0.82rem", color: "rgba(30,56,50,0.65)", lineHeight: 1.5, margin: 0 }}>{e.comments}</p>}
                    </div>
                    <button onClick={() => deleteEval(e.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.25)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TEAM MODAL ── */}
      {showTeamModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTeamModal(false); }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 360 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: G, marginBottom: 18 }}>Tambah Anggota Tim</h2>
            <form onSubmit={addTeamMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Nama *</label>
                <input type="text" value={teamForm.member_name} onChange={(e) => setTeamForm({ ...teamForm, member_name: e.target.value })} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Role</label>
                <select value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} style={inp}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setShowTeamModal(false)} style={{ ...btnS, flex: 1 }}>Batal</button>
                <button type="submit" disabled={savingTeam} style={{ ...btnP, flex: 1, opacity: savingTeam ? 0.7 : 1 }}>{savingTeam ? "Menyimpan..." : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK MODAL (create & edit) ── */}
      {showTaskModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowTaskModal(false); setEditingTask(null); } }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: G, marginBottom: 18 }}>
              {editingTask ? "Edit Jobdesk" : "Tambah Jobdesk"}
            </h2>
            <form onSubmit={submitTask} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Tugas *</label>
                <input type="text" value={tf.title} onChange={(e) => setTf({ ...tf, title: e.target.value })} placeholder="cth. Buat poster feed" style={inp} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Divisi</label>
                  <select value={tf.category} onChange={(e) => setTf({ ...tf, category: e.target.value })} style={inp}>
                    <option value="acara">Acara</option>
                    <option value="marketing">Marketing</option>
                    <option value="design">Design</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={tf.status} onChange={(e) => setTf({ ...tf, status: e.target.value })} style={inp}>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>PIC</label>
                  <input type="text" value={tf.pic} onChange={(e) => setTf({ ...tf, pic: e.target.value })} placeholder="cth. Dyah" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Deadline</label>
                  <input type="date" value={tf.deadline} onChange={(e) => setTf({ ...tf, deadline: e.target.value })} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input type="text" value={tf.notes} onChange={(e) => setTf({ ...tf, notes: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Link</label>
                <input type="url" value={tf.link} onChange={(e) => setTf({ ...tf, link: e.target.value })} placeholder="https://..." style={inp} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ ...btnS, flex: 1 }}>Batal</button>
                <button type="submit" disabled={savingTask} style={{ ...btnP, flex: 1, opacity: savingTask ? 0.7 : 1 }}>
                  {savingTask ? "Menyimpan..." : editingTask ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEMPLATE MODAL ── */}
      {showTemplateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTemplateModal(false); }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 620, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: G }}>Template Jobdesk per Divisi</h2>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.4)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.45)", marginBottom: 20 }}>
              Centang jobdesk yang ingin ditambahkan. Yang sudah ada di list tidak dicentang otomatis.
            </p>

            {/* Select all / none */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setTemplateSelections(Object.fromEntries(Object.keys(templateSelections).map((k) => [k, true])))}
                style={{ ...btnS, fontSize: "0.75rem", padding: "5px 12px" }}
              >Pilih Semua</button>
              <button
                onClick={() => setTemplateSelections(Object.fromEntries(Object.keys(templateSelections).map((k) => [k, false])))}
                style={{ ...btnS, fontSize: "0.75rem", padding: "5px 12px" }}
              >Hapus Semua</button>
            </div>

            {TASK_CATEGORIES.map((cat) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(30,56,50,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  {CATEGORY_LABELS[cat]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {TASK_TEMPLATES[cat].map((item) => {
                    const key = `${cat}::${item.title}`;
                    const checked = templateSelections[key] ?? false;
                    return (
                      <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 7, backgroundColor: checked ? "#f0fdf4" : C, cursor: "pointer", border: `1px solid ${checked ? "rgba(5,150,105,0.2)" : "transparent"}` }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setTemplateSelections((prev) => ({ ...prev, [key]: e.target.checked }))}
                          style={{ marginTop: 2, accentColor: G, flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: "0.85rem", color: G, fontWeight: 500 }}>{item.title}</div>
                          {item.notes && <div style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.45)", marginTop: 1 }}>{item.notes}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 4, position: "sticky", bottom: 0, backgroundColor: "#fff", paddingTop: 12, borderTop: "1px solid rgba(30,56,50,0.08)" }}>
              <button onClick={() => setShowTemplateModal(false)} style={{ ...btnS, flex: 1 }}>Batal</button>
              <button
                onClick={loadTemplates}
                disabled={loadingTemplates || selectedCount === 0}
                style={{ ...btnP, flex: 2, opacity: (loadingTemplates || selectedCount === 0) ? 0.6 : 1 }}
              >
                {loadingTemplates ? "Menambahkan..." : `Tambahkan ${selectedCount} Jobdesk`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVAL MODAL ── */}
      {showEvalModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEvalModal(false); }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: G, marginBottom: 20 }}>Tambah Evaluasi</h2>
            <form onSubmit={createEval} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Penilaian Keseluruhan", field: "rating_overall" as const },
                { label: "Relevansi Materi", field: "rating_relevance" as const },
                { label: "Penyampaian Materi", field: "rating_delivery" as const },
                { label: "Teknis Acara", field: "rating_technical" as const },
              ].map((item) => (
                <div key={item.field}>
                  <label style={lbl}>{item.label}</label>
                  <Stars value={evf[item.field]} onChange={(v) => setEvf({ ...evf, [item.field]: v })} />
                </div>
              ))}
              <div>
                <label style={lbl}>Tertarik ikut event selanjutnya?</label>
                <select value={evf.interested_next} onChange={(e) => setEvf({ ...evf, interested_next: e.target.value })} style={inp}>
                  <option value="ya">Ya, sangat tertarik</option>
                  <option value="mungkin">Mungkin, tergantung materinya</option>
                  <option value="tidak">Tidak</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Kritik & Saran</label>
                <textarea value={evf.comments} onChange={(e) => setEvf({ ...evf, comments: e.target.value })} rows={3} placeholder="Tulis feedback peserta di sini..." style={{ ...inp, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowEvalModal(false)} style={{ ...btnS, flex: 1 }}>Batal</button>
                <button type="submit" disabled={savingEval} style={{ ...btnP, flex: 1, opacity: savingEval ? 0.7 : 1 }}>{savingEval ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
