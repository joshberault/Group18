import { redirect } from "next/navigation";

/** Legacy route — approval queue lives on the Manager Dashboard. */
export default function AdminApprovalsRedirectPage() {
  redirect("/admin#approval-queue");
}
