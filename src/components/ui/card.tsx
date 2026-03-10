import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}
