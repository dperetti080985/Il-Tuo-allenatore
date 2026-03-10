import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function CoachAthletesPage() {
  return (
    <AppShell>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">Creazione atleta</h2>
        <form action="/api/coach/athletes" method="post" className="grid gap-2 md:grid-cols-2">
          <input className="rounded border p-2" name="firstName" placeholder="Nome" required />
          <input className="rounded border p-2" name="lastName" placeholder="Cognome" required />
          <input className="rounded border p-2" name="email" type="email" placeholder="Email" required />
          <input className="rounded border p-2" name="password" type="password" placeholder="Password" required />
          <button className="rounded bg-brand-500 px-4 py-2 text-white md:col-span-2">Crea atleta</button>
        </form>
      </Card>
    </AppShell>
  );
}
