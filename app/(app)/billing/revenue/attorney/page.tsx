import { RevenueByAttorneyReport } from "@/components/billing/RevenueByAttorneyReport";

type Props = {
  searchParams: Promise<{ attorney?: string }>;
};

export default async function RevenueByAttorneyPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <RevenueByAttorneyReport attorneyFilter={params.attorney?.trim() || undefined} />
  );
}
