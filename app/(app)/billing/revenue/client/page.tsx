import { RevenueByClientReport } from "@/components/billing/RevenueByClientReport";

type Props = {
  searchParams: Promise<{ client?: string }>;
};

export default async function RevenueByClientPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <RevenueByClientReport clientFilter={params.client?.trim() || undefined} />
  );
}
