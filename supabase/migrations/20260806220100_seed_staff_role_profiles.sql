-- Seed one employee profile per internal firm role (auth.users + profiles).
-- Requires: 20260806220000_add_staff_role_enum_values.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  instance UUID := '00000000-0000-0000-0000-000000000000';
  lit_pa UUID;
  rec RECORD;
BEGIN
  SELECT id INTO lit_pa FROM public.practice_areas WHERE name = 'Litigation' LIMIT 1;

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        (
          'bbbb0201-0001-4001-8001-000000000001'::uuid,
          'morgan.counsel@demo.counselflow.example',
          'Morgan Counsel',
          'managing_partner'::public.user_role
        ),
        (
          'bbbb0202-0001-4001-8001-000000000002'::uuid,
          'parker.legal@demo.counselflow.example',
          'Parker Legal',
          'paralegal'::public.user_role
        ),
        (
          'bbbb0203-0001-4001-8001-000000000003'::uuid,
          'bailey.ledger@demo.counselflow.example',
          'Bailey Ledger',
          'billing_specialist'::public.user_role
        ),
        (
          'bbbb0204-0001-4001-8001-000000000004'::uuid,
          'alex.morgan@demo.counselflow.example',
          'Alex Morgan',
          'accounting_manager'::public.user_role
        ),
        (
          'bbbb0205-0001-4001-8001-000000000005'::uuid,
          'jordan.admin@demo.counselflow.example',
          'Jordan Admin',
          'firm_administrator'::public.user_role
        )
    ) AS t(user_id, email, full_name, user_role)
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
        crypt('DemoStaff2026!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.full_name, 'role', rec.user_role::text),
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

    INSERT INTO public.profiles (id, full_name, email, role, practice_area_id)
    VALUES (
      rec.user_id,
      rec.full_name,
      rec.email,
      rec.user_role,
      CASE
        WHEN rec.user_role IN ('managing_partner', 'paralegal') THEN lit_pa
        ELSE NULL
      END
    )
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          practice_area_id = EXCLUDED.practice_area_id;
  END LOOP;
END $$;
