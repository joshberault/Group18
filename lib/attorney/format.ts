export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function billingLabel(type: string) {
  switch (type) {
    case "hourly":
      return "Hourly";
    case "fixed_fee":
      return "Fixed Fee";
    case "retainer":
      return "Retainer";
    case "contingency":
      return "Contingency";
    default:
      return type;
  }
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-violet-100 text-violet-800";
    case "completed":
    case "closed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
