-- Attorney Workflow (George Giddens) + minimal shared stubs
-- Joseph owns full client/matter management; these stubs let attorney workflow run independently.

-- Enums
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'manager',
  'attorney',
  'paralegal',
  'staffer',
  'client'
);

CREATE TYPE public.billing_type AS ENUM (
  'hourly',
  'fixed_fee',
  'retainer',
  'contingency'
);

CREATE TYPE public.approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE public.matter_status AS ENUM (
  'open',
  'closed',
  'archived'
);

CREATE TYPE public.task_status AS ENUM (
  'open',
  'in_progress',
  'completed'
);

-- Profiles (Reagan will extend for admin/employees; needed now for RLS)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'attorney',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shared stubs (Joseph owns full CRUD UI)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company_name TEXT,
  is_company BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.practice_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  practice_area_id UUID REFERENCES public.practice_areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.matter_status NOT NULL DEFAULT 'open',
  billing_type public.billing_type NOT NULL DEFAULT 'hourly',
  hourly_rate NUMERIC(10, 2),
  fixed_fee_amount NUMERIC(12, 2),
  retainer_amount NUMERIC(12, 2),
  retainer_balance NUMERIC(12, 2),
  expense_terms TEXT,
  engagement_letter_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.matter_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_on_matter TEXT NOT NULL DEFAULT 'lead_attorney',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (matter_id, profile_id)
);

-- Attorney workflow tables (George owns)
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC(6, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT NOT NULL,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status public.task_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.attorney_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attorney-side expense submissions (Josh accounting integrates later)
CREATE TABLE public.expense_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpers
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_staff_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'manager', 'attorney', 'paralegal', 'staffer') FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'manager') FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_matter(target_matter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matter_assignments
    WHERE matter_id = target_matter_id
      AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attorney_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Shared read stubs for staff
CREATE POLICY "Staff can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

CREATE POLICY "Staff can view practice areas"
  ON public.practice_areas FOR SELECT
  TO authenticated
  USING (public.is_staff_role());

CREATE POLICY "Staff can view assigned matters"
  ON public.matters FOR SELECT
  TO authenticated
  USING (
    public.is_manager_or_admin()
    OR public.is_assigned_to_matter(id)
  );

CREATE POLICY "Staff can view relevant assignments"
  ON public.matter_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_manager_or_admin()
    OR profile_id = auth.uid()
  );

-- Time entries
CREATE POLICY "Staff insert own time entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND public.is_staff_role()
    AND public.is_assigned_to_matter(matter_id)
  );

CREATE POLICY "Staff view own time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    (profile_id = auth.uid() AND public.is_staff_role())
    OR public.is_manager_or_admin()
  );

CREATE POLICY "Managers update time entry status"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- Expense submissions
CREATE POLICY "Staff insert own expense submissions"
  ON public.expense_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND public.is_staff_role()
    AND public.is_assigned_to_matter(matter_id)
  );

CREATE POLICY "Staff view own expense submissions"
  ON public.expense_submissions FOR SELECT
  TO authenticated
  USING (
    (profile_id = auth.uid() AND public.is_staff_role())
    OR public.is_manager_or_admin()
  );

CREATE POLICY "Managers update expense submission status"
  ON public.expense_submissions FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_admin())
  WITH CHECK (public.is_manager_or_admin());

-- Tasks
CREATE POLICY "Staff manage own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (profile_id = auth.uid() AND public.is_staff_role())
  WITH CHECK (profile_id = auth.uid() AND public.is_staff_role());

CREATE POLICY "Managers view all tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

-- Deadlines (visible on assigned matters)
CREATE POLICY "Staff view deadlines on assigned matters"
  ON public.deadlines FOR SELECT
  TO authenticated
  USING (
    public.is_manager_or_admin()
    OR public.is_assigned_to_matter(matter_id)
  );

-- Attorney notes
CREATE POLICY "Staff manage own notes"
  ON public.attorney_notes FOR ALL
  TO authenticated
  USING (profile_id = auth.uid() AND public.is_staff_role())
  WITH CHECK (profile_id = auth.uid() AND public.is_staff_role());

CREATE POLICY "Managers view all notes"
  ON public.attorney_notes FOR SELECT
  TO authenticated
  USING (public.is_manager_or_admin());

-- Seed data (no auth users yet; link profiles after creating users in Supabase Auth)
INSERT INTO public.practice_areas (name) VALUES
  ('Litigation'),
  ('Corporate'),
  ('Real Estate'),
  ('Employment'),
  ('Intellectual Property');

INSERT INTO public.clients (name, email, company_name, is_company, conflict_flag) VALUES
  ('Robert Chen', 'rchen@example.com', 'Chen Manufacturing LLC', TRUE, FALSE),
  ('Maria Santos', 'msantos@example.com', NULL, FALSE, FALSE),
  ('Northside Medical Group', 'legal@northsidemed.example', 'Northside Medical Group', TRUE, TRUE),
  ('James & Partners LLP', 'contact@jpartners.example', 'James & Partners LLP', TRUE, FALSE);

INSERT INTO public.matters (
  client_id,
  practice_area_id,
  title,
  description,
  status,
  billing_type,
  hourly_rate,
  fixed_fee_amount,
  retainer_amount,
  retainer_balance,
  expense_terms
)
SELECT
  c.id,
  pa.id,
  m.title,
  m.description,
  m.status::public.matter_status,
  m.billing_type::public.billing_type,
  m.hourly_rate,
  m.fixed_fee_amount,
  m.retainer_amount,
  m.retainer_balance,
  m.expense_terms
FROM (
  VALUES
    ('Chen Manufacturing LLC', 'Litigation', 'Chen v. Apex Supply Dispute', 'Breach of supply contract', 'open', 'hourly', 350.00, NULL, NULL, NULL, 'Filing fees, expert witnesses, travel'),
    ('Maria Santos', 'Employment', 'Santos Wrongful Termination', 'Employment discrimination claim', 'open', 'retainer', NULL, NULL, 15000.00, 11250.00, 'Court costs, deposition transcripts'),
    ('Northside Medical Group', 'Corporate', 'Northside Asset Purchase', 'Acquisition of clinic network', 'open', 'fixed_fee', NULL, 45000.00, NULL, NULL, 'Due diligence vendors billed separately'),
    ('James & Partners LLP', 'Real Estate', 'Riverside Office Lease', 'Commercial lease negotiation', 'open', 'hourly', 275.00, NULL, NULL, NULL, 'Recording fees, title search'),
    ('Maria Santos', 'Litigation', 'Santos Personal Injury', 'Slip and fall claim', 'closed', 'contingency', NULL, NULL, NULL, NULL, 'Medical records, investigation costs')
) AS m(client_name, practice_area, title, description, status, billing_type, hourly_rate, fixed_fee_amount, retainer_amount, retainer_balance, expense_terms)
JOIN public.clients c ON c.name = m.client_name OR c.company_name = m.client_name
JOIN public.practice_areas pa ON pa.name = m.practice_area;
