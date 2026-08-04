import { formatDate, statusBadgeClass } from "@/lib/utils";
import type { TimeEntry } from "@/types/database";

export function TimeEntryList({ entries }: { entries: TimeEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No time entries yet. Log your first entry above.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Matter</th>
            <th className="px-4 py-3 font-medium">Hours</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{formatDate(entry.entry_date)}</td>
              <td className="px-4 py-3">{entry.matter?.title ?? "—"}</td>
              <td className="px-4 py-3">{entry.hours}</td>
              <td className="px-4 py-3">{entry.description}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(entry.status)}`}>
                  {entry.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
