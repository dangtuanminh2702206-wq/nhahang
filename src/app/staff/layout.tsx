import type { ReactNode } from "react";
import { OperationsShell } from "@/components/operations-shell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <OperationsShell area="staff">{children}</OperationsShell>;
}
