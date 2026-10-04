import type { ReactNode } from "react";
import { OperationsNav } from "@/components/operations-nav";
import styles from "./operations-shell.module.css";

export function OperationsShell({ area, children }: { area: "staff" | "admin"; children: ReactNode }) {
  return <div className={styles.workspace}>
    <OperationsNav area={area} />
    {children}
  </div>;
}
