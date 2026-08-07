import { redirect } from "next/navigation";

/** Attorney Hub detail route — unified with shared matter detail screen. */
export default async function AttorneyMatterDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/matters/${id}`);
}
