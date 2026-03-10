const { useEffect, useMemo, useState } = React;

const days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const emptyZone = (z) => ({ zone: z, watt_min: "", watt_max: "", hr_min: "", hr_max: "" });

function App() {
  const [view, setView] = useState("athlete");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [plans, setPlans] = useState([]);

  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [athleteSnapshots, setAthleteSnapshots] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [userForm, setUserForm] = useState({ id: null, username: "", role: "athlete" });
  const [athleteForm, setAthleteForm] = useState({ id: null, user_id: "", first_name: "", last_name: "", birth_date: "", gender: "" });
  const [goalForm, setGoalForm] = useState({ id: null, name: "", description: "" });
  const [methodForm, setMethodForm] = useState({
    id: null,
    name: "",
    description: "",
    goal_ids: [],
    steps: [{ order_num: 1, reps: 1, duration_sec: "", zone: 3, recovery_sec: 0, notes: "" }],
  });
  const [planForm, setPlanForm] = useState({
    athlete_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    months: 3,
    weekly_hours: 8,
    available_days: ["Lunedì", "Mercoledì", "Venerdì"],
    race_model: "Granfondo",
    main_goals: "",
    preferred_method_ids: [],
  });
  const [snapshotForm, setSnapshotForm] = useState({
    ref_date: new Date().toISOString().slice(0, 10),
    ftp: "",
    cp_2m: "",
    cp_5m: "",
    cp_20m: "",
    vo2max: "",
    p_vo2max: "",
    weight: "",
    height: "",
    lean_mass: "",
    muscle_mass: "",
    zones: [1, 2, 3, 4, 5, 6, 7].map(emptyZone),
  });

  useEffect(() => {
    reloadAll();
  }, []);

  useEffect(() => {
    if (!selectedAthlete && athletes.length) {
      setSelectedAthlete(String(athletes[0].id));
      setPlanForm((old) => ({ ...old, athlete_id: String(athletes[0].id) }));
    }
  }, [athletes, selectedAthlete]);

  useEffect(() => {
    if (selectedAthlete) loadSnapshots(selectedAthlete);
    else setAthleteSnapshots([]);
  }, [selectedAthlete]);

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      let detail = "Operazione fallita";
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch {}
      throw new Error(detail);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function reloadAll() {
    setLoading(true);
    try {
      const [u, a, g, m, p] = await Promise.all([
        api("/users"),
        api("/athletes"),
        api("/goals"),
        api("/methods"),
        api("/plans"),
      ]);
      setUsers(u);
      setAthletes(a);
      setGoals(g);
      setMethods(m);
      setPlans(p);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshots(athleteId) {
    try {
      const data = await api(`/athletes/${athleteId}/snapshots`);
      setAthleteSnapshots(data);
    } catch {
      setAthleteSnapshots([]);
    }
  }

  async function submitUser(e) {
    e.preventDefault();
    try {
      const payload = { username: userForm.username, role: userForm.role };
      if (userForm.id) await api(`/users/${userForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/users", { method: "POST", body: JSON.stringify(payload) });
      setUserForm({ id: null, username: "", role: "athlete" });
      await reloadAll();
      setMessage("Utente salvato.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitAthlete(e) {
    e.preventDefault();
    try {
      const payload = { ...athleteForm, user_id: Number(athleteForm.user_id), birth_date: athleteForm.birth_date || null, gender: athleteForm.gender || null };
      if (athleteForm.id) await api(`/athletes/${athleteForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/athletes", { method: "POST", body: JSON.stringify(payload) });
      setAthleteForm({ id: null, user_id: "", first_name: "", last_name: "", birth_date: "", gender: "" });
      await reloadAll();
      setMessage("Anagrafica atleta salvata.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitGoal(e) {
    e.preventDefault();
    try {
      const payload = { name: goalForm.name, description: goalForm.description || null };
      if (goalForm.id) await api(`/goals/${goalForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/goals", { method: "POST", body: JSON.stringify(payload) });
      setGoalForm({ id: null, name: "", description: "" });
      await reloadAll();
      setMessage("Finalità salvata.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitMethod(e) {
    e.preventDefault();
    try {
      const payload = {
        name: methodForm.name,
        description: methodForm.description,
        goal_ids: methodForm.goal_ids,
        steps: methodForm.steps.map((s, i) => ({ ...s, order_num: i + 1, reps: Number(s.reps), duration_sec: Number(s.duration_sec), zone: Number(s.zone), recovery_sec: Number(s.recovery_sec) })),
      };
      if (methodForm.id) await api(`/methods/${methodForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/methods", { method: "POST", body: JSON.stringify(payload) });
      setMethodForm({ id: null, name: "", description: "", goal_ids: [], steps: [{ order_num: 1, reps: 1, duration_sec: "", zone: 3, recovery_sec: 0, notes: "" }] });
      await reloadAll();
      setMessage("Metodo di allenamento salvato.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitPlan(e) {
    e.preventDefault();
    try {
      const payload = {
        ...planForm,
        athlete_id: Number(planForm.athlete_id),
        months: Number(planForm.months),
        weekly_hours: Number(planForm.weekly_hours),
        main_goals: planForm.main_goals.split(",").map((x) => x.trim()).filter(Boolean),
      };
      await api("/plans", { method: "POST", body: JSON.stringify(payload) });
      await reloadAll();
      setMessage("Piano creato.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitSnapshot(e) {
    e.preventDefault();
    if (!selectedAthlete) return;
    try {
      const numOrNull = (v) => (v === "" ? null : Number(v));
      const payload = {
        ref_date: snapshotForm.ref_date,
        ftp: numOrNull(snapshotForm.ftp),
        cp_2m: numOrNull(snapshotForm.cp_2m),
        cp_5m: numOrNull(snapshotForm.cp_5m),
        cp_20m: numOrNull(snapshotForm.cp_20m),
        vo2max: numOrNull(snapshotForm.vo2max),
        p_vo2max: numOrNull(snapshotForm.p_vo2max),
        weight: numOrNull(snapshotForm.weight),
        height: numOrNull(snapshotForm.height),
        lean_mass: numOrNull(snapshotForm.lean_mass),
        muscle_mass: numOrNull(snapshotForm.muscle_mass),
        zones: snapshotForm.zones.map((z) => ({ zone: z.zone, watt_min: Number(z.watt_min), watt_max: Number(z.watt_max), hr_min: Number(z.hr_min), hr_max: Number(z.hr_max) })),
      };
      await api(`/athletes/${selectedAthlete}/snapshots`, { method: "POST", body: JSON.stringify(payload) });
      await loadSnapshots(selectedAthlete);
      setMessage("Snapshot prestativo salvato.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function remove(path, label) {
    try {
      await api(path, { method: "DELETE" });
      await reloadAll();
      if (selectedAthlete) await loadSnapshots(selectedAthlete);
      setMessage(`${label} eliminato.`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  const athletePlans = useMemo(() => plans.filter((p) => p.athlete_id === Number(selectedAthlete)), [plans, selectedAthlete]);
  const methodMap = useMemo(() => new Map(methods.map((m) => [m.id, m.name])), [methods]);
  const athleteUsers = useMemo(() => users.filter((u) => u.role === "athlete"), [users]);

  if (loading) return <div className="shell">Caricamento...</div>;

  return (
    <div className="shell">
      <header className="top">
        <h1>Il Tuo Allenatore</h1>
        <p>Dashboard unica: mobile per atleta, desktop operativo per tecnico.</p>
      </header>
      <div className="switcher">
        <button onClick={() => setView("athlete")} className={view === "athlete" ? "active" : ""}>Vista atleta</button>
        <button onClick={() => setView("coach")} className={view === "coach" ? "active" : ""}>Vista tecnico + autorizzazioni</button>
      </div>
      {message && <p className="message">{message}</p>}

      {view === "athlete" ? (
        <section className="athlete-view">
          <label>Atleta
            <select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
              {athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </label>

          {athletePlans.map((plan) => (
            <article key={plan.id} className="plan-card" onClick={() => setSelectedPlan(plan)}>
              <h3>Piano #{plan.id}</h3>
              <small>{plan.weeks} settimane • {plan.weekly_hours} ore</small>
              <p>{plan.main_goals.join(", ")}</p>
            </article>
          ))}

          {!!selectedPlan && (
            <div className="calendar">
              {selectedPlan.workouts.map((w, i) => (
                <div key={i} className="workout">
                  <strong>W{w.week_num} {w.day_name}</strong>
                  <span className={w.week_type}>{w.week_type}</span>
                  <small>{w.method_id ? methodMap.get(w.method_id) : "Recupero / libero"}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="coach-grid">
          <article className="panel">
            <h3>Gestione autorizzazioni / utenti</h3>
            <form onSubmit={submitUser} className="stack">
              <input placeholder="username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="athlete">athlete</option>
                <option value="coach">coach</option>
              </select>
              <button className="primary">{userForm.id ? "Aggiorna" : "Crea"} utente</button>
            </form>
            {users.map((u) => (
              <div className="row" key={u.id}>
                <span>{u.username} ({u.role})</span>
                <div>
                  <button onClick={() => setUserForm(u)}>Modifica</button>
                  <button onClick={() => remove(`/users/${u.id}`, "Utente")}>Elimina</button>
                </div>
              </div>
            ))}
          </article>

          <article className="panel">
            <h3>Anagrafica atleti</h3>
            <form onSubmit={submitAthlete} className="stack">
              <select value={athleteForm.user_id} onChange={(e) => setAthleteForm({ ...athleteForm, user_id: e.target.value })} required>
                <option value="">User atleta</option>
                {athleteUsers.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <input placeholder="Nome" value={athleteForm.first_name} onChange={(e) => setAthleteForm({ ...athleteForm, first_name: e.target.value })} required />
              <input placeholder="Cognome" value={athleteForm.last_name} onChange={(e) => setAthleteForm({ ...athleteForm, last_name: e.target.value })} required />
              <input type="date" value={athleteForm.birth_date} onChange={(e) => setAthleteForm({ ...athleteForm, birth_date: e.target.value })} />
              <input placeholder="Genere" value={athleteForm.gender} onChange={(e) => setAthleteForm({ ...athleteForm, gender: e.target.value })} />
              <button className="primary">{athleteForm.id ? "Aggiorna" : "Crea"} atleta</button>
            </form>
            {athletes.map((a) => (
              <div className="row" key={a.id}>
                <span>{a.first_name} {a.last_name}</span>
                <div>
                  <button onClick={() => setAthleteForm({ ...a, birth_date: a.birth_date || "", gender: a.gender || "" })}>Modifica</button>
                  <button onClick={() => remove(`/athletes/${a.id}`, "Atleta")}>Elimina</button>
                </div>
              </div>
            ))}
          </article>

          <article className="panel full">
            <h3>Finalità e metodi di allenamento (ripetute)</h3>
            <div className="split">
              <form onSubmit={submitGoal} className="stack">
                <h4>Finalità</h4>
                <input placeholder="Nome finalità" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} required />
                <textarea placeholder="Descrizione" value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} />
                <button className="primary">{goalForm.id ? "Aggiorna" : "Crea"} finalità</button>
                {goals.map((g) => (
                  <div className="row" key={g.id}>
                    <span>{g.name}</span>
                    <div>
                      <button onClick={() => setGoalForm(g)}>Modifica</button>
                      <button onClick={() => remove(`/goals/${g.id}`, "Finalità")}>Elimina</button>
                    </div>
                  </div>
                ))}
              </form>

              <form onSubmit={submitMethod} className="stack">
                <h4>Metodo</h4>
                <input placeholder="Nome metodo" value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} required />
                <textarea placeholder="Descrizione" value={methodForm.description} onChange={(e) => setMethodForm({ ...methodForm, description: e.target.value })} required />
                <label>Finalità collegate</label>
                <div className="chips">
                  {goals.map((g) => (
                    <button type="button" key={g.id} className={methodForm.goal_ids.includes(g.id) ? "chip active" : "chip"} onClick={() => {
                      const on = methodForm.goal_ids.includes(g.id);
                      setMethodForm({ ...methodForm, goal_ids: on ? methodForm.goal_ids.filter((id) => id !== g.id) : [...methodForm.goal_ids, g.id] });
                    }}>{g.name}</button>
                  ))}
                </div>
                <label>Ripetute</label>
                {methodForm.steps.map((step, idx) => (
                  <div className="step" key={idx}>
                    <input type="number" min="1" value={step.reps} onChange={(e) => {
                      const next = [...methodForm.steps];
                      next[idx].reps = e.target.value;
                      setMethodForm({ ...methodForm, steps: next });
                    }} placeholder="reps" />
                    <input type="number" min="10" value={step.duration_sec} onChange={(e) => {
                      const next = [...methodForm.steps];
                      next[idx].duration_sec = e.target.value;
                      setMethodForm({ ...methodForm, steps: next });
                    }} placeholder="sec" />
                    <input type="number" min="1" max="7" value={step.zone} onChange={(e) => {
                      const next = [...methodForm.steps];
                      next[idx].zone = e.target.value;
                      setMethodForm({ ...methodForm, steps: next });
                    }} placeholder="zona" />
                    <input type="number" min="0" value={step.recovery_sec} onChange={(e) => {
                      const next = [...methodForm.steps];
                      next[idx].recovery_sec = e.target.value;
                      setMethodForm({ ...methodForm, steps: next });
                    }} placeholder="rec" />
                    <input value={step.notes || ""} onChange={(e) => {
                      const next = [...methodForm.steps];
                      next[idx].notes = e.target.value;
                      setMethodForm({ ...methodForm, steps: next });
                    }} placeholder="note" />
                  </div>
                ))}
                <button type="button" onClick={() => setMethodForm({ ...methodForm, steps: [...methodForm.steps, { order_num: methodForm.steps.length + 1, reps: 1, duration_sec: "", zone: 3, recovery_sec: 0, notes: "" }] })}>+ Step</button>
                <button className="primary">{methodForm.id ? "Aggiorna" : "Crea"} metodo</button>
                {methods.map((m) => (
                  <div className="row" key={m.id}>
                    <span>{m.name} (stress {m.stress_score})</span>
                    <div>
                      <button onClick={() => setMethodForm({ ...m })}>Modifica</button>
                      <button onClick={() => remove(`/methods/${m.id}`, "Metodo")}>Elimina</button>
                    </div>
                  </div>
                ))}
              </form>
            </div>
          </article>

          <article className="panel full">
            <h3>Snapshot prestativi + zone 1-7</h3>
            <form onSubmit={submitSnapshot} className="stack">
              <select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)} required>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
              <input type="date" value={snapshotForm.ref_date} onChange={(e) => setSnapshotForm({ ...snapshotForm, ref_date: e.target.value })} />
              <div className="metrics-grid">
                {["ftp", "cp_2m", "cp_5m", "cp_20m", "vo2max", "p_vo2max", "weight", "height", "lean_mass", "muscle_mass"].map((field) => (
                  <input key={field} type="number" step="0.1" value={snapshotForm[field]} onChange={(e) => setSnapshotForm({ ...snapshotForm, [field]: e.target.value })} placeholder={field} />
                ))}
              </div>
              {snapshotForm.zones.map((z, idx) => (
                <div className="step" key={z.zone}>
                  <strong>Z{z.zone}</strong>
                  <input type="number" placeholder="w min" value={z.watt_min} onChange={(e) => {
                    const next = [...snapshotForm.zones]; next[idx].watt_min = e.target.value; setSnapshotForm({ ...snapshotForm, zones: next });
                  }} />
                  <input type="number" placeholder="w max" value={z.watt_max} onChange={(e) => {
                    const next = [...snapshotForm.zones]; next[idx].watt_max = e.target.value; setSnapshotForm({ ...snapshotForm, zones: next });
                  }} />
                  <input type="number" placeholder="hr min" value={z.hr_min} onChange={(e) => {
                    const next = [...snapshotForm.zones]; next[idx].hr_min = e.target.value; setSnapshotForm({ ...snapshotForm, zones: next });
                  }} />
                  <input type="number" placeholder="hr max" value={z.hr_max} onChange={(e) => {
                    const next = [...snapshotForm.zones]; next[idx].hr_max = e.target.value; setSnapshotForm({ ...snapshotForm, zones: next });
                  }} />
                </div>
              ))}
              <button className="primary">Salva snapshot</button>
            </form>
            <div className="list">
              {athleteSnapshots.map((s) => (
                <div className="row" key={s.id}>
                  <span>{s.ref_date} FTP {s.ftp}</span>
                  <button onClick={() => remove(`/snapshots/${s.id}`, "Snapshot")}>Elimina</button>
                </div>
              ))}
            </div>
          </article>

          <article className="panel full">
            <h3>Piani di allenamento</h3>
            <form onSubmit={submitPlan} className="stack">
              <select value={planForm.athlete_id} onChange={(e) => setPlanForm({ ...planForm, athlete_id: e.target.value })} required>
                <option value="">Seleziona atleta</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
              <div className="step">
                <input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} />
                <input type="number" min="1" value={planForm.months} onChange={(e) => setPlanForm({ ...planForm, months: e.target.value })} />
                <input type="number" step="0.5" min="1" value={planForm.weekly_hours} onChange={(e) => setPlanForm({ ...planForm, weekly_hours: e.target.value })} />
              </div>
              <div className="chips">
                {days.map((day) => (
                  <button type="button" key={day} className={planForm.available_days.includes(day) ? "chip active" : "chip"} onClick={() => {
                    const on = planForm.available_days.includes(day);
                    setPlanForm({ ...planForm, available_days: on ? planForm.available_days.filter((d) => d !== day) : [...planForm.available_days, day] });
                  }}>{day}</button>
                ))}
              </div>
              <input value={planForm.race_model} onChange={(e) => setPlanForm({ ...planForm, race_model: e.target.value })} placeholder="Modello gara" />
              <textarea value={planForm.main_goals} onChange={(e) => setPlanForm({ ...planForm, main_goals: e.target.value })} placeholder="Obiettivi separati da virgola" />
              <div className="chips">
                {methods.map((m) => (
                  <button type="button" key={m.id} className={planForm.preferred_method_ids.includes(m.id) ? "chip active" : "chip"} onClick={() => {
                    const on = planForm.preferred_method_ids.includes(m.id);
                    setPlanForm({ ...planForm, preferred_method_ids: on ? planForm.preferred_method_ids.filter((id) => id !== m.id) : [...planForm.preferred_method_ids, m.id] });
                  }}>{m.name}</button>
                ))}
              </div>
              <button className="primary">Crea piano</button>
            </form>
            {plans.map((p) => (
              <div className="row" key={p.id}>
                <span>Piano #{p.id} atleta {p.athlete_id} ({p.weeks} settimane)</span>
                <button onClick={() => remove(`/plans/${p.id}`, "Piano")}>Elimina</button>
              </div>
            ))}
          </article>
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
