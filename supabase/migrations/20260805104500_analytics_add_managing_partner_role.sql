-- Add managing_partner to user_role (must run before analytics_financial_rls)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'managing_partner';
