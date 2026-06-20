"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskStats {
  total: number;
  done: number;
}

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
  task_stats: TaskStats;
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  on_progress: "On Progress",
  done: "Done",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planned: { bg: "#e5e7eb", color: "#374151" },
  on_progress: { bg: "#fef3c7", color: "#b45309" },
  done: { bg: "#d1fae5", color: "#065f46" },
};

function Spinner({ small }: { small?: boolean }) {
  const size = small ? 18 : 28;
  return (
    <svg
      style={{ animation: "spin 1s linear infinite", height: size, width: size, display: "block", color: "#1E3832" }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default function ManagementDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    status: "planned",
    event_date: "",
    event_time: "",
    format: "online",
    theme: "",
    target_count: "",
    folder_link: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Long press action sheet
  const [actionEvent, setActionEvent] = useState<Event | null>(null);
  const [pressing, setPressing] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/management/events");
      if (!res.ok) throw new Error("Gagal mengambil data event");
      const data = await res.json();
      setEvents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const pendingTasks = events.reduce((sum, e) => sum + (e.task_stats.total - e.task_stats.done), 0);
  const doneTasks = events.reduce((sum, e) => sum + e.task_stats.done, 0);

  const startPress = useCallback((event: Event) => {
    didLongPress.current = false;
    setPressing(event.id);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(null);
      setActionEvent(event);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setPressing(null);
  }, []);

  const handleCardClick = useCallback((event: Event) => {
    if (didLongPress.current) return;
    router.push(`/management/events/${event.id}`);
  }, [router]);

  async function handleDuplicate() {
    if (!actionEvent) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/management/events/${actionEvent.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menduplikat event");
      }
      const created = await res.json();
      setActionEvent(null);
      router.push(`/management/events/${created.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!actionEvent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/management/events/${actionEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menghapus event");
      }
      setActionEvent(null);
      setEvents((prev) => prev.filter((e) => e.id !== actionEvent.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Nama event wajib diisi");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/management/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target_count: form.target_count ? parseInt(form.target_count) : null,
          event_date: form.event_date || null,
          event_time: form.event_time || null,
          theme: form.theme || null,
          folder_link: form.folder_link || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal membuat event");
      }
      const created = await res.json();
      setShowModal(false);
      setForm({ name: "", status: "planned", event_date: "", event_time: "", format: "online", theme: "", target_count: "", folder_link: "" });
      router.push(`/management/events/${created.id}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      {/* Navbar */}
      <header style={{ backgroundColor: "#1E3832", borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: "#F5F0E8", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.04em" }}>DonaTalks</span>
          </Link>
          <button
            onClick={async () => { await fetch("/api/management/auth", { method: "DELETE" }); window.location.href = "/management/login"; }}
            style={{ background: "none", border: "1px solid rgba(245,240,232,0.2)", borderRadius: 6, padding: "4px 12px", color: "rgba(245,240,232,0.5)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}
          >
            Keluar
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1E3832", marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(30,56,50,0.5)" }}>Kelola semua event DonaTalks</p>
        </div>

        {/* Stats row */}
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Event", value: events.length },
              { label: "Task Selesai", value: doneTasks },
              { label: "Task Belum Selesai", value: pendingTasks },
            ].map((stat) => (
              <div key={stat.label} style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1E3832", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(30,56,50,0.5)", marginTop: 6 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Events header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1E3832" }}>Event</h2>
            <p style={{ fontSize: "0.75rem", color: "rgba(30,56,50,0.4)", marginTop: 2 }}>Tahan kartu untuk hapus atau duplikat</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: "#1E3832", color: "#F5F0E8", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            + Tambah Event
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spinner />
          </div>
        ) : error ? (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 8, fontSize: "0.88rem" }}>
            {error}
            <button onClick={fetchEvents} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", color: "#991b1b", cursor: "pointer" }}>Coba lagi</button>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(30,56,50,0.4)", fontSize: "0.9rem" }}>
            Belum ada event. Buat event pertama!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {events.map((event) => {
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.planned;
              const taskPct = event.task_stats.total > 0
                ? Math.round((event.task_stats.done / event.task_stats.total) * 100)
                : 0;
              const isPressed = pressing === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => handleCardClick(event)}
                  onMouseDown={() => startPress(event)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress(event)}
                  onTouchEnd={cancelPress}
                  onTouchCancel={cancelPress}
                  onContextMenu={(e) => { e.preventDefault(); setActionEvent(event); }}
                  style={{
                    backgroundColor: "#fff",
                    border: `1px solid ${isPressed ? "rgba(30,56,50,0.4)" : "rgba(30,56,50,0.1)"}`,
                    borderRadius: 10,
                    padding: "20px",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s, transform 0.1s, opacity 0.1s",
                    transform: isPressed ? "scale(0.97)" : "scale(1)",
                    opacity: isPressed ? 0.85 : 1,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                  onMouseEnter={(e) => { if (!isPressed) e.currentTarget.style.boxShadow = "0 4px 16px rgba(30,56,50,0.1)"; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1E3832", flex: 1, marginRight: 10 }}>{event.name}</h3>
                    <span style={{ ...statusStyle, fontSize: "0.72rem", fontWeight: 600, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>

                  {event.theme && (
                    <p style={{ fontSize: "0.8rem", color: "rgba(30,56,50,0.55)", marginBottom: 8, fontStyle: "italic" }}>
                      {event.theme}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                    {event.event_date && (
                      <span style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.6)" }}>
                        {new Date(event.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    <span style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.6)", textTransform: "capitalize" }}>
                      {event.format}
                    </span>
                  </div>

                  {/* Task progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(30,56,50,0.5)", marginBottom: 4 }}>
                      <span>Tasks</span>
                      <span>{event.task_stats.done}/{event.task_stats.total} selesai</span>
                    </div>
                    <div style={{ height: 5, backgroundColor: "#e5e7eb", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${taskPct}%`, backgroundColor: "#1E3832", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>

                  {event.target_count && (
                    <div style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.5)" }}>
                      Target: <strong style={{ color: "#1E3832" }}>{event.target_count}</strong> peserta
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action sheet — long press */}
      {actionEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { if (!duplicating && !deleting) setActionEvent(null); }}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: "20px 20px 32px", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, backgroundColor: "rgba(30,56,50,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />
            <p style={{ fontSize: "0.78rem", color: "rgba(30,56,50,0.45)", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Event</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1E3832", marginBottom: 20 }}>{actionEvent.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleDuplicate}
                disabled={duplicating || deleting}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#F5F0E8", border: "none", borderRadius: 10, cursor: duplicating ? "not-allowed" : "pointer", opacity: duplicating ? 0.6 : 1 }}
              >
                <span style={{ fontSize: "1.2rem" }}>⧉</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1E3832" }}>
                  {duplicating ? "Menduplikat..." : "Duplikat Event"}
                </span>
                {duplicating && <span style={{ marginLeft: "auto" }}><Spinner small /></span>}
              </button>

              <button
                onClick={handleDelete}
                disabled={duplicating || deleting}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#fee2e2", border: "none", borderRadius: 10, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}
              >
                <span style={{ fontSize: "1.2rem" }}>🗑</span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#991b1b" }}>
                  {deleting ? "Menghapus..." : "Hapus Event"}
                </span>
                {deleting && <span style={{ marginLeft: "auto" }}><Spinner small /></span>}
              </button>

              <button
                onClick={() => setActionEvent(null)}
                disabled={duplicating || deleting}
                style={{ padding: "13px 16px", backgroundColor: "transparent", border: "1px solid rgba(30,56,50,0.2)", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem", color: "rgba(30,56,50,0.6)", fontWeight: 500 }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setFormError(null); } }}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: "32px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1E3832", marginBottom: 20 }}>Tambah Event</h2>

            {formError && (
              <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 7, fontSize: "0.83rem", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nama Event *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="cth. DonaTalks Vol. 5"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                    <option value="planned">Planned</option>
                    <option value="on_progress">On Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Format</label>
                  <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} style={inputStyle}>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tanggal</label>
                  <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Waktu</label>
                  <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tema</label>
                <input
                  type="text"
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  placeholder="Tema event"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Target Peserta</label>
                <input
                  type="number"
                  value={form.target_count}
                  onChange={(e) => setForm({ ...form, target_count: e.target.value })}
                  placeholder="cth. 100"
                  min="0"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Link Folder Drive</label>
                <input
                  type="url"
                  value={form.folder_link}
                  onChange={(e) => setForm({ ...form, folder_link: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); }}
                  style={{ flex: 1, padding: "10px", border: "1px solid rgba(30,56,50,0.3)", borderRadius: 7, backgroundColor: "transparent", color: "#1E3832", fontSize: "0.88rem", cursor: "pointer", fontWeight: 500 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ flex: 1, padding: "10px", border: "none", borderRadius: 7, backgroundColor: "#1E3832", color: "#F5F0E8", fontSize: "0.88rem", cursor: creating ? "not-allowed" : "pointer", fontWeight: 600, opacity: creating ? 0.7 : 1 }}
                >
                  {creating ? "Membuat..." : "Buat Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
