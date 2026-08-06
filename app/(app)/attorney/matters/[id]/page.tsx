import { MatterDetailClient } from "./MatterDetailClient";

export default async function MatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatterDetailClient matterId={id} />;
}
