import { useState, useEffect, useRef } from "react";

const storage = {
  async get(key, shared = true) {
    try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(key, value, shared = true) {
    try { await window.storage.set(key, JSON.stringify(value), shared); } catch {}
  },
};

// ─── Activity logger ──────────────────────────────────────────────────────────
const createEvent = (type, description, userId, meta = {}) => ({
  id: "ev" + Date.now() + Math.random().toString(36).slice(2, 6),
  type, description, userId, meta, timestamp: Date.now(),
});

const SEED = {
  users: [
    { id: "u1", name: "Franco", email: "franco@nistaestudio.com", password: "franco123", avatar: "FR", color: "#5b6af0" },
    { id: "u2", name: "Pablo",  email: "pablo@nistaestudio.com",  password: "pablo123",  avatar: "PA", color: "#e86c4a" },
    { id: "u3", name: "Nico",   email: "nico@nistaestudio.com",   password: "nico123",   avatar: "NI", color: "#3db88a" },
    { id: "u4", name: "Lucho",  email: "lucho@nistaestudio.com",  password: "lucho123",  avatar: "LU", color: "#a855f7" },
  ],
  clients:  [],
  tags:     [],
  tasks:    [],
  pages:    [],
  meetings: [],
  activity: [],
};

const TAG_PALETTE  = ["#5b6af0","#e86c4a","#3db88a","#f0a030","#a855f7","#ec4899","#0ea5e9","#64748b"];
const priorityMap  = { high: { label: "Alta", color: "#e86c4a" }, medium: { label: "Media", color: "#f0a030" }, low: { label: "Baja", color: "#3db88a" } };
const statusMap    = { todo: { label: "Por hacer", color: "#888" }, doing: { label: "En progreso", color: "#5b6af0" }, blocked: { label: "Bloqueada", color: "#e86c4a" }, done: { label: "Completado", color: "#3db88a" } };
const clientStatusMap = { active: { label: "Activo", color: "#3db88a" }, paused: { label: "En pausa", color: "#f0a030" }, closed: { label: "Cerrado", color: "#aaa" } };

const getWeekBounds = (offsetWeeks = 0) => {
  const now = new Date(); const day = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return { monday, sunday };
};
const toYMD = d => d.toISOString().split("T")[0];
const fmtTime = (ts) => {
  const d = new Date(ts); const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)  return "ahora";
  if (diff < 60) return `hace ${diff}m`;
  if (diff < 1440) return `hace ${Math.floor(diff/60)}h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    home:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    clients:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    tasks:    "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    calendar: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
    workload: "M12 20V10 M18 20V4 M6 20v-4",
    meeting:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    plus:     "M12 5v14M5 12h14",
    x:        "M18 6 6 18M6 6l12 12",
    edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:    "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    link:     "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    clock:    "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z M12 6v6l4 2",
    block:    "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z M4.93 4.93l14.14 14.14",
    chevL:    "M15 18l-6-6 6-6",
    chevR:    "M9 18l6-6-6-6",
    subtask:  "M9 17H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4 M12 3v10 M8 9l4 4 4-4",
    convert:  "M5 12h14 M12 5l7 7-7 7",
    tag:      "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 32 }) => (
  <div title={user?.name} style={{ width: size, height: size, borderRadius: "50%", background: user?.color || "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 600, color: "#fff", flexShrink: 0, fontFamily: "inherit" }}>
    {user?.avatar || "?"}
  </div>
);
const ClientAvatar = ({ client, size = 42 }) => (
  client?.logo
    ? <img src={client.logo} alt={client.name} style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: 10, background: (client?.color || "#888") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: client?.color || "#888", flexShrink: 0 }}>{client?.initials || "?"}</div>
);
const Badge = ({ label, color }) => (
  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: color + "18", color, letterSpacing: "0.03em" }}>{label}</span>
);
const TagChip = ({ tag }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: tag.color + "18", color: tag.color, whiteSpace: "nowrap" }}>{tag.label}</span>
);
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`tf-modal-inner${wide ? " tf-modal-wide" : ""}`} style={{ background: "#fff", width: "100%", maxHeight: "92vh", overflow: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 0" }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, fontFamily: "inherit" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}><Icon name="x" /></button>
      </div>
      <div style={{ padding: "18px 24px 28px" }}>{children}</div>
    </div>
  </div>
);
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fafafa", ...props.style }}
      onFocus={e => e.target.style.borderColor = "#5b6af0"} onBlur={e => e.target.style.borderColor = "#e8e8e8"} />
  </div>
);
const Textarea = ({ label, rows = 4, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
    <textarea rows={rows} {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fafafa", ...props.style }}
      onFocus={e => e.target.style.borderColor = "#5b6af0"} onBlur={e => e.target.style.borderColor = "#e8e8e8"} />
  </div>
);
const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#fafafa", cursor: "pointer" }}>{children}</select>
  </div>
);
const Btn = ({ children, variant = "primary", onClick, style = {}, disabled }) => {
  const styles = { primary: { background: "#1a1a1a", color: "#fff", border: "none" }, secondary: { background: "#f3f3f3", color: "#1a1a1a", border: "none" }, danger: { background: "#fef2f0", color: "#e86c4a", border: "1.5px solid #fbd5cd" }, accent: { background: "#5b6af010", color: "#5b6af0", border: "1.5px solid #5b6af030" } };
  return <button onClick={onClick} disabled={disabled} style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: disabled ? 0.5 : 1, ...styles[variant], ...style }}>{children}</button>;
};

// ─── Logo Uploader ────────────────────────────────────────────────────────────
const LogoUploader = ({ client, onUpload }) => {
  const ref = useRef();
  const handleFile = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onUpload(ev.target.result); r.readAsDataURL(f); };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", cursor: "pointer" }} onClick={() => ref.current.click()}>
        <ClientAvatar client={client} size={80} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", color: "#fff" }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}><Icon name="upload" size={20} /></div>
      </div>
      <button onClick={() => ref.current.click()} style={{ background: "none", border: "1.5px dashed #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="upload" size={13} /> {client?.logo ? "Cambiar logo" : "Subir logo"}
      </button>
      {client?.logo && <button onClick={() => onUpload(null)} style={{ background: "none", border: "none", fontSize: 11, color: "#e86c4a", cursor: "pointer", fontFamily: "inherit" }}>Quitar logo</button>}
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
};

// ─── Tag Selector ─────────────────────────────────────────────────────────────
const TagSelector = ({ clientId, tags, selected, onChange }) => {
  const [newLabel, setNewLabel] = useState(""); const [newColor, setNewColor] = useState(TAG_PALETTE[0]); const [adding, setAdding] = useState(false);
  const clientTags = tags.filter(t => t.clientId === clientId);
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const createTag = () => { if (!newLabel.trim()) return; onChange([...selected], { label: newLabel.trim(), color: newColor, clientId }); setNewLabel(""); setAdding(false); };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Etiquetas</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {clientTags.length === 0 && !adding && <span style={{ fontSize: 12, color: "#bbb" }}>Sin etiquetas para este cliente.</span>}
        {clientTags.map(tag => { const active = selected.includes(tag.id); return <button key={tag.id} onClick={() => toggle(tag.id)} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${tag.color}`, background: active ? tag.color : "transparent", color: active ? "#fff" : tag.color, transition: "all 0.15s" }}>{tag.label}</button>; })}
      </div>
      {adding ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f7f7f5", borderRadius: 8, padding: "10px 12px", flexWrap: "wrap" }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nombre" onKeyDown={e => e.key === "Enter" && createTag()} style={{ flex: 1, minWidth: 100, border: "1.5px solid #e8e8e8", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff" }} />
          <div style={{ display: "flex", gap: 4 }}>{TAG_PALETTE.map(c => <button key={c} onClick={() => setNewColor(c)} style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: newColor === c ? "2.5px solid #1a1a1a" : "2px solid #fff", cursor: "pointer", boxShadow: "0 0 0 1px #ddd" }} />)}</div>
          <Btn onClick={createTag} style={{ padding: "6px 12px", fontSize: 12 }}>Crear</Btn>
          <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><Icon name="x" size={14} /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1.5px dashed #ddd", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}><Icon name="plus" size={12} /> Nueva etiqueta</button>
      )}
    </div>
  );
};

// ─── Subtask Modal ────────────────────────────────────────────────────────────
const SubtaskModal = ({ subtask, users, currentUser, onSave, onClose }) => {
  const [form, setForm] = useState({
    title:      subtask?.title      || "",
    assigneeId: subtask?.assigneeId || currentUser.id,
    dueDate:    subtask?.dueDate    || "",
    status:     subtask?.status     || "todo",
  });
  const valid = form.title.trim() && form.dueDate;
  return (
    <Modal title={subtask ? "Editar subtarea" : "Nueva subtarea"} onClose={onClose}>
      <Input label="Título" placeholder="Describe la subtarea..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <Select label="Asignar a" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
      <Input label="Fecha límite" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
      <Select label="Estado" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
        <option value="todo">Por hacer</option><option value="doing">En progreso</option><option value="done">Completado</option>
      </Select>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => valid && onSave(form)} disabled={!valid}>{subtask ? "Guardar" : "Crear subtarea"}</Btn>
      </div>
    </Modal>
  );
};

// ─── Task Modal ───────────────────────────────────────────────────────────────
const TaskModal = ({ task, clients, users, tags, setTags, currentUser, onSave, onClose }) => {
  const [form, setForm] = useState({
    title: task?.title || "", clientId: task?.clientId || clients[0]?.id || "",
    assigneeId: task?.assigneeId || currentUser.id, dueDate: task?.dueDate || "",
    priority: task?.priority || "medium", status: task?.status || "todo",
    tagIds: task?.tagIds || [], hours: task?.hours || "", notes: task?.notes || "",
    blockedReason: task?.blockedReason || "", subtasks: task?.subtasks || [],
  });
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [editingSubtask, setEditingSubtask]     = useState(null);

  const handleTagChange = (sel, newTag) => {
    if (newTag) { const c = { id: "tg" + Date.now(), ...newTag }; setTags(p => [...p, c]); setForm(f => ({ ...f, tagIds: [...sel, c.id] })); }
    else setForm(f => ({ ...f, tagIds: sel }));
  };
  const saveSubtask = (sf) => {
    if (editingSubtask) {
      setForm(f => ({ ...f, subtasks: f.subtasks.map(s => s.id === editingSubtask.id ? { ...s, ...sf } : s) }));
    } else {
      setForm(f => ({ ...f, subtasks: [...f.subtasks, { id: "st" + Date.now(), ...sf, createdAt: Date.now() }] }));
    }
    setEditingSubtask(null); setShowSubtaskModal(false);
  };
  const isLink = s => s && (s.startsWith("http://") || s.startsWith("https://"));
  const valid  = form.title.trim() && form.dueDate && form.clientId;
  const doneSubtasks = form.subtasks.filter(s => s.status === "done").length;

  return (
    <>
      <Modal title={task ? "Editar tarea" : "Nueva tarea"} onClose={onClose} wide>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Título" placeholder="Describe la tarea..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <Select label="Cliente" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value, tagIds: [] })}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select label="Asignar a" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Input label="Fecha límite" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          <Input label="Horas estimadas" type="number" min="0.5" max="200" step="0.5" placeholder="ej: 4" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value ? parseFloat(e.target.value) : "" })} />
          <Select label="Prioridad" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></Select>
          <Select label="Estado" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="todo">Por hacer</option><option value="doing">En progreso</option><option value="blocked">Bloqueada</option><option value="done">Completado</option>
          </Select>
          {form.status === "blocked" && (
            <div style={{ gridColumn: "1/-1" }}>
              <Input label="¿Por qué está bloqueada?" placeholder="Ej: Esperando aprobación..." value={form.blockedReason} onChange={e => setForm({ ...form, blockedReason: e.target.value })} style={{ borderColor: "#e86c4a40", background: "#fef8f7" }} />
            </div>
          )}
          <div style={{ gridColumn: "1/-1" }}><TagSelector clientId={form.clientId} tags={tags} selected={form.tagIds} onChange={handleTagChange} /></div>
          <div style={{ gridColumn: "1/-1", marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Notas o link</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Comentario o link..." style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fafafa" }} />
            {isLink(form.notes.trim()) && <div style={{ marginTop: 4, fontSize: 12, color: "#5b6af0" }}>🔗 <a href={form.notes.trim()} target="_blank" rel="noreferrer" style={{ color: "#5b6af0" }}>Abrir link</a></div>}
          </div>

          {/* Subtasks */}
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Subtareas {form.subtasks.length > 0 && <span style={{ color: "#aaa", fontWeight: 400 }}>({doneSubtasks}/{form.subtasks.length})</span>}
              </label>
              <button onClick={() => { setEditingSubtask(null); setShowSubtaskModal(true); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1.5px dashed #ddd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}><Icon name="plus" size={12} /> Agregar</button>
            </div>
            {form.subtasks.length > 0 && (
              <div style={{ background: "#f9f9f9", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                {form.subtasks.map(st => {
                  const assignee = users.find(u => u.id === st.assigneeId);
                  const s = statusMap[st.status] || statusMap.todo;
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #f0f0f0" }}>
                      <select value={st.status} onChange={e => setForm(f => ({ ...f, subtasks: f.subtasks.map(s => s.id === st.id ? { ...s, status: e.target.value } : s) }))}
                        style={{ fontSize: 11, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: s.color, fontWeight: 700, padding: 0, outline: "none" }}>
                        <option value="todo">○</option><option value="doing">◑</option><option value="done">●</option>
                      </select>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: st.status === "done" ? "line-through" : "none", color: st.status === "done" ? "#aaa" : "#1a1a1a" }}>{st.title}</span>
                      <span style={{ fontSize: 11, color: "#bbb" }}>📅 {st.dueDate}</span>
                      {assignee && <Avatar user={assignee} size={20} />}
                      <button onClick={() => { setEditingSubtask(st); setShowSubtaskModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Icon name="edit" size={12} /></button>
                      <button onClick={() => setForm(f => ({ ...f, subtasks: f.subtasks.filter(s => s.id !== st.id) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#e0e0e0", padding: 2 }}><Icon name="trash" size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => valid && onSave(form)} disabled={!valid}>{task ? "Guardar cambios" : "Crear tarea"}</Btn>
        </div>
      </Modal>
      {showSubtaskModal && <SubtaskModal subtask={editingSubtask} users={users} currentUser={currentUser} onSave={saveSubtask} onClose={() => { setEditingSubtask(null); setShowSubtaskModal(false); }} />}
    </>
  );
};

// ─── Task Row ─────────────────────────────────────────────────────────────────
const TaskRow = ({ task, clients, users, tags, onEdit, onDelete, onStatusChange, showClient = true }) => {
  const client   = clients.find(c => c.id === task.clientId);
  const assignee = users.find(u => u.id === task.assigneeId);
  const p        = priorityMap[task.priority];
  const s        = statusMap[task.status] || statusMap.todo;
  const today    = new Date().toISOString().split("T")[0];
  const overdue  = task.dueDate < today && task.status !== "done";
  const taskTags = (task.tagIds || []).map(id => tags.find(t => t.id === id)).filter(Boolean);
  const isLink   = task.notes && (task.notes.startsWith("http://") || task.notes.startsWith("https://"));
  const blocked  = task.status === "blocked";
  const subtasks = task.subtasks || [];
  const doneSubtasks = subtasks.filter(s => s.status === "done").length;

  return (
    <div style={{ borderBottom: "1px solid #f8f8f8" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            {blocked && <span title={task.blockedReason} style={{ color: "#e86c4a", display: "flex", flexShrink: 0 }}><Icon name="block" size={13} /></span>}
            {task.title}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {showClient && client && <span style={{ fontSize: 11, color: client.color, fontWeight: 600, background: client.color + "15", padding: "1px 6px", borderRadius: 4 }}>{client.name}</span>}
            {taskTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
            {task.hours ? <span style={{ fontSize: 11, fontWeight: 600, color: "#5b6af0", background: "#5b6af012", border: "1px solid #5b6af025", padding: "2px 7px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}><Icon name="clock" size={10} /> {task.hours}h</span> : null}
            {subtasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: doneSubtasks === subtasks.length ? "#3db88a" : "#888", background: doneSubtasks === subtasks.length ? "#3db88a12" : "#f0f0f0", border: `1px solid ${doneSubtasks === subtasks.length ? "#3db88a30" : "#e8e8e8"}`, padding: "2px 7px", borderRadius: 6 }}>⬜ {doneSubtasks}/{subtasks.length}</span>}
            {isLink && <a href={task.notes} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 600, color: "#5b6af0", display: "flex", alignItems: "center", gap: 3 }} onClick={e => e.stopPropagation()}><Icon name="link" size={10} /> Link</a>}
            {task.notes && !isLink && <span style={{ fontSize: 11, color: "#999" }} title={task.notes}>📝</span>}
            <span style={{ fontSize: 11, fontWeight: 600, color: overdue ? "#e86c4a" : "#555", background: overdue ? "#fef2f0" : "#f4f4f4", border: `1px solid ${overdue ? "#fbd5cd" : "#e8e8e8"}`, padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>📅 {task.dueDate}{overdue ? " ⚠️" : ""}</span>
          </div>
        </div>
        <Badge label={s.label} color={s.color} />
        {assignee && <Avatar user={assignee} size={26} />}
        <select value={task.status} onChange={e => onStatusChange(task.id, e.target.value)}
          style={{ fontSize: 12, border: "1.5px solid #efefef", borderRadius: 6, padding: "4px 8px", background: "#fafafa", cursor: "pointer", fontFamily: "inherit" }}>
          <option value="todo">Por hacer</option><option value="doing">En progreso</option><option value="blocked">Bloqueada</option><option value="done">Completado</option>
        </select>
        <button onClick={() => onEdit(task)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}><Icon name="edit" size={14} /></button>
        <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e0e0e0", padding: 4 }}><Icon name="trash" size={14} /></button>
      </div>
      {blocked && task.blockedReason && (
        <div style={{ margin: "0 18px 12px 38px", background: "#fef2f0", border: "1px solid #fbd5cd", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e86c4a", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="block" size={12} /> <strong>Bloqueada:</strong> {task.blockedReason}
        </div>
      )}
    </div>
  );
};

// ─── Activity Feed ────────────────────────────────────────────────────────────
const ActivityFeed = ({ events, users, clients, tasks, limit }) => {
  const typeIcon = { task_created: "✅", task_status: "🔄", task_blocked: "🔴", subtask_added: "⬜", meeting_created: "🗒", action_converted: "⚡", client_status: "🏢" };
  const shown = limit ? events.slice(0, limit) : events;
  if (shown.length === 0) return <p style={{ color: "#aaa", fontSize: 13, padding: "12px 0" }}>Sin actividad registrada aún.</p>;
  return (
    <div>
      {shown.map(ev => {
        const user = users.find(u => u.id === ev.userId);
        return (
          <div key={ev.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}>{typeIcon[ev.type] || "•"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: "#333" }}>
                {user && <strong style={{ color: user.color }}>{user.name}</strong>} {ev.description}
              </span>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{fmtTime(ev.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Meeting Card ─────────────────────────────────────────────────────────────
const MeetingCard = ({ meeting, clients, users, onEdit, onDelete, onConvertAction, compact }) => {
  const client = clients.find(c => c.id === meeting.clientId);
  const parts  = (meeting.participants || []).map(id => users.find(u => u.id === id)).filter(Boolean);
  const [expanded, setExpanded] = useState(false);
  const [convertingIdx, setConvertingIdx] = useState(null);
  const actionItems = (meeting.actionItems || []).map(ai => typeof ai === "string" ? { text: ai, converted: false } : ai);

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #efefef", overflow: "hidden" }}>
      <div style={{ height: 4, background: client?.color || "#5b6af0" }} />
      <div style={{ padding: compact ? "14px 16px" : "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, marginBottom: 3 }}>{meeting.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {client && <span style={{ fontSize: 11, color: client.color, fontWeight: 600, background: client.color + "15", padding: "1px 6px", borderRadius: 4 }}>{client.name}</span>}
              <span style={{ fontSize: 11, color: "#aaa" }}>📅 {meeting.date}</span>
              {parts.length > 0 && <div style={{ display: "flex", gap: 2 }}>{parts.map(u => <span key={u.id}><Avatar user={u} size={18} /></span>)}</div>}
            </div>
          </div>
          {!compact && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => onEdit(meeting)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 3 }}><Icon name="edit" size={13} /></button>
              <button onClick={() => onDelete(meeting.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e0e0e0", padding: 3 }}><Icon name="trash" size={13} /></button>
            </div>
          )}
        </div>
        {meeting.body && (
          <p style={{ margin: "8px 0", fontSize: 13, color: "#555", lineHeight: 1.6, display: expanded ? "block" : "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{meeting.body}</p>
        )}
        {!compact && actionItems.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Action items</div>
            {actionItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 10px", background: item.converted ? "#f5fdf7" : "#fafafa", borderRadius: 8, border: "1px solid", borderColor: item.converted ? "#3db88a30" : "#f0f0f0" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${item.converted ? "#3db88a" : "#ddd"}`, background: item.converted ? "#3db88a" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10 }}>{item.converted ? "✓" : ""}</div>
                <span style={{ flex: 1, fontSize: 13, color: item.converted ? "#aaa" : "#555", textDecoration: item.converted ? "line-through" : "none" }}>{item.text}</span>
                {!item.converted && convertingIdx !== i && (
                  <button onClick={() => setConvertingIdx(i)} title="Convertir en tarea" style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1.5px solid #5b6af030", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#5b6af0", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    <Icon name="convert" size={11} /> Crear tarea
                  </button>
                )}
                {convertingIdx === i && (
                  <ConvertActionModal item={item.text} clients={clients} users={users} meeting={meeting}
                    onSave={(taskData) => { onConvertAction(meeting.id, i, taskData); setConvertingIdx(null); }}
                    onClose={() => setConvertingIdx(null)} />
                )}
                {item.converted && <span style={{ fontSize: 11, color: "#3db88a", fontWeight: 600 }}>✓ Creada</span>}
              </div>
            ))}
          </div>
        )}
        {!compact && (meeting.body?.length > 100 || actionItems.length > 2) && (
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#5b6af0", padding: "4px 0", fontFamily: "inherit", fontWeight: 600 }}>{expanded ? "Ver menos" : "Ver más"}</button>
        )}
      </div>
    </div>
  );
};

// ─── Convert Action Modal ─────────────────────────────────────────────────────
const ConvertActionModal = ({ item, clients, users, meeting, onSave, onClose }) => {
  const [form, setForm] = useState({ title: item, clientId: meeting.clientId, assigneeId: users[0]?.id || "", dueDate: "", priority: "medium" });
  const valid = form.title.trim() && form.dueDate;
  return (
    <Modal title="Convertir en tarea" onClose={onClose}>
      <p style={{ fontSize: 13, color: "#888", marginTop: 0 }}>Se creará una tarea a partir de este action item.</p>
      <Input label="Título" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <Select label="Cliente" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Select label="Asignar a" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
      <Input label="Fecha límite" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
      <Select label="Prioridad" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></Select>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => valid && onSave(form)} disabled={!valid}>Crear tarea</Btn>
      </div>
    </Modal>
  );
};

// ─── Meeting Modal ────────────────────────────────────────────────────────────
const MeetingModal = ({ meeting, clients, users, onSave, onClose }) => {
  const today = new Date().toISOString().split("T")[0];
  const normalizeItems = (items) => (items || []).map(ai => typeof ai === "string" ? { text: ai, converted: false } : ai);
  const [form, setForm] = useState({
    title: meeting?.title || "", clientId: meeting?.clientId || clients[0]?.id || "",
    date: meeting?.date || today, participants: meeting?.participants || [],
    body: meeting?.body || "", actionItems: normalizeItems(meeting?.actionItems) || [{ text: "", converted: false }],
  });
  const toggleP = (id) => setForm(f => ({ ...f, participants: f.participants.includes(id) ? f.participants.filter(x => x !== id) : [...f.participants, id] }));
  const updateAction = (i, val) => { const a = [...form.actionItems]; a[i] = { ...a[i], text: val }; setForm(f => ({ ...f, actionItems: a })); };
  const valid = form.title.trim() && form.date && form.clientId;
  return (
    <Modal title={meeting ? "Editar reunión" : "Nueva reunión"} onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <div style={{ gridColumn: "1/-1" }}><Input label="Título" placeholder="Ej: Kick-off identidad visual" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <Select label="Cliente" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Input label="Fecha" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Participantes</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {users.map(u => { const active = form.participants.includes(u.id); return <button key={u.id} onClick={() => toggleP(u.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${active ? u.color : "#e8e8e8"}`, background: active ? u.color + "15" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? u.color : "#888", transition: "all 0.15s" }}><Avatar user={u} size={20} />{u.name}</button>; })}
        </div>
      </div>
      <Textarea label="Notas de la reunión" rows={4} placeholder="Decisiones, comentarios, ideas..." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Action items</label>
        {form.actionItems.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid #ddd", flexShrink: 0 }} />
            <input value={item.text} onChange={e => updateAction(i, e.target.value)} placeholder={`Acción ${i + 1}...`}
              style={{ flex: 1, border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fafafa" }}
              onFocus={e => e.target.style.borderColor = "#5b6af0"} onBlur={e => e.target.style.borderColor = "#e8e8e8"} />
            {form.actionItems.length > 1 && <button onClick={() => setForm(f => ({ ...f, actionItems: f.actionItems.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: 2 }}><Icon name="x" size={14} /></button>}
          </div>
        ))}
        <button onClick={() => setForm(f => ({ ...f, actionItems: [...f.actionItems, { text: "", converted: false }] }))} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1.5px dashed #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
          <Icon name="plus" size={12} /> Agregar acción
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => valid && onSave({ ...form, actionItems: form.actionItems.filter(a => a.text.trim()) })} disabled={!valid}>{meeting ? "Guardar" : "Crear reunión"}</Btn>
      </div>
    </Modal>
  );
};

// ─── Login ────────────────────────────────────────────────────────────────────
const LoginScreen = ({ users, onLogin }) => {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  const handle = () => { const u = users.find(u => u.email === email && u.password === password); if (u) onLogin(u); else setError("Email o contraseña incorrectos"); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f5", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(0,0,0,0.07)" }}>
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, background: "#1a1a1a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff", fontSize: 22, fontWeight: 700 }}>T</div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#1a1a1a" }}>TeamFlow</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888", fontFamily: "'DM Sans', sans-serif" }}>Workspace para equipos creativos</p>
        </div>
        <Input label="Email" type="email" placeholder="franco@nistaestudio.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
        <Input label="Contraseña" type="password" placeholder="••••••" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
        {error && <p style={{ color: "#e86c4a", fontSize: 13, margin: "-8px 0 12px" }}>{error}</p>}
        <Btn onClick={handle} style={{ width: "100%", padding: "12px", fontSize: 14, marginTop: 4 }}>Ingresar</Btn>
        <div style={{ marginTop: 24, padding: 16, background: "#f7f7f5", borderRadius: 10 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>Cuentas de prueba</p>
          {users.map(u => <p key={u.id} style={{ margin: "3px 0", fontSize: 12, color: "#555", fontFamily: "'DM Sans', sans-serif" }}>{u.email} / {u.password}</p>)}
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ tasks, setTasks, clients, users, tags, setTags, meetings, activity, setActiveSection, currentUser }) => {
  const today     = new Date().toISOString().split("T")[0];
  const overdue   = tasks.filter(t => t.dueDate < today && t.status !== "done");
  const doneCount = tasks.filter(t => t.status === "done").length;
  const blocked   = tasks.filter(t => t.status === "blocked");
  const progress  = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const [editingTask, setEditingTask] = useState(null);
  const [tagFilter, setTagFilter]     = useState("all");

  const pendingTasks = tasks
    .filter(t => t.status !== "done")
    .filter(t => tagFilter === "all" || (t.tagIds || []).includes(tagFilter))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const recentMeetings = [...meetings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const recentActivity = [...activity].sort((a, b) => b.timestamp - a.timestamp);

  const getDaysLabel = (d) => {
    const diff = Math.ceil((new Date(d) - new Date(today)) / 86400000);
    if (diff < 0)   return { text: `Venció hace ${Math.abs(diff)}d`, color: "#e86c4a", bg: "#fef2f0" };
    if (diff === 0) return { text: "Vence hoy",    color: "#e86c4a", bg: "#fef2f0" };
    if (diff === 1) return { text: "Vence mañana", color: "#f0a030", bg: "#fff8ee" };
    if (diff <= 7)  return { text: `En ${diff}d`,  color: "#f0a030", bg: "#fff8ee" };
    return { text: `En ${diff}d`, color: "#aaa", bg: "#f5f5f5" };
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Buen día, {currentUser.name} 👋</h2>
      <p style={{ margin: "0 0 28px", color: "#888", fontSize: 14 }}>Aquí está el resumen del equipo.</p>

      <div className="tf-stats">
        {[
          { label: "Clientes",    value: clients.filter(c => c.status !== "closed").length, color: "#5b6af0" },
          { label: "Tareas",      value: tasks.length,   color: "#e86c4a" },
          { label: "Completadas", value: doneCount,       color: "#3db88a" },
          { label: "Bloqueadas",  value: blocked.length,  color: "#e86c4a" },
          { label: "Vencidas",    value: overdue.length,  color: "#f0a030" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1.5px solid #efefef" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tf-2col">
        {/* Tasks */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 12px", borderBottom: "1.5px solid #f5f5f5" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tareas por vencer</h3>
              <span style={{ fontSize: 12, color: "#aaa" }}>{pendingTasks.length} pendientes</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setTagFilter("all")} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "1.5px solid", borderColor: tagFilter === "all" ? "#1a1a1a" : "#e8e8e8", background: tagFilter === "all" ? "#1a1a1a" : "transparent", color: tagFilter === "all" ? "#fff" : "#888", cursor: "pointer", fontFamily: "inherit" }}>Todas</button>
              {tags.map(tag => <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? "all" : tag.id)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1.5px solid ${tag.color}`, background: tagFilter === tag.id ? tag.color : "transparent", color: tagFilter === tag.id ? "#fff" : tag.color, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{tag.label}</button>)}
            </div>
          </div>
          {pendingTasks.length === 0 && <p style={{ color: "#aaa", fontSize: 13, padding: 20 }}>¡Sin tareas pendientes! 🎉</p>}
          {pendingTasks.slice(0, 6).map(t => {
            const client   = clients.find(c => c.id === t.clientId);
            const assignee = users.find(u => u.id === t.assigneeId);
            const p        = priorityMap[t.priority];
            const dl       = getDaysLabel(t.dueDate);
            const taskTags = (t.tagIds || []).map(id => tags.find(tg => tg.id === id)).filter(Boolean);
            const isBlocked = t.status === "blocked";
            const sub = (t.subtasks || []); const doneSub = sub.filter(s => s.status === "done").length;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid #f8f8f8", background: isBlocked ? "#fff8f7" : "transparent" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isBlocked ? "#e86c4a" : p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                    {isBlocked && <Icon name="block" size={12} />}
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                    {client && <span style={{ fontSize: 11, color: client.color, fontWeight: 600, background: client.color + "15", padding: "1px 5px", borderRadius: 4 }}>{client.name}</span>}
                    {taskTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
                    {sub.length > 0 && <span style={{ fontSize: 11, color: "#aaa" }}>⬜ {doneSub}/{sub.length}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: dl.color, background: dl.bg, padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 }}>{dl.text}</span>
                <Avatar user={assignee} size={26} />
                <button onClick={() => setEditingTask(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: 2 }}><Icon name="edit" size={13} /></button>
              </div>
            );
          })}
        </div>

        {/* Team progress */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1.5px solid #efefef" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Progreso del equipo</h3>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#555" }}>
              <span>Global</span><span style={{ fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #5b6af0, #3db88a)", borderRadius: 4, transition: "width 0.6s" }} />
            </div>
          </div>
          {users.map(u => {
            const uTasks   = tasks.filter(t => t.assigneeId === u.id);
            const uDone    = uTasks.filter(t => t.status === "done").length;
            const uBlocked = uTasks.filter(t => t.status === "blocked").length;
            const uProg    = uTasks.length ? Math.round((uDone / uTasks.length) * 100) : 0;
            const uOverdue = uTasks.filter(t => t.dueDate < today && t.status !== "done").length;
            return (
              <div key={u.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Avatar user={u} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                      <span>{u.name}</span><span style={{ color: "#aaa", fontWeight: 500 }}>{uDone}/{uTasks.length}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {uOverdue > 0 && <span style={{ fontSize: 10, color: "#f0a030", fontWeight: 600 }}>⚠️ {uOverdue}v</span>}
                      {uBlocked > 0 && <span style={{ fontSize: 10, color: "#e86c4a", fontWeight: 600 }}>🔴 {uBlocked}b</span>}
                    </div>
                  </div>
                </div>
                <div style={{ height: 4, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginLeft: 36 }}>
                  <div style={{ height: "100%", width: `${uProg}%`, background: u.color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly workload */}
      {(() => {
        const { monday, sunday } = getWeekBounds(0);
        const mStr = toYMD(monday); const sStr = toYMD(sunday);
        const wt = tasks.filter(t => t.dueDate >= mStr && t.dueDate <= sStr && t.status !== "done");
        const total = wt.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
        const lc = (h) => h === 0 ? "#f0f0f0" : h <= 24 ? "#3db88a" : h <= 35 ? "#f0a030" : "#e86c4a";
        const fmt = (d) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
        if (wt.length === 0) return null;
        return (
          <div style={{ marginTop: 20, background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1.5px solid #f5f5f5" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Carga esta semana</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#aaa" }}>{fmt(monday)} – {fmt(sunday)} · {wt.length} tareas · {total}h totales</p>
            </div>
            <div className="tf-week-summary">
              {users.map(u => {
                const uH = wt.filter(t => t.assigneeId === u.id).reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
                const uC = wt.filter(t => t.assigneeId === u.id).length;
                const col = lc(uH); const pct = Math.min((uH / 40) * 100, 100);
                return (
                  <div key={u.id} style={{ padding: "14px 20px", borderRight: "1px solid #f5f5f5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Avatar user={u} size={22} /><span style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                      <span style={{ color: "#aaa" }}>{uC} tarea{uC !== 1 ? "s" : ""}</span>
                      <span style={{ fontWeight: 700, color: col }}>{uH}h</span>
                    </div>
                    <div style={{ height: 5, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 4, transition: "width 0.5s" }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Bottom row: meetings + activity */}
      <div className="tf-bottom-row">
        {recentMeetings.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Últimas reuniones</h3>
              <button onClick={() => setActiveSection("meetings")} style={{ background: "none", border: "none", fontSize: 12, color: "#5b6af0", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Ver todas →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentMeetings.map(m => <MeetingCard key={m.id} meeting={m} clients={clients} users={users} onEdit={() => {}} onDelete={() => {}} onConvertAction={() => {}} compact />)}
            </div>
          </div>
        )}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Actividad reciente</h3>
            <button onClick={() => setActiveSection("activity")} style={{ background: "none", border: "none", fontSize: 12, color: "#5b6af0", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Ver todo →</button>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: "4px 18px", border: "1.5px solid #efefef" }}>
            <ActivityFeed events={recentActivity} users={users} clients={clients} tasks={tasks} limit={6} />
          </div>
        </div>
      </div>

      {editingTask && (
        <TaskModal task={editingTask} clients={clients} users={users} tags={tags} setTags={setTags} currentUser={currentUser}
          onSave={form => { setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...form } : t)); setEditingTask(null); }}
          onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
};

// ─── Activity View ─────────────────────────────────────────────────────────────
const ActivityView = ({ activity, users, clients, tasks }) => {
  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Actividad</h2>
      <p style={{ margin: "0 0 24px", color: "#888", fontSize: 14 }}>Historial completo de cambios del equipo.</p>
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", padding: "8px 24px" }}>
        <ActivityFeed events={sorted} users={users} clients={clients} tasks={tasks} />
      </div>
    </div>
  );
};

// ─── Clients View ─────────────────────────────────────────────────────────────
const ClientsView = ({ clients, setClients, tasks, pages, meetings, setActiveSection, setSelectedClient }) => {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState({ name: "", industry: "", since: new Date().getFullYear(), status: "active" });
  const colors = ["#5b6af0","#e86c4a","#3db88a","#f0a030","#a855f7","#ec4899"];
  const addClient = () => {
    if (!form.name.trim()) return;
    const initials = form.name.split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");
    setClients([...clients, { id: "c" + Date.now(), name: form.name, industry: form.industry, color: colors[clients.length % colors.length], initials, logo: null, status: form.status, since: parseInt(form.since) }]);
    setForm({ name: "", industry: "", since: new Date().getFullYear(), status: "active" }); setShowModal(false);
  };
  const filtered = statusFilter === "all" ? clients : clients.filter(c => (c.status || "active") === statusFilter);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div><h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Clientes</h2><p style={{ margin: 0, color: "#888", fontSize: 14 }}>{clients.length} clientes en total</p></div>
        <Btn onClick={() => setShowModal(true)}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nuevo cliente</span></Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["all","Todos"],["active","Activos"],["paused","En pausa"],["closed","Cerrados"]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid", borderColor: statusFilter === val ? "#1a1a1a" : "#e8e8e8", background: statusFilter === val ? "#1a1a1a" : "#fff", color: statusFilter === val ? "#fff" : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{label}</button>
        ))}
      </div>
      <div className="tf-client-grid">
        {filtered.map(c => {
          const cTasks = tasks.filter(t => t.clientId === c.id);
          const cPages = pages.filter(p => p.clientId === c.id);
          const cMtgs  = meetings.filter(m => m.clientId === c.id);
          const done   = cTasks.filter(t => t.status === "done").length;
          const cs     = clientStatusMap[c.status || "active"];
          return (
            <div key={c.id} onClick={() => { setSelectedClient(c); setActiveSection("client-detail"); }}
              style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s", opacity: c.status === "closed" ? 0.65 : 1 }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ height: 6, background: c.color }} />
              <div style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <ClientAvatar client={c} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{c.industry}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: cs.color, background: cs.color + "15", padding: "2px 8px", borderRadius: 20 }}>{cs.label}</span>
                  {c.since && <span style={{ fontSize: 11, color: "#bbb" }}>desde {c.since}</span>}
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                  <span>📋 {cTasks.length}</span><span>✅ {done}</span><span>🗒 {cMtgs.length}</span><span>📄 {cPages.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showModal && (
        <Modal title="Nuevo cliente" onClose={() => setShowModal(false)}>
          <Input label="Nombre del cliente" placeholder="Ej: Arcadia Studio" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Industria / Rubro" placeholder="Ej: Arquitectura, Marketing..." value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Input label="Desde (año)" type="number" min="2000" max="2030" value={form.since} onChange={e => setForm({ ...form, since: e.target.value })} />
            <Select label="Estado" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Activo</option><option value="paused">En pausa</option><option value="closed">Cerrado</option>
            </Select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={addClient}>Crear cliente</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Client Detail ────────────────────────────────────────────────────────────
const ClientDetail = ({ client, clients, setClients, tasks, setTasks, pages, setPages, meetings, setMeetings, tags, setTags, users, currentUser, onBack, addActivity }) => {
  const [tab, setTab]                 = useState("tasks");
  const [editingTask, setEditingTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [showPageModal, setShowPageModal]   = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting]     = useState(null);
  const [showEditClient, setShowEditClient]     = useState(false);
  const [pageForm, setPageForm]       = useState({ title: "", content: "" });
  const [tagFilter, setTagFilter]     = useState("all");
  const [clientForm, setClientForm]   = useState(null);

  const liveClient = clients.find(c => c.id === client.id) || client;
  const cTasks    = tasks.filter(t => t.clientId === client.id);
  const cPages    = pages.filter(p => p.clientId === client.id);
  const cMeetings = [...meetings.filter(m => m.clientId === client.id)].sort((a, b) => b.date.localeCompare(a.date));
  const cTags     = tags.filter(t => t.clientId === client.id);
  const filtered  = tagFilter === "all" ? cTasks : cTasks.filter(t => (t.tagIds || []).includes(tagFilter));
  const cs        = clientStatusMap[liveClient.status || "active"];

  const updateLogo = (logo) => setClients(p => p.map(c => c.id === client.id ? { ...c, logo } : c));
  const saveTask = (form) => {
    if (editingTask) { setTasks(p => p.map(t => t.id === editingTask.id ? { ...t, ...form } : t)); addActivity(createEvent("task_status", `editó la tarea "${form.title}"`, currentUser.id)); }
    else { setTasks(p => [...p, { id: "t" + Date.now(), clientId: client.id, ...form, createdAt: Date.now() }]); addActivity(createEvent("task_created", `creó la tarea "${form.title}" en ${liveClient.name}`, currentUser.id)); }
    setEditingTask(null); setShowNewTask(false);
  };
  const saveMeeting = (form) => {
    if (editingMeeting) setMeetings(p => p.map(m => m.id === editingMeeting.id ? { ...m, ...form } : m));
    else { setMeetings(p => [...p, { id: "m" + Date.now(), clientId: client.id, ...form, createdAt: Date.now() }]); addActivity(createEvent("meeting_created", `registró la reunión "${form.title}" con ${liveClient.name}`, currentUser.id)); }
    setEditingMeeting(null); setShowMeetingModal(false);
  };
  const convertAction = (meetingId, itemIdx, taskData) => {
    setMeetings(p => p.map(m => m.id === meetingId ? { ...m, actionItems: m.actionItems.map((ai, i) => i === itemIdx ? { ...ai, converted: true } : ai) } : m));
    const newTask = { id: "t" + Date.now(), ...taskData, tagIds: [], hours: "", notes: "", blockedReason: "", subtasks: [], status: "todo", createdAt: Date.now() };
    setTasks(p => [...p, newTask]);
    addActivity(createEvent("action_converted", `convirtió un action item en tarea: "${taskData.title}"`, currentUser.id));
  };
  const savePage = () => {
    if (!pageForm.title.trim()) return;
    if (editingPage) setPages(pages.map(p => p.id === editingPage.id ? { ...p, ...pageForm } : p));
    else setPages([...pages, { id: "p" + Date.now(), clientId: client.id, ...pageForm, createdAt: Date.now() }]);
    setPageForm({ title: "", content: "" }); setEditingPage(null); setShowPageModal(false);
  };

  const tabList = [{ id: "tasks", label: "Tareas", count: cTasks.length }, { id: "meetings", label: "Reuniones", count: cMeetings.length }, { id: "pages", label: "Páginas", count: cPages.length }];

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, marginBottom: 20, padding: 0, fontFamily: "inherit" }}>← Volver a clientes</button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
        <LogoUploader client={liveClient} onUpload={updateLogo} />
        <div style={{ flex: 1, paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{liveClient.name}</h2>
            <span style={{ fontSize: 11, fontWeight: 600, color: cs.color, background: cs.color + "15", padding: "2px 10px", borderRadius: 20 }}>{cs.label}</span>
            {liveClient.since && <span style={{ fontSize: 12, color: "#bbb" }}>desde {liveClient.since}</span>}
          </div>
          <p style={{ margin: "0 0 10px", color: "#aaa", fontSize: 13 }}>{liveClient.industry}</p>
          <button onClick={() => { setClientForm({ status: liveClient.status || "active", since: liveClient.since || new Date().getFullYear() }); setShowEditClient(true); }}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1.5px solid #efefef", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon name="edit" size={12} /> Editar estado
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1.5px solid #efefef", marginBottom: 24 }}>
        {tabList.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#1a1a1a" : "#aaa", borderBottom: tab === t.id ? "2px solid #1a1a1a" : "2px solid transparent", marginBottom: -1.5, fontFamily: "inherit" }}>{t.label} <span style={{ fontSize: 11, color: "#ccc" }}>{t.count}</span></button>)}
      </div>

      {tab === "tasks" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setTagFilter("all")} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1.5px solid", borderColor: tagFilter === "all" ? "#1a1a1a" : "#e8e8e8", background: tagFilter === "all" ? "#1a1a1a" : "transparent", color: tagFilter === "all" ? "#fff" : "#888", cursor: "pointer", fontFamily: "inherit" }}>Todas</button>
              {cTags.map(tag => <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? "all" : tag.id)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${tag.color}`, background: tagFilter === tag.id ? tag.color : "transparent", color: tagFilter === tag.id ? "#fff" : tag.color, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{tag.label}</button>)}
            </div>
            <Btn onClick={() => { setEditingTask(null); setShowNewTask(true); }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nueva tarea</span></Btn>
          </div>
          {["todo","doing","blocked","done"].map(status => {
            const group = filtered.filter(t => t.status === status); if (!group.length) return null;
            const s = statusMap[status];
            return (
              <div key={status} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} /><span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span><span style={{ fontSize: 11, color: "#ccc" }}>{group.length}</span></div>
                <div style={{ background: "#fff", borderRadius: 10, border: "1.5px solid #efefef", overflow: "hidden" }}>
                  {group.map(t => <TaskRow key={t.id} task={t} clients={[liveClient]} users={users} tags={tags} showClient={false}
                    onEdit={t => { setEditingTask(t); setShowNewTask(true); }}
                    onDelete={id => { setTasks(tasks.filter(t => t.id !== id)); addActivity(createEvent("task_status", `eliminó una tarea en ${liveClient.name}`, currentUser.id)); }}
                    onStatusChange={(id, st) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: st } : t)); addActivity(createEvent("task_status", `cambió el estado de "${tasks.find(t=>t.id===id)?.title}" a ${statusMap[st]?.label}`, currentUser.id)); }} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "meetings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => { setEditingMeeting(null); setShowMeetingModal(true); }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nueva reunión</span></Btn>
          </div>
          {cMeetings.length === 0 && <p style={{ color: "#aaa", fontSize: 14 }}>Sin reuniones registradas.</p>}
          <div className="tf-meeting-grid" style={{ gap: 14 }}>
            {cMeetings.map(m => <MeetingCard key={m.id} meeting={m} clients={[liveClient]} users={users}
              onEdit={m => { setEditingMeeting(m); setShowMeetingModal(true); }}
              onDelete={id => setMeetings(meetings.filter(m => m.id !== id))}
              onConvertAction={convertAction} />)}
          </div>
        </div>
      )}

      {tab === "pages" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => { setEditingPage(null); setPageForm({ title: "", content: "" }); setShowPageModal(true); }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nueva página</span></Btn>
          </div>
          {cPages.length === 0 && <p style={{ color: "#aaa", fontSize: 14 }}>Sin páginas aún.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {cPages.map(p => (
              <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1.5px solid #efefef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>📄 {p.title}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setEditingPage(p); setPageForm({ title: p.title, content: p.content }); setShowPageModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Icon name="edit" size={13} /></button>
                    <button onClick={() => setPages(pages.filter(pg => pg.id !== p.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}><Icon name="trash" size={13} /></button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#aaa", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content || "Sin contenido..."}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditClient && clientForm && (
        <Modal title="Editar estado del cliente" onClose={() => setShowEditClient(false)}>
          <Select label="Estado" value={clientForm.status} onChange={e => setClientForm({ ...clientForm, status: e.target.value })}>
            <option value="active">Activo</option><option value="paused">En pausa</option><option value="closed">Cerrado</option>
          </Select>
          <Input label="Desde (año)" type="number" min="2000" max="2030" value={clientForm.since} onChange={e => setClientForm({ ...clientForm, since: parseInt(e.target.value) })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowEditClient(false)}>Cancelar</Btn>
            <Btn onClick={() => { setClients(p => p.map(c => c.id === client.id ? { ...c, ...clientForm } : c)); addActivity(createEvent("client_status", `actualizó el estado de ${liveClient.name} a ${clientStatusMap[clientForm.status]?.label}`, currentUser.id)); setShowEditClient(false); }}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {(showNewTask || editingTask) && <TaskModal task={editingTask} clients={[liveClient]} users={users} tags={tags} setTags={setTags} currentUser={currentUser} onSave={saveTask} onClose={() => { setEditingTask(null); setShowNewTask(false); }} />}
      {(showMeetingModal || editingMeeting) && <MeetingModal meeting={editingMeeting} clients={[liveClient]} users={users} currentUser={currentUser} onSave={saveMeeting} onClose={() => { setEditingMeeting(null); setShowMeetingModal(false); }} />}
      {showPageModal && (
        <Modal title={editingPage ? "Editar página" : "Nueva página"} onClose={() => setShowPageModal(false)}>
          <Input label="Título" value={pageForm.title} onChange={e => setPageForm({ ...pageForm, title: e.target.value })} />
          <Textarea label="Contenido" rows={6} value={pageForm.content} onChange={e => setPageForm({ ...pageForm, content: e.target.value })} placeholder="Escribí el contenido..." />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn variant="secondary" onClick={() => setShowPageModal(false)}>Cancelar</Btn><Btn onClick={savePage}>{editingPage ? "Guardar" : "Crear"}</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── Tasks View ───────────────────────────────────────────────────────────────
const TasksView = ({ tasks, setTasks, clients, users, tags, setTags, currentUser, addActivity }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter]       = useState("all");
  const [editingTask, setEditingTask]   = useState(null);
  const [showNewTask, setShowNewTask]   = useState(false);
  const filtered = tasks
    .filter(t => statusFilter === "all" ? true : statusFilter === "mine" ? t.assigneeId === currentUser.id : t.status === statusFilter)
    .filter(t => tagFilter === "all" || (t.tagIds || []).includes(tagFilter));
  const saveTask = (form) => {
    if (editingTask) { setTasks(p => p.map(t => t.id === editingTask.id ? { ...t, ...form } : t)); addActivity(createEvent("task_status", `editó la tarea "${form.title}"`, currentUser.id)); }
    else { setTasks(p => [...p, { id: "t" + Date.now(), ...form, createdAt: Date.now() }]); addActivity(createEvent("task_created", `creó la tarea "${form.title}"`, currentUser.id)); }
    setEditingTask(null); setShowNewTask(false);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Tareas</h2><p style={{ margin: 0, color: "#888", fontSize: 14 }}>{tasks.length} tareas en total</p></div>
        <Btn onClick={() => { setEditingTask(null); setShowNewTask(true); }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nueva tarea</span></Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["all","Todas"],["mine","Mis tareas"],["todo","Por hacer"],["doing","En progreso"],["blocked","Bloqueadas"],["done","Completadas"]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid", borderColor: statusFilter === val ? (val === "blocked" ? "#e86c4a" : "#1a1a1a") : "#e8e8e8", background: statusFilter === val ? (val === "blocked" ? "#e86c4a" : "#1a1a1a") : "#fff", color: statusFilter === val ? "#fff" : val === "blocked" ? "#e86c4a" : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{label}</button>
        ))}
      </div>
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Etiqueta:</span>
          <button onClick={() => setTagFilter("all")} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "1.5px solid", borderColor: tagFilter === "all" ? "#1a1a1a" : "#e8e8e8", background: tagFilter === "all" ? "#1a1a1a" : "transparent", color: tagFilter === "all" ? "#fff" : "#888", cursor: "pointer", fontFamily: "inherit" }}>Todas</button>
          {tags.map(tag => <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? "all" : tag.id)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1.5px solid ${tag.color}`, background: tagFilter === tag.id ? tag.color : "transparent", color: tagFilter === tag.id ? "#fff" : tag.color, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>{tag.label}</button>)}
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", overflow: "hidden" }}>
        {filtered.length === 0 && <p style={{ padding: 24, color: "#aaa", fontSize: 14 }}>Sin tareas para este filtro.</p>}
        {filtered.map(t => <TaskRow key={t.id} task={t} clients={clients} users={users} tags={tags}
          onEdit={t => { setEditingTask(t); setShowNewTask(true); }}
          onDelete={id => { setTasks(tasks.filter(t => t.id !== id)); addActivity(createEvent("task_status", `eliminó una tarea`, currentUser.id)); }}
          onStatusChange={(id, st) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: st } : t)); addActivity(createEvent("task_status", `cambió el estado de "${tasks.find(t=>t.id===id)?.title}" a ${statusMap[st]?.label}`, currentUser.id)); }} />)}
      </div>
      {(showNewTask || editingTask) && <TaskModal task={editingTask} clients={clients} users={users} tags={tags} setTags={setTags} currentUser={currentUser} onSave={saveTask} onClose={() => { setEditingTask(null); setShowNewTask(false); }} />}
    </div>
  );
};

// ─── Meetings View ────────────────────────────────────────────────────────────
const MeetingsView = ({ meetings, setMeetings, clients, users, tasks, setTasks, currentUser, addActivity }) => {
  const [showModal, setShowModal]           = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [clientFilter, setClientFilter]     = useState("all");
  const filtered = (clientFilter === "all" ? meetings : meetings.filter(m => m.clientId === clientFilter));
  const sorted   = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const saveMeeting = (form) => {
    if (editingMeeting) setMeetings(p => p.map(m => m.id === editingMeeting.id ? { ...m, ...form } : m));
    else { setMeetings(p => [...p, { id: "m" + Date.now(), ...form, createdAt: Date.now() }]); addActivity(createEvent("meeting_created", `registró la reunión "${form.title}"`, currentUser.id)); }
    setEditingMeeting(null); setShowModal(false);
  };
  const convertAction = (meetingId, itemIdx, taskData) => {
    setMeetings(p => p.map(m => m.id === meetingId ? { ...m, actionItems: m.actionItems.map((ai, i) => i === itemIdx ? { ...ai, converted: true } : ai) } : m));
    setTasks(p => [...p, { id: "t" + Date.now(), ...taskData, tagIds: [], hours: "", notes: "", blockedReason: "", subtasks: [], status: "todo", createdAt: Date.now() }]);
    addActivity(createEvent("action_converted", `convirtió un action item en tarea: "${taskData.title}"`, currentUser.id));
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div><h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Meeting Notes</h2><p style={{ margin: 0, color: "#888", fontSize: 14 }}>{meetings.length} reuniones registradas</p></div>
        <Btn onClick={() => { setEditingMeeting(null); setShowModal(true); }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={14} /> Nueva reunión</span></Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => setClientFilter("all")} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid", borderColor: clientFilter === "all" ? "#1a1a1a" : "#e8e8e8", background: clientFilter === "all" ? "#1a1a1a" : "#fff", color: clientFilter === "all" ? "#fff" : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Todos</button>
        {clients.map(c => <button key={c.id} onClick={() => setClientFilter(clientFilter === c.id ? "all" : c.id)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${clientFilter === c.id ? c.color : "#e8e8e8"}`, background: clientFilter === c.id ? c.color + "15" : "#fff", color: clientFilter === c.id ? c.color : "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: clientFilter === c.id ? 700 : 500, transition: "all 0.15s" }}>{c.name}</button>)}
      </div>
      {sorted.length === 0 && <p style={{ color: "#aaa", fontSize: 14 }}>Sin reuniones registradas.</p>}
      <div className="tf-meeting-grid">
        {sorted.map(m => <MeetingCard key={m.id} meeting={m} clients={clients} users={users}
          onEdit={m => { setEditingMeeting(m); setShowModal(true); }}
          onDelete={id => setMeetings(p => p.filter(m => m.id !== id))}
          onConvertAction={convertAction} />)}
      </div>
      {(showModal || editingMeeting) && <MeetingModal meeting={editingMeeting} clients={clients} users={users} currentUser={currentUser} onSave={saveMeeting} onClose={() => { setEditingMeeting(null); setShowModal(false); }} />}
    </div>
  );
};

// ─── Workload View ────────────────────────────────────────────────────────────
const WorkloadView = ({ tasks, users, clients }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const { monday, sunday } = getWeekBounds(weekOffset);
  const mStr = toYMD(monday); const sStr = toYMD(sunday);
  const fmt = (d) => d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const dayLabels = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return { label: d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }), date: toYMD(d) }; });
  const weekTasks = tasks.filter(t => t.dueDate >= mStr && t.dueDate <= sStr && t.status !== "done");
  const lc = (h) => h === 0 ? "#f0f0f0" : h <= 24 ? "#3db88a" : h <= 35 ? "#f0a030" : "#e86c4a";
  const userStats = users.map(u => {
    const uT = weekTasks.filter(t => t.assigneeId === u.id);
    const tot = uT.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);
    const byDay = dayLabels.map(dl => ({ ...dl, hours: weekTasks.filter(t => t.assigneeId === u.id && t.dueDate === dl.date).reduce((s, t) => s + (parseFloat(t.hours) || 0), 0) }));
    return { user: u, tasks: uT, totalHours: tot, avgPerDay: tot / 5, byDay };
  });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div><h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Carga del equipo</h2><p style={{ margin: 0, color: "#888", fontSize: 14 }}>Horas estimadas por semana</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: "#fff", border: "1.5px solid #efefef", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex" }}><Icon name="chevL" size={16} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 140, textAlign: "center" }}>{fmt(monday)} – {fmt(sunday)}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: "#fff", border: "1.5px solid #efefef", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex" }}><Icon name="chevR" size={16} /></button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} style={{ background: "none", border: "none", fontSize: 12, color: "#5b6af0", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Hoy</button>}
        </div>
      </div>
      <div className="tf-workload-cards">
        {userStats.map(({ user, totalHours, avgPerDay, tasks: uT }) => {
          const col = lc(totalHours); const pct = Math.min((totalHours / 40) * 100, 100);
          return (
            <div key={user.id} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1.5px solid #efefef" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><Avatar user={user} size={32} /><div><div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div><div style={{ fontSize: 11, color: "#aaa" }}>{uT.length} tareas</div></div></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}><span style={{ color: "#888" }}>Total semana</span><span style={{ fontWeight: 700, color: col }}>{totalHours}h</span></div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}><div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 4, transition: "width 0.5s" }} /></div>
              <div style={{ fontSize: 11, color: "#aaa" }}>~{avgPerDay.toFixed(1)}h/día</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #efefef", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1.5px solid #f5f5f5" }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Distribución diaria</h3></div>
        <div className="tf-workload-heatmap" style={{ padding: "10px 22px 0", borderBottom: "1px solid #f5f5f5" }}>
          <div />
          {dayLabels.map(dl => <div key={dl.date} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: dl.date === toYMD(new Date()) ? "#5b6af0" : "#aaa", paddingBottom: 8, borderBottom: dl.date === toYMD(new Date()) ? "2px solid #5b6af0" : "2px solid transparent" }}>{dl.label}</div>)}
        </div>
        {userStats.map(({ user, byDay }) => (
          <div key={user.id} className="tf-workload-heatmap" style={{ padding: "10px 22px", borderBottom: "1px solid #f8f8f8", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar user={user} size={26} /><span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span></div>
            {byDay.map(dl => { const col = lc(dl.hours); const dt = weekTasks.filter(t => t.assigneeId === user.id && t.dueDate === dl.date); return (
              <div key={dl.date} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 2px" }}>
                {dl.hours > 0
                  ? <div title={dt.map(t => `${t.title} (${t.hours||0}h)`).join("\n")} style={{ width: 36, height: 36, borderRadius: 8, background: col+"25", border: `1.5px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: col }}>{dl.hours}h</div>
                  : <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f8f8f8", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#ddd" }}>—</span></div>}
              </div>
            ); })}
          </div>
        ))}
        <div style={{ display: "flex", gap: 16, padding: "12px 22px", borderTop: "1px solid #f5f5f5", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Carga:</span>
          {[["#3db88a","≤24h"],["#f0a030","25–35h"],["#e86c4a",">35h"]].map(([c,l]) => <div key={c} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}><div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}</div>)}
        </div>
      </div>
    </div>
  );
};

// ─── Calendar ─────────────────────────────────────────────────────────────────
const CalendarView = ({ tasks, clients }) => {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const dim = new Date(current.year, current.month + 1, 0).getDate();
  const fd  = new Date(current.year, current.month, 1).getDay();
  const mN  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const dN  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const pad = n => String(n).padStart(2, "0");
  const ts  = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const cells = []; for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= dim; d++) cells.push(d);
  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Calendario</h2>
      <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #efefef", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1.5px solid #f5f5f5" }}>
          <button onClick={() => setCurrent(c => c.month === 0 ? { year: c.year-1, month: 11 } : { ...c, month: c.month-1 })} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 8, fontSize: 20 }}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{mN[current.month]} {current.year}</span>
          <button onClick={() => setCurrent(c => c.month === 11 ? { year: c.year+1, month: 0 } : { ...c, month: c.month+1 })} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 8, fontSize: 20 }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {dN.map(d => <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: "0.05em", borderBottom: "1px solid #f5f5f5" }}>{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const ds = `${current.year}-${pad(current.month+1)}-${pad(day)}`;
            const dt = tasks.filter(t => t.dueDate === ds);
            const iT = ds === ts;
            return (
              <div key={day} style={{ minHeight: 80, padding: "8px 6px", borderRight: "1px solid #f8f8f8", borderBottom: "1px solid #f8f8f8", background: iT ? "#fafaff" : "transparent" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: iT ? "#1a1a1a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: iT ? 700 : 500, color: iT ? "#fff" : "#555", marginBottom: 4 }}>{day}</div>
                {dt.map(t => { const cl = clients.find(c => c.id === t.clientId); return <div key={t.id} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: (cl?.color||"#5b6af0")+"20", color: cl?.color||"#5b6af0", fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>; })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading]               = useState(true);
  const [currentUser, setCurrentUser]       = useState(null);
  const [activeSection, setActiveSection]   = useState("home");
  const [selectedClient, setSelectedClient] = useState(null);

  const [users]                     = useState(SEED.users);
  const [clients,  setClients]      = useState(SEED.clients);
  const [tasks,    setTasks]        = useState(SEED.tasks);
  const [pages,    setPages]        = useState(SEED.pages);
  const [tags,     setTags]         = useState(SEED.tags);
  const [meetings, setMeetings]     = useState(SEED.meetings);
  const [activity, setActivity]     = useState(SEED.activity);

  const addActivity = (event) => setActivity(prev => [event, ...prev].slice(0, 200));

  useEffect(() => {
    (async () => {
      const [sc, st, sp, stg, sm, sa] = await Promise.all([
        storage.get("tf-clients"), storage.get("tf-tasks"), storage.get("tf-pages"),
        storage.get("tf-tags"),    storage.get("tf-meetings"), storage.get("tf-activity"),
      ]);
      if (sc) setClients(sc); if (st) setTasks(st); if (sp) setPages(sp);
      if (stg) setTags(stg); if (sm) setMeetings(sm); if (sa) setActivity(sa);
      setLoading(false);
    })();
  }, []);

  const localRef = useRef({ clients, tasks, pages, tags, meetings, activity });
  useEffect(() => { localRef.current = { clients, tasks, pages, tags, meetings, activity }; }, [clients, tasks, pages, tags, meetings, activity]);
  useEffect(() => {
    if (loading) return;
    const id = setInterval(async () => {
      const [sc, st, sp, stg, sm, sa] = await Promise.all([
        storage.get("tf-clients"), storage.get("tf-tasks"), storage.get("tf-pages"),
        storage.get("tf-tags"),    storage.get("tf-meetings"), storage.get("tf-activity"),
      ]);
      if (sc  && JSON.stringify(sc)  !== JSON.stringify(localRef.current.clients))  setClients(sc);
      if (st  && JSON.stringify(st)  !== JSON.stringify(localRef.current.tasks))    setTasks(st);
      if (sp  && JSON.stringify(sp)  !== JSON.stringify(localRef.current.pages))    setPages(sp);
      if (stg && JSON.stringify(stg) !== JSON.stringify(localRef.current.tags))     setTags(stg);
      if (sm  && JSON.stringify(sm)  !== JSON.stringify(localRef.current.meetings)) setMeetings(sm);
      if (sa  && JSON.stringify(sa)  !== JSON.stringify(localRef.current.activity)) setActivity(sa);
    }, 5000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => { if (!loading) storage.set("tf-clients",  clients);  }, [clients,  loading]);
  useEffect(() => { if (!loading) storage.set("tf-tasks",    tasks);    }, [tasks,    loading]);
  useEffect(() => { if (!loading) storage.set("tf-pages",    pages);    }, [pages,    loading]);
  useEffect(() => { if (!loading) storage.set("tf-tags",     tags);     }, [tags,     loading]);
  useEffect(() => { if (!loading) storage.set("tf-meetings", meetings); }, [meetings, loading]);
  useEffect(() => { if (!loading) storage.set("tf-activity", activity); }, [activity, loading]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lora', Georgia, serif", color: "#888" }}>Cargando TeamFlow...</div>;
  if (!currentUser) return <LoginScreen users={users} onLogin={u => { setCurrentUser(u); addActivity(createEvent("task_created", `inició sesión`, u.id)); }} />;

  const navItems = [
    { id: "home",     label: "Inicio",     icon: "home" },
    { id: "clients",  label: "Clientes",   icon: "clients" },
    { id: "tasks",    label: "Tareas",     icon: "tasks" },
    { id: "meetings", label: "Reuniones",  icon: "meeting" },
    { id: "workload", label: "Carga",      icon: "workload" },
    { id: "calendar", label: "Calendario", icon: "calendar" },
    { id: "activity", label: "Actividad",  icon: "activity" },
  ];

  const navigate = (id) => { setActiveSection(id); if (id !== "clients") setSelectedClient(null); setSidebarOpen(false); };

  const renderContent = () => {
    if (activeSection === "client-detail" && selectedClient)
      return <ClientDetail client={selectedClient} clients={clients} setClients={setClients} tasks={tasks} setTasks={setTasks} pages={pages} setPages={setPages} meetings={meetings} setMeetings={setMeetings} tags={tags} setTags={setTags} users={users} currentUser={currentUser} onBack={() => setActiveSection("clients")} addActivity={addActivity} />;
    switch (activeSection) {
      case "home":     return <Dashboard tasks={tasks} setTasks={setTasks} clients={clients} users={users} tags={tags} setTags={setTags} meetings={meetings} activity={activity} setActiveSection={setActiveSection} currentUser={currentUser} />;
      case "clients":  return <ClientsView clients={clients} setClients={setClients} tasks={tasks} pages={pages} meetings={meetings} setActiveSection={setActiveSection} setSelectedClient={setSelectedClient} />;
      case "tasks":    return <TasksView tasks={tasks} setTasks={setTasks} clients={clients} users={users} tags={tags} setTags={setTags} currentUser={currentUser} addActivity={addActivity} />;
      case "meetings": return <MeetingsView meetings={meetings} setMeetings={setMeetings} clients={clients} users={users} tasks={tasks} setTasks={setTasks} currentUser={currentUser} addActivity={addActivity} />;
      case "workload": return <WorkloadView tasks={tasks} users={users} clients={clients} />;
      case "calendar": return <CalendarView tasks={tasks} clients={clients} />;
      case "activity": return <ActivityView activity={activity} users={users} clients={clients} tasks={tasks} />;
      default: return null;
    }
  };

  const SidebarContent = () => (
    <>
      <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "Lora, serif" }}>T</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", fontFamily: "Lora, serif" }}>TeamFlow</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="tf-hamburger-close" style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4, display: "none" }}><Icon name="x" size={18} /></button>
      </div>
      <nav style={{ padding: "8px 10px", flex: 1, overflowY: "auto" }}>
        {navItems.map(item => {
          const active = activeSection === item.id || (activeSection === "client-detail" && item.id === "clients");
          return (
            <button key={item.id} onClick={() => navigate(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#f0f0ee" : "transparent", color: active ? "#1a1a1a" : "#888", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit", marginBottom: 2, textAlign: "left" }}>
              <Icon name={item.icon} size={16} />{item.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "16px 14px", borderTop: "1.5px solid #f5f5f5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar user={currentUser} size={32} />
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{currentUser.name}</div><div style={{ fontSize: 11, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.email}</div></div>
        </div>
        <button onClick={() => setCurrentUser(null)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 12, fontFamily: "inherit", borderRadius: 6 }}>
          <Icon name="logout" size={13} /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f7f5", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .tf-sidebar { width: 220px; background: #fff; border-right: 1.5px solid #efefef; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; flex-shrink: 0; z-index: 100; transition: transform 0.25s ease; }
        .tf-topbar { display: none; }
        .tf-main { flex: 1; padding: 36px 40px; max-width: 1100px; min-width: 0; }
        .tf-overlay { display: none; }
        .tf-hamburger-close { display: none !important; }
        .tf-2col { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
        .tf-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 28px; }
        .tf-client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .tf-meeting-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .tf-workload-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .tf-workload-heatmap { display: grid; grid-template-columns: 140px repeat(7, 1fr); }
        .tf-modal-inner { max-width: 520px; border-radius: 16px; }
        .tf-modal-wide { max-width: 680px; }
        .tf-task-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .tf-task-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .tf-week-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        .tf-bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }

        @media (max-width: 768px) {
          .tf-sidebar { position: fixed; top: 0; left: 0; height: 100vh; transform: translateX(-100%); box-shadow: 4px 0 24px rgba(0,0,0,0.10); }
          .tf-sidebar.open { transform: translateX(0); }
          .tf-hamburger-close { display: flex !important; }
          .tf-topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #fff; border-bottom: 1.5px solid #efefef; position: sticky; top: 0; z-index: 90; }
          .tf-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 99; }
          .tf-main { padding: 20px 16px 80px; }
          .tf-2col { grid-template-columns: 1fr; }
          .tf-stats { grid-template-columns: repeat(3, 1fr); }
          .tf-client-grid { grid-template-columns: 1fr; }
          .tf-meeting-grid { grid-template-columns: 1fr; }
          .tf-workload-cards { grid-template-columns: repeat(2, 1fr); }
          .tf-workload-heatmap { grid-template-columns: 80px repeat(7, 1fr); overflow-x: auto; font-size: 10px; }
          .tf-modal-inner { max-width: 100%; border-radius: 20px 20px 0 0; margin-top: auto; max-height: 92vh; }
          .tf-modal-wide { max-width: 100%; }
          .tf-task-actions { gap: 4px; }
          .tf-week-summary { grid-template-columns: repeat(2, 1fr); }
          .tf-bottom-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .tf-stats { grid-template-columns: repeat(2, 1fr); }
          .tf-workload-cards { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="tf-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`tf-sidebar${sidebarOpen ? " open" : ""}`}>
        <SidebarContent />
      </div>

      {/* Right side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="tf-topbar">
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a1a1a", padding: 4, display: "flex" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "Lora, serif" }}>T</div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", fontFamily: "Lora, serif" }}>TeamFlow</span>
          </div>
          <Avatar user={currentUser} size={30} />
        </div>

        <main className="tf-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
