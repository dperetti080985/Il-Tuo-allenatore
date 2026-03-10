import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function CoachSummaryPage() {
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Dashboard riepilogo coach</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>Compliance allenamenti</Card>
        <Card>Carico percepito medio</Card>
      </div>
    </AppShell>
  );
}
