-- Seed Managing Partner and Paralegal onto Litigation matters for Workload Board.
INSERT INTO public.matter_assignments (matter_id, profile_id, role_on_matter)
SELECT v.matter_id, v.profile_id, v.role_on_matter
FROM (
  VALUES
    (
      'aaaa0105-0001-4001-8001-000000000005'::uuid,
      'bbbb0202-0001-4001-8001-000000000002'::uuid,
      'paralegal'
    ),
    (
      'aaaa0109-0001-4001-8001-000000000009'::uuid,
      'bbbb0202-0001-4001-8001-000000000002'::uuid,
      'paralegal'
    ),
    (
      'aaaa0112-0001-4001-8001-000000000012'::uuid,
      'bbbb0201-0001-4001-8001-000000000001'::uuid,
      'supervising_partner'
    ),
    (
      'aaaa0105-0001-4001-8001-000000000005'::uuid,
      'bbbb0201-0001-4001-8001-000000000001'::uuid,
      'managing_partner'
    )
) AS v(matter_id, profile_id, role_on_matter)
WHERE EXISTS (SELECT 1 FROM public.matters m WHERE m.id = v.matter_id)
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v.profile_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.matter_assignments a
    WHERE a.matter_id = v.matter_id
      AND a.profile_id = v.profile_id
  );
