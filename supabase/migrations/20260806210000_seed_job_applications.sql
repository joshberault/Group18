-- Demo career applications for Firm Administrator hiring review.
insert into public.job_applications (
  id,
  applicant_name,
  role_applied,
  email,
  status,
  submitted_at,
  notes
) values
  (
    'f1110001-0001-4001-8001-000000000001',
    'Harper Quinn',
    'Associate Attorney',
    'harper.quinn@email.demo',
    'pending',
    '2026-08-01T14:20:00Z',
    'Practice area: Litigation. 3 years experience. Federal clerkship; strong writing sample on discovery disputes. Resume attached.'
  ),
  (
    'f1110002-0001-4001-8001-000000000002',
    'Jordan Blake',
    'Paralegal',
    'jordan.blake@email.demo',
    'pending',
    '2026-07-30T09:10:00Z',
    'Practice area: Corporate. 5 years experience. Prior closing checklist experience at mid-size firm. Resume attached.'
  ),
  (
    'f1110003-0001-4001-8001-000000000003',
    'Avery Kim',
    'Senior Attorney',
    'avery.kim@email.demo',
    'interview',
    '2026-08-03T16:45:00Z',
    'Practice area: Intellectual Property. 8 years experience. USPTO registration; interview scheduled with IP practice lead. Resume attached.'
  ),
  (
    'f1110004-0001-4001-8001-000000000004',
    'Casey Monroe',
    'Billing Specialist',
    'casey.monroe@email.demo',
    'pending',
    '2026-07-28T11:00:00Z',
    'Practice area: Administration. 4 years experience. Law-firm billing systems experience. Resume missing.'
  ),
  (
    'f1110005-0001-4001-8001-000000000005',
    'Riley Chen',
    'Associate Attorney',
    'riley.chen@email.demo',
    'interview',
    '2026-08-05T10:30:00Z',
    'Practice area: Employment. 6 years experience. Prior wage-and-hour class action work; available next week. Resume attached.'
  )
on conflict (id) do update set
  applicant_name = excluded.applicant_name,
  role_applied = excluded.role_applied,
  email = excluded.email,
  status = excluded.status,
  submitted_at = excluded.submitted_at,
  notes = excluded.notes;
