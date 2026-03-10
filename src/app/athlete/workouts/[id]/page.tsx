import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function WorkoutDetailPage() {
  return (
    <AppShell>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">Dettaglio allenamento</h2>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          <li>Blocco 1 - Riscaldamento</li>
          <li>Blocco 2 - Parte centrale</li>
          <li>Blocco 3 - Defaticamento</li>
        </ul>
        <form action="/api/athlete/feedback" method="post" className="mt-4 space-y-2">
          <input name="assignmentId" className="w-full rounded border p-2" placeholder="Assignment ID" required />
          <input name="rating" type="number" min="1" max="5" className="w-full rounded border p-2" placeholder="Rating 1-5" required />
          <textarea name="notes" className="w-full rounded border p-2" placeholder="Come ti sei sentito?" />
          <button className="rounded bg-brand-500 px-4 py-2 text-white">Invia feedback</button>
        </form>
      </Card>
    </AppShell>
  );
}
