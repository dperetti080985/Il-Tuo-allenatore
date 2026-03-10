import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <AppShell>
      <Card>
        <h2 className="mb-2 text-xl font-semibold">Piattaforma coach-atleta</h2>
        <p className="mb-4 text-sm text-slate-600">MVP pronto per pianificare e monitorare allenamenti.</p>
        <Link className="text-brand-700 underline" href="/login">
          Vai al login
        </Link>
      </Card>
    </AppShell>
  );
}
