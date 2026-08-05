"use client";

import { ADMIN_NAV_ITEMS } from "@/lib/admin/mock-data";
import type { AdminSectionKey } from "@/lib/admin/types";
import { cn } from "@/lib/utils/cn";

interface AdminSectionNavProps {
  activeKey: AdminSectionKey;
  onSelect: (key: AdminSectionKey) => void;
}

export function AdminSectionNav({ activeKey, onSelect }: AdminSectionNavProps) {
  return (
    <nav
      aria-label="Staff and admin sections"
      className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
    >
      <ul className="flex min-w-max gap-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;

          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-navy-900 text-gold-400"
                    : "text-navy-800 hover:bg-gold-100 hover:text-navy-900",
                )}
                title={item.description}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
