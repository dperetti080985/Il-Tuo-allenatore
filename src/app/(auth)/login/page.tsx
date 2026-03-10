import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <AppShell>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Login</h2>
        <form action="/api/auth/login" method="post" className="space-y-3">
          <input className="w-full rounded border p-2" name="email" type="email" placeholder="email" required />
          <input className="w-full rounded border p-2" name="password" type="password" placeholder="password" required />
          <button className="rounded bg-brand-500 px-4 py-2 text-white">Accedi</button>
        </form>
      </Card>
    </AppShell>
  );
}
