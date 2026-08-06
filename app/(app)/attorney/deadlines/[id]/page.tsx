import { DeadlineDetailClient } from "./DeadlineDetailClient";

export default async function DeadlineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeadlineDetailClient deadlineId={id} />;
}
