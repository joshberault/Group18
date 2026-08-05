/**
 * TEMPORARY MOCK DATA — career / job applications for Firm Administrator review.
 * Kept separate from the main admin mock-data module so client panels can import
 * without depending on the heavy dashboard dataset graph.
 */

import type { AdminJobApplication } from "@/lib/admin/types";

export const MOCK_JOB_APPLICATIONS: AdminJobApplication[] = [
  {
    id: "app-001",
    applicantName: "Harper Quinn",
    email: "harper.quinn@email.demo",
    phone: "312-555-0190",
    appliedRole: "Associate Attorney",
    practiceArea: "Litigation",
    submittedAt: "2026-08-01T14:20:00Z",
    status: "pending",
    yearsExperience: 3,
    notes: "Federal clerkship; strong writing sample on discovery disputes.",
    resumeOnFile: true,
  },
  {
    id: "app-002",
    applicantName: "Jordan Blake",
    email: "jordan.blake@email.demo",
    phone: "312-555-0191",
    appliedRole: "Paralegal",
    practiceArea: "Corporate",
    submittedAt: "2026-07-30T09:10:00Z",
    status: "pending",
    yearsExperience: 5,
    notes: "Prior closing checklist experience at mid-size firm.",
    resumeOnFile: true,
  },
  {
    id: "app-003",
    applicantName: "Avery Kim",
    email: "avery.kim@email.demo",
    phone: "312-555-0192",
    appliedRole: "Senior Attorney",
    practiceArea: "Intellectual Property",
    submittedAt: "2026-08-03T16:45:00Z",
    status: "interview",
    yearsExperience: 8,
    notes: "USPTO registration; interview scheduled with IP practice lead.",
    resumeOnFile: true,
  },
  {
    id: "app-004",
    applicantName: "Casey Monroe",
    email: "casey.monroe@email.demo",
    phone: "312-555-0193",
    appliedRole: "Billing Specialist",
    practiceArea: "Administration",
    submittedAt: "2026-07-28T11:00:00Z",
    status: "pending",
    yearsExperience: 4,
    notes: "Law-firm billing systems experience; resume attached.",
    resumeOnFile: false,
  },
];
