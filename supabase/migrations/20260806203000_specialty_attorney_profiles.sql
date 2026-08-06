-- Specialty demo attorneys: one profile per practice area (Corporate, Employment, Litigation, Real Estate).
-- Does not modify clients schema. Adds profiles + reassigns matter_assignments for CL-20xx pipeline.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS practice_area_id UUID REFERENCES public.practice_areas(id) ON DELETE SET NULL;

-- Stable demo attorney UUIDs (must exist in auth.users for profiles FK)
-- Litigation uses existing George Giddens profile.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  corp_id UUID := 'bbbb0101-0001-4001-8001-000000000001';
  emp_id UUID := 'bbbb0102-0001-4001-8001-000000000002';
  re_id UUID := 'bbbb0103-0001-4001-8001-000000000003';
  george_id UUID := '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384';
  instance UUID := '00000000-0000-0000-0000-000000000000';
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        (
          corp_id,
          'jordan.brooks@demo.counselflow.example',
          'Jordan Brooks'
        ),
        (
          emp_id,
          'taylor.ellis@demo.counselflow.example',
          'Taylor Ellis'
        ),
        (
          re_id,
          'riley.grant@demo.counselflow.example',
          'Riley Grant'
        )
    ) AS t(user_id, email, full_name)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = rec.user_id) THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        instance,
        rec.user_id,
        'authenticated',
        'authenticated',
        rec.email,
        crypt('DemoAttorney2026!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.full_name, 'role', 'attorney'),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      );

      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        rec.user_id::text,
        rec.user_id,
        jsonb_build_object(
          'sub', rec.user_id::text,
          'email', rec.email,
          'email_verified', true
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
    END IF;

    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (rec.user_id, rec.full_name, rec.email, 'attorney')
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = 'attorney';
  END LOOP;

  UPDATE public.profiles
  SET practice_area_id = pa.id
  FROM public.practice_areas pa
  WHERE profiles.id = corp_id AND pa.name = 'Corporate';

  UPDATE public.profiles
  SET practice_area_id = pa.id
  FROM public.practice_areas pa
  WHERE profiles.id = emp_id AND pa.name = 'Employment';

  UPDATE public.profiles
  SET practice_area_id = pa.id
  FROM public.practice_areas pa
  WHERE profiles.id = george_id AND pa.name = 'Litigation';

  UPDATE public.profiles
  SET practice_area_id = pa.id
  FROM public.practice_areas pa
  WHERE profiles.id = re_id AND pa.name = 'Real Estate';
END $$;

-- Reassign pipeline matter lead attorneys by matter practice area
DELETE FROM public.matter_assignments ma
USING public.matters m
JOIN public.clients c ON c.id = m.client_id
WHERE ma.matter_id = m.id
  AND c.client_number LIKE 'CL-20%';

INSERT INTO public.matter_assignments (matter_id, profile_id, role_on_matter)
SELECT
  m.id,
  CASE pa.name
    WHEN 'Corporate' THEN 'bbbb0101-0001-4001-8001-000000000001'::uuid
    WHEN 'Employment' THEN 'bbbb0102-0001-4001-8001-000000000002'::uuid
    WHEN 'Real Estate' THEN 'bbbb0103-0001-4001-8001-000000000003'::uuid
    WHEN 'Intellectual Property' THEN 'bbbb0101-0001-4001-8001-000000000001'::uuid
    ELSE '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'::uuid
  END,
  'lead_attorney'
FROM public.matters m
JOIN public.clients c ON c.id = m.client_id
JOIN public.practice_areas pa ON pa.id = m.practice_area_id
WHERE c.client_number LIKE 'CL-20%';
