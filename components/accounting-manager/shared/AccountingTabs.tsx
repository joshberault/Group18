"use client";

import { cn } from "@/lib/utils/cn";

interface Tab {
  id: string;
  label: string;
}

interface AccountingTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function AccountingTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: AccountingTabsProps) {
  return (
    <div className={cn("border-b border-gray-200", className)}>
      <nav className="-mb-px flex flex-wrap gap-1" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-muted hover:border-gray-300 hover:text-navy-900",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
