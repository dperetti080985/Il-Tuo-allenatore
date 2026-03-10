import { PropsWithChildren } from "react";

export function PageHeader({ children }: PropsWithChildren) {
  return <div className="mb-6 flex items-center justify-between">{children}</div>;
}
