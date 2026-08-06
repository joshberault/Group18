import { redirect } from "next/navigation";

/** Approval Queue moved to the Managing Partner dashboard. */
export default function AdminApprovalsRedirectPage() {
  redirect("/dashboard/approvals");
}
