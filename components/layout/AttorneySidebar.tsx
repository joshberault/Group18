import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/attorney/dashboard", label: "Dashboard" },
  { href: "/attorney/matters", label: "My Matters" },
  { href: "/attorney/time", label: "Time Entries" },
  { href: "/attorney/expenses", label: "Expenses" },
  { href: "/attorney/tasks", label: "Tasks" },
];

export function AttorneySidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="w-64 shrink-0 border-r border-brand-100 bg-brand-700 text-white">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-xs uppercase tracking-widest text-white/60">Law Firm</p>
        <h1 className="text-lg font-semibold">Attorney Workflow</h1>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition",
              currentPath === link.href || currentPath.startsWith(`${link.href}/`)
                ? "bg-white/15 font-medium"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
