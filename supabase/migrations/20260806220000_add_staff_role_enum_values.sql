-- App role keys used by Firm Administrator employee roster.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'billing_specialist';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accounting_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'firm_administrator';
