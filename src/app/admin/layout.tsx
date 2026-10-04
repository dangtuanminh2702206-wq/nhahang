import type { ReactNode } from "react";
import { OperationsShell } from "@/components/operations-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <OperationsShell area="admin">{children}</OperationsShell>;
}
