-- =============================================================================
-- Analytics Dashboard Queries (SELECT only — review before running)
-- Group 18 / CounselFlow — Contract-to-Cash analytics
--
-- Conventions:
--   "Issued" invoices  = status NOT IN ('draft', 'void', 'cancelled')
--   "Collected"        = invoice.amount_paid (denormalized cash applied)
--   "Billed"           = invoice.total_amount on issued invoices
--   Active payments    = status IN ('pending','completed','partial','disputed')
-- =============================================================================


-- =============================================================================
-- 1. EXECUTIVE DASHBOARD KPIs
--    Single-row summary for top-of-dashboard KPI cards.
-- =============================================================================

WITH issued_invoices AS (
  SELECT *
  FROM public.invoices
  WHERE status NOT IN ('draft', 'void', 'cancelled')
),
matter_revenue AS (
  SELECT
    i.matter_id,
    SUM(i.amount_paid) AS collected_revenue,
    SUM(i.total_amount) AS billed_revenue
  FROM issued_invoices i
  GROUP BY i.matter_id
),
matter_costs AS (
  SELECT
    e.matter_id,
    SUM(e.amount) AS total_expenses
  FROM public.expenses e
  WHERE e.status NOT IN ('rejected')
  GROUP BY e.matter_id
),
matter_profit AS (
  SELECT
    COALESCE(r.matter_id, c.matter_id) AS matter_id,
    COALESCE(r.collected_revenue, 0) - COALESCE(c.total_expenses, 0) AS net_profit
  FROM matter_revenue r
  FULL OUTER JOIN matter_costs c ON c.matter_id = r.matter_id
),
unbilled_time AS (
  SELECT
    COALESCE(SUM(te.hours * COALESCE(m.hourly_rate, 0)), 0) AS unbilled_time_value
  FROM public.time_entries te
  INNER JOIN public.matters m ON m.id = te.matter_id
  WHERE te.is_billable = TRUE
    AND te.status IN ('pending', 'approved')
    AND m.status = 'open'
    AND m.billing_type = 'hourly'
    AND m.hourly_rate IS NOT NULL
)
SELECT
  -- Total revenue: billed vs collected
  (SELECT COALESCE(SUM(total_amount), 0) FROM issued_invoices) AS total_billed_revenue,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM issued_invoices) AS total_collected_revenue,

  -- Average matter profitability (collected revenue − matter expenses)
  (SELECT COALESCE(ROUND(AVG(net_profit), 2), 0) FROM matter_profit) AS avg_matter_profitability,

  -- Collection rate (%)
  (
    SELECT CASE
      WHEN COALESCE(SUM(total_amount), 0) = 0 THEN 0
      ELSE ROUND(100.0 * COALESCE(SUM(amount_paid), 0) / SUM(total_amount), 2)
    END
    FROM issued_invoices
  ) AS collection_rate_pct,

  -- Outstanding A/R (balance still due on issued invoices)
  (SELECT COALESCE(SUM(balance_due), 0) FROM issued_invoices) AS outstanding_ar,

  -- Current trust balance (firm-wide)
  (
    SELECT COALESCE(SUM(tab.current_balance), 0)
    FROM public.trust_account_balances tab
  ) AS current_trust_balance,

  -- Unbilled time value (approved/pending billable hours × matter rate)
  (SELECT unbilled_time_value FROM unbilled_time) AS unbilled_time_value;


-- Optional breakdown: revenue by invoice status (billed vs collected side-by-side)
-- Uncomment to run as a companion query for KPI drill-down.

/*
SELECT
  i.status,
  COUNT(*) AS invoice_count,
  COALESCE(SUM(i.total_amount), 0) AS billed_amount,
  COALESCE(SUM(i.amount_paid), 0) AS collected_amount,
  COALESCE(SUM(i.balance_due), 0) AS outstanding_amount
FROM public.invoices i
WHERE i.status NOT IN ('draft', 'void', 'cancelled')
GROUP BY i.status
ORDER BY billed_amount DESC;
*/


-- =============================================================================
-- 2. MONTHLY COLLECTIONS (last 6 months, by payment_date)
-- =============================================================================

SELECT
  DATE_TRUNC('month', p.payment_date)::DATE AS collection_month,
  TO_CHAR(DATE_TRUNC('month', p.payment_date), 'Mon YYYY') AS month_label,
  COUNT(*) AS payment_count,
  COALESCE(SUM(p.amount), 0) AS total_collected,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS completed_collected,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) AS pending_collected
FROM public.payments p
WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
  AND p.status IN ('pending', 'completed', 'partial', 'disputed')
GROUP BY DATE_TRUNC('month', p.payment_date)
ORDER BY collection_month;


-- =============================================================================
-- 3. MATTER PROFITABILITY (revenue, expenses, margin % by matter)
-- =============================================================================

WITH issued_invoices AS (
  SELECT *
  FROM public.invoices
  WHERE status NOT IN ('draft', 'void', 'cancelled')
),
matter_billing AS (
  SELECT
    i.matter_id,
    SUM(i.total_amount) AS billed_revenue,
    SUM(i.amount_paid) AS collected_revenue,
    SUM(i.balance_due) AS outstanding_ar
  FROM issued_invoices i
  GROUP BY i.matter_id
),
matter_expenses AS (
  SELECT
    e.matter_id,
    SUM(e.amount) AS total_expenses,
    SUM(e.amount) FILTER (WHERE e.status IN ('approved', 'pending')) AS unbilled_expenses,
    SUM(e.amount) FILTER (WHERE e.status IN ('billed', 'paid')) AS billed_expenses
  FROM public.expenses e
  WHERE e.status NOT IN ('rejected')
  GROUP BY e.matter_id
)
SELECT
  m.id AS matter_id,
  m.title AS matter_title,
  m.status AS matter_status,
  m.billing_type,
  COALESCE(c.company_name, c.name) AS client_name,
  pa.name AS practice_area,

  COALESCE(mb.billed_revenue, 0) AS billed_revenue,
  COALESCE(mb.collected_revenue, 0) AS collected_revenue,
  COALESCE(me.total_expenses, 0) AS total_expenses,
  COALESCE(mb.collected_revenue, 0) - COALESCE(me.total_expenses, 0) AS net_profit,

  CASE
    WHEN COALESCE(mb.collected_revenue, 0) = 0 THEN NULL
    ELSE ROUND(
      100.0 * (
        COALESCE(mb.collected_revenue, 0) - COALESCE(me.total_expenses, 0)
      ) / mb.collected_revenue,
      2
    )
  END AS margin_pct,

  COALESCE(mb.outstanding_ar, 0) AS outstanding_ar,
  COALESCE(me.unbilled_expenses, 0) AS unbilled_expenses

FROM public.matters m
INNER JOIN public.clients c ON c.id = m.client_id
LEFT JOIN public.practice_areas pa ON pa.id = m.practice_area_id
LEFT JOIN matter_billing mb ON mb.matter_id = m.id
LEFT JOIN matter_expenses me ON me.matter_id = m.id
WHERE COALESCE(mb.billed_revenue, 0) > 0
   OR COALESCE(me.total_expenses, 0) > 0
ORDER BY net_profit ASC, collected_revenue DESC;


-- =============================================================================
-- 4. RISK ALERTS
--    Unified feed — filter or group by alert_type in the dashboard UI.
--    Adjust thresholds in the params CTE as needed.
-- =============================================================================

WITH params AS (
  SELECT
    0::NUMERIC AS unprofitable_threshold,       -- net profit below this triggers alert
    500::NUMERIC AS large_write_down_threshold, -- pending write-down amount
    2500::NUMERIC AS low_trust_threshold        -- trust balance below this per scope
),
matter_financials AS (
  SELECT
    m.id AS matter_id,
    m.title AS matter_title,
    COALESCE(c.company_name, c.name) AS client_name,
    COALESCE(SUM(i.amount_paid), 0) AS collected_revenue,
    COALESCE(SUM(e.amount) FILTER (WHERE e.status NOT IN ('rejected')), 0) AS total_expenses
  FROM public.matters m
  INNER JOIN public.clients c ON c.id = m.client_id
  LEFT JOIN public.invoices i
    ON i.matter_id = m.id
   AND i.status NOT IN ('draft', 'void', 'cancelled')
  LEFT JOIN public.expenses e ON e.matter_id = m.id
  GROUP BY m.id, m.title, c.company_name, c.name
),
unprofitable_matters AS (
  SELECT
    'unprofitable_matter'::TEXT AS alert_type,
    'high'::TEXT AS severity,
    mf.matter_id,
    mf.matter_title,
    mf.client_name,
    NULL::UUID AS invoice_id,
    NULL::TEXT AS invoice_number,
    (mf.collected_revenue - mf.total_expenses) AS amount,
    FORMAT(
      'Matter net profit %s (collected %s − expenses %s)',
      TO_CHAR(mf.collected_revenue - mf.total_expenses, 'FM$999,999,990.00'),
      TO_CHAR(mf.collected_revenue, 'FM$999,999,990.00'),
      TO_CHAR(mf.total_expenses, 'FM$999,999,990.00')
    ) AS alert_message,
    CURRENT_DATE AS alert_date
  FROM matter_financials mf
  CROSS JOIN params p
  WHERE (mf.collected_revenue - mf.total_expenses) < p.unprofitable_threshold
    AND (mf.collected_revenue > 0 OR mf.total_expenses > 0)
),
overdue_invoices AS (
  SELECT
    'overdue_30_plus'::TEXT AS alert_type,
    CASE
      WHEN i.due_date < CURRENT_DATE - INTERVAL '60 days' THEN 'high'
      ELSE 'medium'
    END AS severity,
    i.matter_id,
    m.title AS matter_title,
    COALESCE(c.company_name, c.name) AS client_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.balance_due AS amount,
    FORMAT(
      'Invoice %s overdue since %s — %s outstanding (%s days)',
      i.invoice_number,
      TO_CHAR(i.due_date, 'Mon DD, YYYY'),
      TO_CHAR(i.balance_due, 'FM$999,999,990.00'),
      (CURRENT_DATE - i.due_date)
    ) AS alert_message,
    i.due_date AS alert_date
  FROM public.invoices i
  INNER JOIN public.matters m ON m.id = i.matter_id
  INNER JOIN public.clients c ON c.id = i.client_id
  WHERE i.status IN ('sent', 'partial', 'overdue', 'disputed')
    AND i.balance_due > 0
    AND i.due_date < CURRENT_DATE - INTERVAL '30 days'
),
pending_write_downs AS (
  SELECT
    'large_write_down_pending'::TEXT AS alert_type,
    CASE
      WHEN wd.amount >= p.large_write_down_threshold * 2 THEN 'high'
      ELSE 'medium'
    END AS severity,
    wd.matter_id,
    m.title AS matter_title,
    COALESCE(c.company_name, c.name) AS client_name,
    wd.invoice_id,
    i.invoice_number,
    wd.amount,
    FORMAT(
      'Pending write-down %s on %s — %s (%s)',
      TO_CHAR(wd.amount, 'FM$999,999,990.00'),
      i.invoice_number,
      wd.reason::TEXT,
      wd.description
    ) AS alert_message,
    wd.write_down_date AS alert_date
  FROM public.write_downs wd
  INNER JOIN public.invoices i ON i.id = wd.invoice_id
  INNER JOIN public.matters m ON m.id = wd.matter_id
  INNER JOIN public.clients c ON c.id = wd.client_id
  CROSS JOIN params p
  WHERE wd.status = 'pending'
    AND wd.amount >= p.large_write_down_threshold
),
low_trust_balances AS (
  SELECT
    'low_trust_balance'::TEXT AS alert_type,
    CASE
      WHEN tab.current_balance = 0 THEN 'high'
      ELSE 'medium'
    END AS severity,
    tab.matter_id,
    m.title AS matter_title,
    COALESCE(c.company_name, c.name) AS client_name,
    NULL::UUID AS invoice_id,
    NULL::TEXT AS invoice_number,
    tab.current_balance AS amount,
    FORMAT(
      'Trust balance %s for %s (as of %s)',
      TO_CHAR(tab.current_balance, 'FM$999,999,990.00'),
      COALESCE(m.title, 'client-level account'),
      TO_CHAR(tab.as_of_date, 'Mon DD, YYYY')
    ) AS alert_message,
    tab.as_of_date AS alert_date
  FROM public.trust_account_balances tab
  INNER JOIN public.clients c ON c.id = tab.client_id
  LEFT JOIN public.matters m ON m.id = tab.matter_id
  CROSS JOIN params p
  WHERE tab.current_balance < p.low_trust_threshold
    AND m.status = 'open'
)
SELECT * FROM unprofitable_matters
UNION ALL
SELECT * FROM overdue_invoices
UNION ALL
SELECT * FROM pending_write_downs
UNION ALL
SELECT * FROM low_trust_balances
ORDER BY severity DESC, alert_type, amount DESC;
