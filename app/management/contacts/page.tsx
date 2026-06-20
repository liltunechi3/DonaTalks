"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Contact {
  id: string;
  name: string;
  organization: string | null;
  unit: string | null;
  contact_info: string | null;
  instagram: string | null;
  gender: string | null;
  major: string | null;
  status: "belum_dihubungi" | "follow_up" | "deal" | "done";
  notes: string | null;
  event_id: string | null;
  created_at: string;
}

type StatusFilter = "all" | "belum_dihubungi" | "follow_up" | "deal" | "done";

const STATUS_LABELS: Record<string, string> = {
  belum_dihubungi: "Belum Dihubungi",
  follow_up: "Follow Up",
  deal: "Deal",
  done: "Done",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  belum_dihubungi: { bg: "#e5e7eb", color: "#374151" },
  follow_up: { bg: "#fef3c7", color: "#b45309" },
  deal: { bg: "#d1fae5", color: "#065f46" },
  done: { bg: "#e5e7eb", color: "#6b7280" },
};

function Spinner() {
  return (
    <svg style={{ animation: "spin 1s linear infinite", height: 28, width: 28, display: "block", color: "#1E3832" }} viewBox="0 0 24 24" fill="none">
      <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organization: "",
    unit: "",
    contact_info: "",
    instagram: "",
    gender: "",
    major: "",
    status: "belum_dihubungi",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Notes edit inline
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  async function fetchContacts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/management/contacts");
      if (!res.ok) throw new Error("Gagal mengambil data kontak");
      const data = await res.json();
      setContacts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = filter === "all" ? contacts : contacts.filter((c) => c.status === filter);

  async function updateStatus(contactId: string, status: string) {
    const res = await fetch(`/api/management/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    }
  }

  async function saveNotes(contactId: string) {
    const res = await fetch(`/api/management/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    }
    setEditingNotes(null);
  }

  async function deleteContact(contactId: string) {
    if (!confirm("Hapus kontak ini?")) return;
    const res = await fetch(`/api/management/contacts/${contactId}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== contactId));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError("Nama wajib diisi"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/management/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organization: form.organization || null,
          unit: form.unit || null,
          contact_info: form.contact_info || null,
          instagram: form.instagram || null,
          gender: form.gender || null,
          major: form.major || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal menambah kontak"); }
      const created = await res.json();
      setContacts((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ name: "", organization: "", unit: "", contact_info: "", instagram: "", gender: "", major: "", status: "belum_dihubungi", notes: "" });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setCreating(false);
    }
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "belum_dihubungi", label: "Belum Dihubungi" },
    { key: "follow_up", label: "Follow Up" },
    { key: "deal", label: "Deal" },
    { key: "done", label: "Done" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#1E3832", borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: "#F5F0E8", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.04em" }}>DonaTalks</span>
          </Link>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.5)" }}>
            Management
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* Back */}
        <Link href="/management" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "rgba(30,56,50,0.55)", textDecoration: "none", marginBottom: 20 }}>
          ← Kembali ke Dashboard
        </Link>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1E3832", marginBottom: 2 }}>CRM Kontak</h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(30,56,50,0.5)" }}>Kelola calon pembicara & mitra event</p>
          </div>
          <button onClick={() => setShowModal(true)} style={primaryBtnStyle}>+ Tambah Kontak</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid rgba(30,56,50,0.1)", marginBottom: 20 }}>
          {filterTabs.map((tab) => {
            const count = tab.key === "all" ? contacts.length : contacts.filter((c) => c.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: filter === tab.key ? "#1E3832" : "rgba(30,56,50,0.4)",
                  borderBottom: filter === tab.key ? "2px solid #1E3832" : "2px solid transparent",
                  marginBottom: -2,
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label} <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spinner />
          </div>
        ) : error ? (
          <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 8, fontSize: "0.88rem" }}>
            {error}
            <button onClick={fetchContacts} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", color: "#991b1b", cursor: "pointer" }}>Coba lagi</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(30,56,50,0.4)", fontSize: "0.9rem" }}>
            {filter === "all" ? "Belum ada kontak." : `Tidak ada kontak dengan status "${STATUS_LABELS[filter]}".`}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#fff", borderBottom: "2px solid rgba(30,56,50,0.1)" }}>
                  {["Nama", "Organisasi / Unit", "Kontak", "Instagram", "Gender", "Jurusan", "Status", "Catatan", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(30,56,50,0.5)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact, i) => {
                  const sStyle = STATUS_COLORS[contact.status] || STATUS_COLORS.belum_dihubungi;
                  return (
                    <tr key={contact.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "rgba(245,240,232,0.4)", borderBottom: "1px solid rgba(30,56,50,0.06)" }}>
                      {/* Name */}
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1E3832", whiteSpace: "nowrap" }}>{contact.name}</td>

                      {/* Org / Unit */}
                      <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>
                        <div>{contact.organization || "—"}</div>
                        {contact.unit && <div style={{ fontSize: "0.72rem", color: "rgba(30,56,50,0.4)" }}>{contact.unit}</div>}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>{contact.contact_info || "—"}</td>

                      {/* Instagram */}
                      <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>
                        {contact.instagram ? (
                          <a href={`https://instagram.com/${contact.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1E3832", textDecoration: "none" }}>
                            @{contact.instagram.replace("@", "")}
                          </a>
                        ) : "—"}
                      </td>

                      {/* Gender */}
                      <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)", whiteSpace: "nowrap" }}>{contact.gender || "—"}</td>

                      {/* Major */}
                      <td style={{ padding: "10px 12px", color: "rgba(30,56,50,0.65)" }}>{contact.major || "—"}</td>

                      {/* Status */}
                      <td style={{ padding: "10px 12px" }}>
                        <select
                          value={contact.status}
                          onChange={(e) => updateStatus(contact.id, e.target.value)}
                          style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 6px", borderRadius: 5, border: "none", backgroundColor: sStyle.bg, color: sStyle.color, cursor: "pointer" }}
                        >
                          <option value="belum_dihubungi">Belum Dihubungi</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="deal">Deal</option>
                          <option value="done">Done</option>
                        </select>
                      </td>

                      {/* Notes */}
                      <td style={{ padding: "10px 12px", maxWidth: 200 }}>
                        {editingNotes === contact.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              autoFocus
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveNotes(contact.id); if (e.key === "Escape") setEditingNotes(null); }}
                              style={{ padding: "4px 6px", border: "1px solid rgba(30,56,50,0.25)", borderRadius: 5, fontSize: "0.8rem", width: 150, outline: "none" }}
                            />
                            <button onClick={() => saveNotes(contact.id)} style={{ fontSize: "0.72rem", backgroundColor: "#1E3832", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>OK</button>
                            <button onClick={() => setEditingNotes(null)} style={{ fontSize: "0.72rem", background: "none", border: "none", color: "rgba(30,56,50,0.4)", cursor: "pointer" }}>✕</button>
                          </div>
                        ) : (
                          <span
                            onClick={() => { setEditingNotes(contact.id); setNotesValue(contact.notes || ""); }}
                            style={{ cursor: "pointer", color: contact.notes ? "rgba(30,56,50,0.7)" : "rgba(30,56,50,0.25)", fontSize: "0.8rem", borderBottom: "1px dashed rgba(30,56,50,0.2)", paddingBottom: 1 }}
                            title="Klik untuk edit catatan"
                          >
                            {contact.notes || "Tambah catatan..."}
                          </span>
                        )}
                      </td>

                      {/* Delete */}
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => deleteContact(contact.id)} style={{ background: "none", border: "none", color: "rgba(30,56,50,0.3)", cursor: "pointer", fontSize: "1rem" }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setFormError(null); } }}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: "32px", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1E3832", marginBottom: 20 }}>Tambah Kontak</h2>

            {formError && (
              <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 7, fontSize: "0.83rem", marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nama *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Organisasi / Instansi</label>
                  <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="cth. Universitas X" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Unit / Divisi</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="cth. BEM Fakultas" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Kontak (No. HP / Email)</label>
                  <input value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} placeholder="08xx / email" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Instagram</label>
                  <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@username" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
                    <option value="">Pilih...</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Jurusan / Bidang</label>
                  <input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="cth. Hukum" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  <option value="belum_dihubungi">Belum Dihubungi</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="deal">Deal</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tentang kontak ini..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowModal(false); setFormError(null); }} style={secondaryBtnStyle}>Batal</button>
                <button type="submit" disabled={creating} style={{ ...primaryBtnStyle, opacity: creating ? 0.7 : 1, flex: 1 }}>
                  {creating ? "Menyimpan..." : "Tambah Kontak"}
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
