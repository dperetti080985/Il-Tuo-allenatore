const { useEffect, useMemo, useState } = React;

const days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function App() {
  const [users, setUsers] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [methods, setMethods] = useState([]);
  const [plans, setPlans] = useState([]);
  const [roleView, setRoleView] = useState("athlete");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [coachForm, setCoachForm] = useState({
    athlete_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    months: 3,
    weekly_hours: 8,
    available_days: ["Lunedì", "Mercoledì", "Venerdì", "Domenica"],
    race_model: "Granfondo",
    main_goals: "migliorare FTP, aumentare resistenza",
    preferred_method_ids: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [u, a, m, p] = await Promise.all([
        fetch("/users").then((r) => r.json()),
        fetch("/athletes").then((r) => r.json()),
        fetch("/methods").then((r) => r.json()),
        fetch("/plans").then((r) => r.json()),
      ]);
      setUsers(u);
      setAthletes(a);
      setMethods(m);
      setPlans(p);
      if (a.length && !selectedAthlete) {
        setSelectedAthlete(String(a[0].id));
        setCoachForm((old) => ({ ...old, athlete_id: a[0].id }));
      }
      if (!u.length) {
        setMessage("Nessun utente presente: accesso libero attivo.");
      }
    } catch {
      setMessage("Errore nel caricamento dei dati.");
    } finally {
      setLoading(false);
    }
  }

  const athletePlans = useMemo(() => {
    if (!selectedAthlete) return [];
    return plans.filter((p) => p.athlete_id === Number(selectedAthlete));
  }, [plans, selectedAthlete]);

  const planByMethod = useMemo(() => {
    const map = new Map(methods.map((m) => [m.id, m.name]));
    return map;
  }, [methods]);

  async function createPlan(e) {
    e.preventDefault();
    setMessage("");
    const payload = {
      ...coachForm,
      athlete_id: Number(coachForm.athlete_id),
      months: Number(coachForm.months),
      weekly_hours: Number(coachForm.weekly_hours),
      main_goals: coachForm.main_goals.split(",").map((x) => x.trim()).filter(Boolean),
    };

    const res = await fetch("/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setMessage("Impossibile creare il piano. Controlla i campi.");
      return;
    }

    setMessage("Piano creato con successo.");
    await loadData();
    setRoleView("athlete");
  }

  if (loading) return <div className="shell">Caricamento...</div>;

  return (
    <div className="shell">
      <header>
        <h1>Il Tuo Allenatore</h1>
        <p>Vista atleta mobile + regia tecnico desktop</p>
      </header>

      <div className="switcher">
        <button className={roleView === "athlete" ? "active" : ""} onClick={() => setRoleView("athlete")}>Vista atleta</button>
        <button className={roleView === "coach" ? "active" : ""} onClick={() => setRoleView("coach")}>Vista tecnico</button>
      </div>

      {message && <div className="message">{message}</div>}

      {roleView === "athlete" ? (
        <section className="athlete-view">
          <label>Atleta</label>
          <select value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
          </select>

          {athletePlans.map((plan) => (
            <article key={plan.id} className="plan-card" onClick={() => setSelectedPlan(plan)}>
              <h3>Piano #{plan.id}</h3>
              <p>{plan.weeks} settimane • {plan.weekly_hours} ore/sett</p>
              <p>Obiettivi: {plan.main_goals.join(", ")}</p>
            </article>
          ))}

          {selectedPlan && (
            <div className="calendar">
              {selectedPlan.workouts.map((w, idx) => (
                <div className="workout" key={idx}>
                  <strong>W{w.week_num} · {w.day_name}</strong>
                  <span className={w.week_type}>{w.week_type}</span>
                  <small>{w.method_id ? planByMethod.get(w.method_id) : "Recupero"}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="coach-view">
          <form onSubmit={createPlan}>
            <div className="grid">
              <label>Atleta
                <select value={coachForm.athlete_id} onChange={(e) => setCoachForm({ ...coachForm, athlete_id: e.target.value })} required>
                  <option value="">Seleziona atleta</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </label>
              <label>Data inizio
                <input type="date" value={coachForm.start_date} onChange={(e) => setCoachForm({ ...coachForm, start_date: e.target.value })} required />
              </label>
              <label>Mesi
                <input type="number" min="1" value={coachForm.months} onChange={(e) => setCoachForm({ ...coachForm, months: e.target.value })} />
              </label>
              <label>Ore settimanali
                <input type="number" step="0.5" min="1" value={coachForm.weekly_hours} onChange={(e) => setCoachForm({ ...coachForm, weekly_hours: e.target.value })} />
              </label>
            </div>

            <label>Giorni disponibili</label>
            <div className="chips">
              {days.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={coachForm.available_days.includes(day) ? "chip active" : "chip"}
                  onClick={() => {
                    const on = coachForm.available_days.includes(day);
                    setCoachForm({
                      ...coachForm,
                      available_days: on
                        ? coachForm.available_days.filter((d) => d !== day)
                        : [...coachForm.available_days, day],
                    });
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            <label>Modello gara
              <input value={coachForm.race_model} onChange={(e) => setCoachForm({ ...coachForm, race_model: e.target.value })} />
            </label>
            <label>Obiettivi principali (separati da virgola)
              <textarea value={coachForm.main_goals} onChange={(e) => setCoachForm({ ...coachForm, main_goals: e.target.value })}></textarea>
            </label>

            <label>Metodi preferiti</label>
            <div className="chips">
              {methods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={coachForm.preferred_method_ids.includes(m.id) ? "chip active" : "chip"}
                  onClick={() => {
                    const on = coachForm.preferred_method_ids.includes(m.id);
                    setCoachForm({
                      ...coachForm,
                      preferred_method_ids: on
                        ? coachForm.preferred_method_ids.filter((id) => id !== m.id)
                        : [...coachForm.preferred_method_ids, m.id],
                    });
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <button type="submit" className="primary">Crea piano</button>
          </form>
        </section>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
