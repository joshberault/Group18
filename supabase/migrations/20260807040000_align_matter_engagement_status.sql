-- Align legacy text engagement_status (pending/signed/not_required) with governance enum.

ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_engagement_status_check;

ALTER TABLE public.matters
  ALTER COLUMN engagement_status DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'matters'
      AND column_name = 'engagement_status'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.matters
      ALTER COLUMN engagement_status TYPE public.matter_engagement_status
      USING (
        CASE engagement_status::text
          WHEN 'pending' THEN 'not_started'::public.matter_engagement_status
          WHEN 'not_required' THEN 'signed'::public.matter_engagement_status
          WHEN 'not_started' THEN 'not_started'::public.matter_engagement_status
          WHEN 'letter_sent' THEN 'letter_sent'::public.matter_engagement_status
          WHEN 'signed' THEN 'signed'::public.matter_engagement_status
          WHEN 'declined' THEN 'declined'::public.matter_engagement_status
          ELSE 'not_started'::public.matter_engagement_status
        END
      );
  END IF;
END $$;

ALTER TABLE public.matters
  ALTER COLUMN engagement_status SET DEFAULT 'not_started'::public.matter_engagement_status;

ALTER TABLE public.matters
  ALTER COLUMN engagement_status SET NOT NULL;
