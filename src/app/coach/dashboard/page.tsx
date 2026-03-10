import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function CoachDashboardPage() {
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Dashboard Coach</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>Atleti attivi</Card>
        <Card>Allenamenti settimanali</Card>
        <Card>Feedback ricevuti</Card>
      </div>
    </AppShell>
  );
}
