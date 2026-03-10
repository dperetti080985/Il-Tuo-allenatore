const { useEffect, useMemo, useState } = React;

const dayOrder = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function App() {
  const [message, setMessage] = useState("");
  const [sessionUser, setSessionUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState("users");

  const [loginForm, setLoginForm] = useState({ username: "admin", password: "admin" });
  const [recoveryForm, setRecoveryForm] = useState({ username: "" });

  const [users, setUsers] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [goals, setGoals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [plans, setPlans] = useState([]);

  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", full_name: "", phone: "", role: "athlete" });

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const body = res.status === 204 ? null : (isJson ? await res.json() : await res.text());
    if (!res.ok) {
      const detail = isJson && typeof body === "object" ? (body?.detail || body?.message) : body;
      throw new Error(detail || `Errore API (${res.status})`);
    }
    return body;
  }

  async function reloadCoachData() {
    const [u, a, g, m, p] = await Promise.all([api("/users"), api("/athletes"), api("/goals"), api("/methods"), api("/plans")]);
    setUsers(u);
    setAthletes(a);
    setGoals(g);
    setMethods(m);
    setPlans(p);
  }

  async function doLogin(e) {
    e.preventDefault();
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(loginForm) });
      setSessionUser(data.user);
      setMessage(`Benvenuto ${data.user.username}`);
      await reloadCoachData();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function doRecover(e) {
    e.preventDefault();
    try {
      const data = await api("/auth/recover-password", { method: "POST", body: JSON.stringify(recoveryForm) });
      setMessage(data.message);
      setRecoveryForm({ username: "" });
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (!sessionUser) {
    return <div className="shell">
      <header className="top"><h1>Il Tuo Allenatore</h1><p>Accesso piattaforma coach / atleta.</p></header>
      {message && <p className="message">{message}</p>}
      <section className="coach-grid">
        <article className="panel">
          <h3>Login</h3>
          <form className="stack" onSubmit={doLogin}>
            <input required placeholder="Username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
            <input required type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            <button className="primary">Entra</button>
          </form>
        </article>
        <article className="panel">
          <h3>Recupero password</h3>
          <form className="stack" onSubmit={doRecover}>
            <input required placeholder="Username" value={recoveryForm.username} onChange={(e) => setRecoveryForm({ username: e.target.value })} />
            <button>Richiedi recupero</button>
          </form>
        </article>
      </section>
    </div>;
  }

  if (sessionUser.role === "athlete") {
    const athlete = athletes.find((a) => a.user_id === sessionUser.id);
    const athletePlans = plans.filter((p) => athlete && p.athlete_id === athlete.id);
    const workouts = athletePlans.flatMap((p) => p.workouts || []);

    return <div className="shell">
      <header className="top"><h1>Area atleta</h1><button onClick={() => setSessionUser(null)}>Logout</button></header>
      {athlete ? <>
        <article className="panel"><h3>Dati atleta</h3><p>{athlete.first_name} {athlete.last_name}</p><p>{athlete.email}</p></article>
        <article className="panel"><h3>Calendario allenamenti</h3>
          {dayOrder.map((day) => {
            const dayWorkouts = workouts.filter((w) => w.day_name === day).slice(0, 1);
            return <div key={day} className="workout"><strong>{day}</strong><small>{dayWorkouts[0]?.day_goal || "Riposo"}</small></div>;
          })}
        </article>
      </> : <p>Nessun profilo atleta associato.</p>}
    </div>;
  }

  return <div className="shell">
    <header className="top"><h1>Area Coach</h1><button onClick={() => setSessionUser(null)}>Logout</button></header>
    {message && <p className="message">{message}</p>}

    <div className="switcher">
      <button className={activeMenu === "users" ? "active" : ""} onClick={() => setActiveMenu("users")}>Menu utenti</button>
      <button className={activeMenu === "athletes" ? "active" : ""} onClick={() => setActiveMenu("athletes")}>Gestione atleti</button>
      <button className={activeMenu === "methods" ? "active" : ""} onClick={() => setActiveMenu("methods")}>Metodi allenamento</button>
      <button className={activeMenu === "plans" ? "active" : ""} onClick={() => setActiveMenu("plans")}>Piani allenamento</button>
    </div>

    {activeMenu === "users" && <section className="coach-grid">
      <article className="panel">
        <h3>Inserimento utenti</h3>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/users", { method: "POST", body: JSON.stringify(userForm) });
            setUserForm({ username: "", email: "", password: "", full_name: "", phone: "", role: "athlete" });
            await reloadCoachData();
            setMessage("Utente creato correttamente");
          } catch (err) {
            setMessage(err.message);
          }
        }}>
          <input required placeholder="username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
          <input required type="email" placeholder="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          <input required type="password" placeholder="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          <input placeholder="nome completo" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
          <input placeholder="telefono" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
          <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="athlete">Atleta</option><option value="coach">Allenatore</option></select>
          <button className="primary">Crea utente</button>
        </form>
      </article>
      <article className="panel">
        <h3>Lista utenti</h3>
        {users.map((u) => <div className="row" key={u.id}><span>{u.username} · {u.role}</span></div>)}
      </article>
    </section>}

    {activeMenu === "athletes" && <section className="coach-grid">
      <article className="panel"><h3>Anagrafica atleti</h3>{athletes.map((a) => <div key={a.id} className="row"><span>{a.first_name} {a.last_name}</span></div>)}</article>
      <article className="panel"><h3>Snapshot prestativi</h3><p>Apri la scheda atleta per gestire gli snapshot.</p></article>
    </section>}

    {activeMenu === "methods" && <section className="coach-grid"><article className="panel full"><h3>Metodi di allenamento</h3>{methods.map((m) => <div key={m.id} className="row"><span>{m.name} · stress {m.stress_score}</span></div>)}</article></section>}
    {activeMenu === "plans" && <section className="coach-grid"><article className="panel full"><h3>Piani allenamento (nell'anagrafica atleta)</h3>{plans.map((p) => <div key={p.id} className="row"><span>Atleta #{p.athlete_id} · {p.weeks} settimane</span></div>)}</article></section>}
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
