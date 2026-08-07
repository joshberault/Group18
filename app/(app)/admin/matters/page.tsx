import { redirect } from "next/navigation";

/** Matters live under the shared sidebar Matters module — not Admin tabs. */
export default function AdminMattersPage() {
  redirect("/matters");
}
