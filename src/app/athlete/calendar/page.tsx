import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function AthleteCalendarPage() {
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Calendario settimanale atleta</h2>
      <Card>
        <p className="text-sm text-slate-600">Visualizza qui gli allenamenti assegnati giorno per giorno.</p>
      </Card>
    </AppShell>
  );
}
