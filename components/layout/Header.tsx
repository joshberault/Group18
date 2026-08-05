"use client";

import { Bell, Menu, Search } from "lucide-react";
import { USER_ROLE_LABELS, USER_ROLES } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useDemoRole } from "./DemoRoleProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { selectedRole, setSelectedRole, identity } = useDemoRole();

  const roleOptions = USER_ROLES.map((r) => ({
    value: r,
    label: USER_ROLE_LABELS[r],
  }));

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search clients, matters, invoices..."
            className="pl-9"
            aria-label="Search"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
        <div className="hidden sm:block">
          <Select
            label="Demo role"
            options={roleOptions}
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as typeof selectedRole)
            }
            className="min-w-[200px]"
            aria-label="Switch demonstration role"
          />
        </div>

        <Button variant="ghost" size="sm" aria-label="Notifications">
          <Bell className="h-5 w-5 text-muted" />
        </Button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-navy-900">{identity.fullName}</p>
          <p className="text-xs text-muted">{USER_ROLE_LABELS[selectedRole]}</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
          {identity.initials}
        </div>
      </div>
    </header>
  );
}
