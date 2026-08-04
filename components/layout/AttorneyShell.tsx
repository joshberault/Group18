"use client";

import { usePathname } from "next/navigation";
import { AttorneySidebar } from "@/components/layout/AttorneySidebar";

export function AttorneyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <AttorneySidebar currentPath={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
