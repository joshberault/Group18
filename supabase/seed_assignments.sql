-- Run AFTER creating your Supabase Auth user.
-- Replace YOUR_USER_ID with your auth.users id from Supabase Dashboard.

-- Example: set George as attorney
-- UPDATE public.profiles SET role = 'attorney', full_name = 'George Giddens' WHERE id = 'YOUR_USER_ID';

-- Assign George to demo matters (first 3 open matters)
INSERT INTO public.matter_assignments (matter_id, profile_id, role_on_matter)
SELECT m.id, 'YOUR_USER_ID'::uuid, 'lead_attorney'
FROM public.matters m
WHERE m.status = 'open'
ORDER BY m.created_at
LIMIT 3
ON CONFLICT (matter_id, profile_id) DO NOTHING;

-- Optional sample time entry (pending approval)
INSERT INTO public.time_entries (matter_id, profile_id, entry_date, hours, description, status)
SELECT m.id, 'YOUR_USER_ID'::uuid, CURRENT_DATE - 1, 2.5, 'Initial case review and client intake call', 'pending'
FROM public.matters m
WHERE m.status = 'open'
ORDER BY m.created_at
LIMIT 1;

-- Optional sample task
INSERT INTO public.tasks (matter_id, profile_id, title, description, due_date, status)
SELECT m.id, 'YOUR_USER_ID'::uuid, 'Draft demand letter', 'Prepare initial demand for opposing counsel', CURRENT_DATE + 3, 'open'
FROM public.matters m
WHERE m.status = 'open'
ORDER BY m.created_at
LIMIT 1;
