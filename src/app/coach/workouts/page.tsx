import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function CoachWorkoutsPage() {
  return (
    <AppShell>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">Creazione allenamento</h2>
        <form action="/api/coach/workouts" method="post" className="space-y-2">
          <input className="w-full rounded border p-2" name="title" placeholder="Titolo" required />
          <textarea className="w-full rounded border p-2" name="description" placeholder="Descrizione" />
          <p className="text-sm text-slate-500">I blocchi sono inizializzati con un template base nell&apos;API.</p>
          <button className="rounded bg-brand-500 px-4 py-2 text-white">Crea allenamento</button>
        </form>
      </Card>
    </AppShell>
  );
}
