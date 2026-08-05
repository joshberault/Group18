import { EmployeeProfileDetail } from "@/components/admin/EmployeeProfileDetail";

interface EmployeeProfilePageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { employeeId } = await params;
  return <EmployeeProfileDetail employeeId={employeeId} />;
}
