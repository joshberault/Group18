import { MatterCard } from "@/components/attorney/MatterCard";
import { DEMO_MATTERS } from "@/lib/attorney/demo-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AttorneyMattersPage() {
  const matters = DEMO_MATTERS;

  return (
    <div>
      <PageHeader
        title="My Matters"
        description="Assigned cases with billing arrangements for your attorney workflow."
      />

      {matters.length === 0 ? (
        <EmptyState
          title="No assigned matters yet"
          description="Sample matter data will appear here in demo mode."
        />
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {matters.map((matter) => (
            <MatterCard key={matter.id} matter={matter} />
          ))}
        </div>
      )}
    </div>
  );
}
