const { useEffect, useMemo, useState } = React;

const days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function App() {
  const [mode, setMode] = useState("coach");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [snapshots, setSnapshots] = useState([]);

  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", full_name: "", phone: "", role: "athlete" });
  const [methodForm, setMethodForm] = useState({ name: "", description: "", goal_ids: [], steps: [{ week_num: 1, order_num: 1, reps: 4, duration_sec: 180, zone: 3, recovery_sec: 120, notes: "" }] });
  const [planForm, setPlanForm] = useState({ athlete_id: "", months: 1, weekly_hours: 8, start_date: new Date().toISOString().slice(0, 10), available_days: ["Lunedì", "Mercoledì", "Venerdì"], race_model: "Granfondo", main_goals: "", day_templates: {} });

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = res.status === 204 ? null : (isJson ? await res.json() : await res.text());

    if (!res.ok) {
      const detail = isJson ? (body?.detail || body?.message) : body;
      throw new Error(detail || `Errore API (${res.status})`);
    }
    return body;
  }

  async function reload() {
    const [u, a, g, m, p] = await Promise.all([api("/users"), api("/athletes"), api("/goals"), api("/methods"), api("/plans")]);
    setUsers(u); setAthletes(a); setGoals(g); setMethods(m); setPlans(p);
    if (!selectedAthlete && a.length) setSelectedAthlete(String(a[0].id));
  }

  useEffect(() => { reload().catch((e) => setMessage(e.message)); }, []);
  useEffect(() => {
    if (!selectedAthlete) return;
    api(`/athletes/${selectedAthlete}/snapshots`).then(setSnapshots).catch(() => setSnapshots([]));
  }, [selectedAthlete]);

  const methodsByGoal = useMemo(() => {
    const map = new Map();
    goals.forEach((g) => map.set(g.id, methods.filter((m) => m.goal_ids.includes(g.id))));
    return map;
  }, [goals, methods]);

  const currentPlan = useMemo(() => plans.find((p) => p.athlete_id === Number(selectedAthlete)), [plans, selectedAthlete]);

  return <div className="shell">
    <header className="top"><h1>Il Tuo Allenatore</h1><p>Interfacce separate atleta/coach e metodi strutturati su 4 settimane.</p></header>
    <div className="switcher">
      <button className={mode === "coach" ? "active" : ""} onClick={() => setMode("coach")}>Coach</button>
      <button className={mode === "athlete" ? "active" : ""} onClick={() => setMode("athlete")}>Atleta mobile</button>
    </div>
    {message && <p className="message">{message}</p>}

    {mode === "coach" ? <section className="coach-grid">
      <article className="panel">
        <h3>Autorizzazioni utenti</h3>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          await api("/users", { method: "POST", body: JSON.stringify(userForm) });
          setUserForm({ username: "", email: "", password: "", full_name: "", phone: "", role: "athlete" });
          reload();
        }}>
          <input required placeholder="username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
          <input required type="email" placeholder="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          <input required type="password" placeholder="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          <input placeholder="nome completo" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
          <input placeholder="telefono" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
          <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="athlete">athlete</option><option value="coach">coach</option></select>
          <button className="primary">Crea utente</button>
        </form>
        {users.map((u) => <div key={u.id} className="row"><span>{u.username} · {u.email} · {u.role}</span></div>)}
      </article>

      <article className="panel full">
        <h3>Metodi allenamento (4 settimane)</h3>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          await api("/methods", { method: "POST", body: JSON.stringify(methodForm) });
          reload();
        }}>
          <input required placeholder="nome metodo" value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} />
          <textarea required placeholder="descrizione" value={methodForm.description} onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })} />
          {methodForm.steps.map((s, i) => <div className="step" key={i}>
            <input type="number" min="1" max="4" value={s.week_num} onChange={(e) => { const n = [...methodForm.steps]; n[i].week_num = Number(e.target.value); setMethodForm({ ...methodForm, steps: n }); }} />
            <input type="number" min="1" value={s.reps} onChange={(e) => { const n = [...methodForm.steps]; n[i].reps = Number(e.target.value); setMethodForm({ ...methodForm, steps: n }); }} />
            <input type="number" min="30" value={s.duration_sec} onChange={(e) => { const n = [...methodForm.steps]; n[i].duration_sec = Number(e.target.value); setMethodForm({ ...methodForm, steps: n }); }} />
            <input type="number" min="1" max="7" value={s.zone} onChange={(e) => { const n = [...methodForm.steps]; n[i].zone = Number(e.target.value); setMethodForm({ ...methodForm, steps: n }); }} />
            <input type="number" min="0" value={s.recovery_sec} onChange={(e) => { const n = [...methodForm.steps]; n[i].recovery_sec = Number(e.target.value); setMethodForm({ ...methodForm, steps: n }); }} />
          </div>)}
          <button type="button" onClick={() => setMethodForm({ ...methodForm, steps: [...methodForm.steps, { week_num: 2, order_num: methodForm.steps.length + 1, reps: 3, duration_sec: 120, zone: 3, recovery_sec: 90, notes: "" }] })}>+ Ripetuta</button>
          <button className="primary">Salva metodo</button>
        </form>
        {methods.map((m) => <div key={m.id} className="row"><span>{m.name} · stress {m.stress_score} · {m.steps.length} ripetute</span></div>)}
      </article>

      <article className="panel full">
        <h3>Piano allenamento: giorni, ore, finalità e metodi</h3>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          const day_templates = Object.entries(planForm.day_templates).map(([day, cfg]) => ({ day_name: day, ...cfg }));
          await api("/plans", { method: "POST", body: JSON.stringify({ ...planForm, athlete_id: Number(planForm.athlete_id), months: Number(planForm.months), weekly_hours: Number(planForm.weekly_hours), main_goals: planForm.main_goals.split(",").map((v) => v.trim()).filter(Boolean), day_templates }) });
          reload();
        }}>
          <select required value={planForm.athlete_id} onChange={(e) => setPlanForm({ ...planForm, athlete_id: e.target.value })}><option value="">Atleta</option>{athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}</select>
          <div className="step"><input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} /><input type="number" min="1" value={planForm.months} onChange={(e) => setPlanForm({ ...planForm, months: e.target.value })} /><input type="number" step="0.5" min="1" value={planForm.weekly_hours} onChange={(e) => setPlanForm({ ...planForm, weekly_hours: e.target.value })} /></div>
          {days.map((d) => <details key={d}><summary>{d}</summary><input placeholder="Finalità del giorno" onChange={(e) => setPlanForm((old) => ({ ...old, day_templates: { ...old.day_templates, [d]: { ...(old.day_templates[d] || {}), day_goal: e.target.value, planned_hours: (old.day_templates[d] || {}).planned_hours || 1, selected_method_ids: (old.day_templates[d] || {}).selected_method_ids || [] } } }))} />
            <input type="number" step="0.5" min="0.5" placeholder="Ore" onChange={(e) => setPlanForm((old) => ({ ...old, day_templates: { ...old.day_templates, [d]: { ...(old.day_templates[d] || {}), planned_hours: Number(e.target.value), day_goal: (old.day_templates[d] || {}).day_goal || "", selected_method_ids: (old.day_templates[d] || {}).selected_method_ids || [] } } }))} />
          </details>)}
          <textarea placeholder="Obiettivi principali (csv)" value={planForm.main_goals} onChange={(e) => setPlanForm({ ...planForm, main_goals: e.target.value })} />
          <button className="primary">Crea piano</button>
        </form>
      </article>
    </section> : <section className="athlete-view">
      <label>Seleziona atleta<select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>{athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}</select></label>
      <article className="panel"><h3>Snapshot prestativi</h3>{snapshots.slice(0, 3).map((s) => <div key={s.id} className="row"><span>{s.ref_date}</span><span>FTP {s.ftp}</span></div>)}</article>
      <article className="panel"><h3>Settimana corrente</h3>{currentPlan?.workouts?.slice(0, 7).map((w, i) => <div key={i} className="workout"><strong>{w.day_name}</strong><small>{w.day_goal || "allenamento"}</small><small>{w.planned_hours}h · {w.week_type === "deload" ? "scarico attivo" : "carico"}</small></div>) || <p>Nessun piano.</p>}</article>
      <article className="panel"><h3>Metodi suggeriti per finalità</h3>{goals.map((g) => <div key={g.id}><strong>{g.name}</strong><p>{(methodsByGoal.get(g.id) || []).map((m) => m.name).join(", ") || "nessuno"}</p></div>)}</article>
    </section>}
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
