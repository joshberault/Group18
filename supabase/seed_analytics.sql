-- Analytics seed data for Group 18 Project (mid-sized firm scenarios)
-- Uses existing clients, matters, and George Giddens profile from attorney_workflow seed.
-- Paste entire block into Supabase SQL Editor.

BEGIN;

-- ---------------------------------------------------------------------------
-- Reference IDs (from live project)
-- Profile: 4a0bef63-d0d2-4ca9-aa8f-69082b6c5384 (George Giddens)
-- Chen:     client 2eebbe07-da6f-4aa0-b1d8-d713b8b32330 / matter 830af589-cb26-4414-8552-6306a3cfd8c1
-- James:    client bc81bdb8-d8e1-43b8-bf31-55370add8924 / matter a08bf4fd-44ec-4c84-9a94-be0c483c8e84
-- Santos PI: client 4fad89fa-93c5-49e1-bdd1-9f566019fcdb / matter 702637bb-f340-4793-9170-6dc68e116c40
-- Santos WT: client 4fad89fa-93c5-49e1-bdd1-9f566019fcdb / matter bc8fccbe-ca07-45a3-baa2-78614ab6fe43
-- Northside: client 171d4853-2f7f-4f03-881d-349fe110e450 / matter 90fe2894-11c3-4e21-8b14-ff2cc56b4d1c
-- ---------------------------------------------------------------------------

-- ===================== 1. INVOICES (18) =====================

INSERT INTO public.invoices (
  id, matter_id, client_id, created_by, invoice_number, status, billing_type,
  billing_period_start, billing_period_end, invoice_date, due_date, sent_at, paid_at,
  subtotal_time, subtotal_expenses, subtotal_fees, retainer_applied, tax_amount, total_amount,
  amount_paid, amount_written_down, balance_due, notes
) VALUES
-- Chen v. Apex Supply (hourly litigation)
('b1000001-0001-4001-8001-000000000001', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0101', 'paid', 'hourly', '2025-01-01', '2025-01-31', '2025-02-05', '2025-03-07', '2025-02-05T16:00:00Z', '2025-02-28T14:30:00Z',
 10200.00, 1200.00, 0, 0, 850.00, 12250.00, 12250.00, 0, 0, 'January litigation — discovery phase'),

('b1000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0102', 'partial', 'hourly', '2025-02-01', '2025-02-28', '2025-03-05', '2025-04-04', '2025-03-05T16:00:00Z', NULL,
 7200.00, 650.00, 0, 0, 630.00, 8480.00, 5000.00, 200.00, 3280.00, 'February — depositions; client paying on installment plan'),

('b1000001-0001-4001-8001-000000000003', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0103', 'overdue', 'hourly', '2025-03-01', '2025-03-31', '2025-04-05', '2025-05-05', '2025-04-05T16:00:00Z', NULL,
 12800.00, 1450.00, 0, 0, 950.00, 15200.00, 2500.00, 800.00, 11900.00, 'March — expert witness prep; 45 days past due'),

('b1000001-0001-4001-8001-000000000004', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0104', 'disputed', 'hourly', '2025-04-01', '2025-04-30', '2025-05-05', '2025-06-04', '2025-05-05T16:00:00Z', NULL,
 5400.00, 520.00, 0, 0, 380.00, 6300.00, 2000.00, 800.00, 3500.00, 'Client disputing 12 hrs research time'),

('b1000001-0001-4001-8001-000000000005', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0105', 'sent', 'hourly', '2025-05-01', '2025-05-31', '2025-06-05', '2025-07-05', '2025-06-05T16:00:00Z', NULL,
 3800.00, 420.00, 0, 0, 330.00, 4550.00, 0, 0, 4550.00, 'May — motion to compel drafting'),

('b1000001-0001-4001-8001-000000000006', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0106', 'draft', 'hourly', '2025-06-01', '2025-06-30', '2025-07-01', '2025-08-01', NULL, NULL,
 1750.00, 200.00, 0, 0, 150.00, 2100.00, 0, 0, 2100.00, 'June — not yet sent to client'),

-- Riverside Office Lease (hourly real estate)
('b1000001-0001-4001-8001-000000000007', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0201', 'paid', 'hourly', '2025-01-01', '2025-01-31', '2025-02-03', '2025-03-05', '2025-02-03T16:00:00Z', '2025-02-20T11:00:00Z',
 3200.00, 450.00, 0, 0, 200.00, 3850.00, 3850.00, 0, 0, 'Lease review and redlines — January'),

('b1000001-0001-4001-8001-000000000008', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0202', 'partial', 'hourly', '2025-02-01', '2025-02-28', '2025-03-03', '2025-04-02', '2025-03-03T16:00:00Z', NULL,
 4600.00, 600.00, 0, 0, 300.00, 5500.00, 3000.00, 500.00, 2000.00, 'Negotiation sessions — partial payment received'),

('b1000001-0001-4001-8001-000000000009', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0203', 'overdue', 'hourly', '2025-03-01', '2025-03-31', '2025-04-03', '2025-05-03', '2025-04-03T16:00:00Z', NULL,
 2200.00, 350.00, 0, 0, 200.00, 2750.00, 750.00, 750.00, 1250.00, 'Final lease terms — late payment, impairment pending'),

-- Santos Personal Injury (contingency — unprofitable closed matter)
('b1000001-0001-4001-8001-000000000010', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0301', 'paid', 'contingency', '2024-06-01', '2025-01-15', '2025-01-20', '2025-02-19', '2025-01-20T16:00:00Z', '2025-02-10T09:00:00Z',
 0, 0, 45000.00, 0, 0, 45000.00, 45000.00, 0, 0, 'Contingency fee — settled slip-and-fall for $150K'),

('b1000001-0001-4001-8001-000000000011', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0302', 'disputed', 'contingency', '2024-01-01', '2024-12-31', '2025-01-05', '2025-02-04', '2025-01-05T16:00:00Z', NULL,
 8200.00, 3400.00, 0, 0, 0, 11600.00, 3500.00, 4500.00, 3600.00, 'Cost recovery invoice — costs exceed client recovery'),

-- Santos Wrongful Termination (retainer employment)
('b1000001-0001-4001-8001-000000000012', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0401', 'partial', 'retainer', '2025-01-01', '2025-03-31', '2025-04-05', '2025-05-05', '2025-04-05T16:00:00Z', NULL,
 14200.00, 980.00, 0, 3750.00, 1120.00, 12550.00, 8000.00, 550.00, 4000.00, 'Q1 retainer draw — trust + ACH payments'),

('b1000001-0001-4001-8001-000000000013', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0402', 'paid', 'retainer', '2025-04-01', '2025-04-30', '2025-05-05', '2025-06-04', '2025-05-05T16:00:00Z', '2025-05-20T10:00:00Z',
 6200.00, 400.00, 0, 750.00, 400.00, 6250.00, 6250.00, 0, 0, 'April — EEOC response and mediation prep'),

('b1000001-0001-4001-8001-000000000014', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0403', 'sent', 'retainer', '2025-05-01', '2025-05-31', '2025-06-05', '2025-07-05', '2025-06-05T16:00:00Z', NULL,
 4200.00, 350.00, 0, 0, 450.00, 5000.00, 0, 0, 5000.00, 'May — discovery requests outstanding'),

-- Northside Asset Purchase (fixed fee M&A)
('b1000001-0001-4001-8001-000000000015', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0501', 'paid', 'fixed_fee', '2025-01-01', '2025-02-28', '2025-03-01', '2025-03-31', '2025-03-01T16:00:00Z', '2025-03-15T14:00:00Z',
 0, 0, 22500.00, 0, 0, 22500.00, 22500.00, 0, 0, 'Milestone 1 — LOI and due diligence'),

('b1000001-0001-4001-8001-000000000016', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0502', 'partial', 'fixed_fee', '2025-03-01', '2025-05-31', '2025-06-01', '2025-07-01', '2025-06-01T16:00:00Z', NULL,
 0, 0, 22500.00, 0, 0, 22500.00, 11250.00, 0, 11250.00, 'Milestone 2 — definitive agreement drafting'),

('b1000001-0001-4001-8001-000000000017', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0503', 'draft', 'fixed_fee', '2025-06-01', '2025-08-31', '2025-07-01', '2025-08-01', NULL, NULL,
 0, 0, 22500.00, 0, 0, 22500.00, 0, 0, 22500.00, 'Milestone 3 — closing (draft, deal pending)'),

('b1000001-0001-4001-8001-000000000018', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384',
 'INV-2025-0504', 'overdue', 'fixed_fee', '2025-02-01', '2025-02-28', '2025-03-01', '2025-03-31', '2025-03-01T16:00:00Z', NULL,
 0, 0, 11250.00, 0, 0, 11250.00, 0, 0, 11250.00, 'Supplemental regulatory filing fee — 90+ days overdue');

-- ===================== 2. TRUST ACCOUNTS (18) — insert before trust-linked payments =====================

INSERT INTO public.trust_accounts (
  id, client_id, matter_id, transaction_type, transaction_date, amount, balance_after,
  description, reference_number, reference_type, reference_id, recorded_by
) VALUES
-- Santos Wrongful Termination retainer ledger (chronological)
('c2000001-0001-4001-8001-000000000001', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'deposit', '2025-01-10', 15000.00, 15000.00, 'Initial retainer deposit — Santos employment matter', 'TR-2025-001', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000002', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'invoice_application', '2025-04-05', -3750.00, 11250.00, 'Retainer applied to INV-2025-0401', 'TR-2025-002', 'invoice', 'b1000001-0001-4001-8001-000000000012', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000003', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'deposit', '2025-04-12', 5000.00, 16250.00, 'Retainer replenishment after Q1 draw', 'TR-2025-003', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000004', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'invoice_application', '2025-05-20', -6250.00, 10000.00, 'Trust payment applied to INV-2025-0402', 'TR-2025-004', 'invoice', 'b1000001-0001-4001-8001-000000000013', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000005', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'withdrawal', '2025-05-22', -2000.00, 8000.00, 'Administrative hold release to operating', 'TR-2025-005', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000006', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'deposit', '2025-05-28', 3500.00, 11500.00, 'Client wire — additional retainer funds', 'TR-2025-006', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000007', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'invoice_application', '2025-05-30', -5000.00, 6500.00, 'Trust transfer payment on INV-2025-0401', 'TR-2025-007', 'payment', 'd3000001-0001-4001-8001-000000000014', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000008', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'transfer_out', '2025-06-02', -1500.00, 5000.00, 'Transfer to firm operating account', 'TR-2025-008', 'transfer', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000009', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'deposit', '2025-06-10', 4000.00, 9000.00, 'Mid-year retainer top-up', 'TR-2025-009', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000010', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43',
 'adjustment', '2025-06-15', 500.00, 9500.00, 'IOLTA interest allocation correction', 'TR-2025-010', 'other', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

-- Northside acquisition escrow
('c2000001-0001-4001-8001-000000000011', '171d4853-2f7f-4f03-881d-349fe110e450', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c',
 'deposit', '2025-01-20', 50000.00, 50000.00, 'Acquisition escrow deposit — clinic network deal', 'TR-2025-011', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000012', '171d4853-2f7f-4f03-881d-349fe110e450', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c',
 'withdrawal', '2025-03-05', -15000.00, 35000.00, 'Earnest money release to seller', 'TR-2025-012', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000013', '171d4853-2f7f-4f03-881d-349fe110e450', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c',
 'invoice_application', '2025-03-18', -22500.00, 12500.00, 'Milestone 1 legal fees from escrow', 'TR-2025-013', 'invoice', 'b1000001-0001-4001-8001-000000000015', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000014', '171d4853-2f7f-4f03-881d-349fe110e450', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c',
 'transfer_in', '2025-05-01', 10000.00, 22500.00, 'Additional escrow from co-counsel transfer', 'TR-2025-014', 'transfer', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

-- Chen litigation trust (smaller retainer pool)
('c2000001-0001-4001-8001-000000000015', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '830af589-cb26-4414-8552-6306a3cfd8c1',
 'deposit', '2025-02-10', 10000.00, 10000.00, 'Litigation retainer — Chen v. Apex', 'TR-2025-015', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000016', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '830af589-cb26-4414-8552-6306a3cfd8c1',
 'withdrawal', '2025-04-01', -3500.00, 6500.00, 'Court filing fees disbursed from trust', 'TR-2025-016', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000017', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '830af589-cb26-4414-8552-6306a3cfd8c1',
 'invoice_application', '2025-05-15', -2500.00, 4000.00, 'Partial trust payment toward overdue invoice', 'TR-2025-017', 'invoice', 'b1000001-0001-4001-8001-000000000003', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384'),

('c2000001-0001-4001-8001-000000000018', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330', '830af589-cb26-4414-8552-6306a3cfd8c1',
 'refund', '2025-06-20', -500.00, 3500.00, 'Overpayment refund to Chen Manufacturing', 'TR-2025-018', 'manual', NULL, '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384');

-- ===================== 3. WRITE-DOWNS (18) — before payments so triggers validate =====================

INSERT INTO public.write_downs (
  id, invoice_id, matter_id, client_id, amount, reason, description, status,
  requested_by, approved_by, approved_at, write_down_date
) VALUES
-- Approved (affect invoice balance_due)
('e4000001-0001-4001-8001-000000000001', 'b1000001-0001-4001-8001-000000000004', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 800.00, 'client_dispute', 'Client refused 4 hrs of paralegal research time', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-20T15:00:00Z', '2025-05-18'),

('e4000001-0001-4001-8001-000000000002', 'b1000001-0001-4001-8001-000000000011', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 4500.00, 'collections_impairment', 'Partial cost recovery on unprofitable PI matter', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-01T10:00:00Z', '2025-01-28'),

('e4000001-0001-4001-8001-000000000003', 'b1000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 200.00, 'billing_error', 'Duplicate expense pass-through corrected', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-04-10T11:00:00Z', '2025-04-08'),

('e4000001-0001-4001-8001-000000000004', 'b1000001-0001-4001-8001-000000000003', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 800.00, 'billing_error', 'Expert report fee billed twice in March invoice', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-06-01T09:00:00Z', '2025-05-28'),

('e4000001-0001-4001-8001-000000000005', 'b1000001-0001-4001-8001-000000000008', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 500.00, 'client_dispute', 'Negotiation hours capped per engagement letter', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-04-15T14:00:00Z', '2025-04-12'),

('e4000001-0001-4001-8001-000000000006', 'b1000001-0001-4001-8001-000000000009', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 750.00, 'collections_impairment', 'Uncollectible balance — client cash flow issues', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-06-10T16:00:00Z', '2025-06-08'),

('e4000001-0001-4001-8001-000000000007', 'b1000001-0001-4001-8001-000000000012', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 550.00, 'courtesy_adjustment', 'Goodwill credit for mediation cancellation fee', 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-25T12:00:00Z', '2025-05-22'),

-- Pending (awaiting partner approval)
('e4000001-0001-4001-8001-000000000008', 'b1000001-0001-4001-8001-000000000004', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 500.00, 'billing_error', 'Additional hours flagged in billing review', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-06-05'),

('e4000001-0001-4001-8001-000000000009', 'b1000001-0001-4001-8001-000000000003', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 1200.00, 'courtesy_adjustment', 'Requested fee reduction for long-standing client', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-06-12'),

('e4000001-0001-4001-8001-000000000010', 'b1000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 3280.00, 'partner_write_off', 'Partner proposal to forgive remaining balance', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-06-18'),

('e4000001-0001-4001-8001-000000000011', 'b1000001-0001-4001-8001-000000000016', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 2000.00, 'partner_write_off', 'Deal delay — proposed milestone fee reduction', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-07-02'),

('e4000001-0001-4001-8001-000000000012', 'b1000001-0001-4001-8001-000000000018', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 1125.00, 'courtesy_adjustment', '10% courtesy discount on overdue supplemental invoice', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-06-20'),

('e4000001-0001-4001-8001-000000000013', 'b1000001-0001-4001-8001-000000000014', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 1000.00, 'partner_write_off', 'Proposed write-off for unused May retainer hours', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-07-08'),

('e4000001-0001-4001-8001-000000000014', 'b1000001-0001-4001-8001-000000000005', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 455.00, 'client_dispute', 'Client pre-dispute on motion drafting hours', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-06-22'),

('e4000001-0001-4001-8001-000000000015', 'b1000001-0001-4001-8001-000000000017', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 5000.00, 'collections_impairment', 'Anticipated impairment if deal terminates', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-07-05'),

('e4000001-0001-4001-8001-000000000016', 'b1000001-0001-4001-8001-000000000006', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 2100.00, 'partner_write_off', 'Draft invoice — partner considering full write-off', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-07-10'),

('e4000001-0001-4001-8001-000000000017', 'b1000001-0001-4001-8001-000000000007', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 150.00, 'billing_error', 'Minor rounding discrepancy flagged in audit', 'pending',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-03-01'),

-- Rejected
('e4000001-0001-4001-8001-000000000018', 'b1000001-0001-4001-8001-000000000011', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 1200.00, 'client_dispute', 'Client rejected cost allocation — denied by partner', 'rejected',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL, NULL, '2025-02-15');

-- ===================== 4. PAYMENTS (19) =====================

INSERT INTO public.payments (
  id, invoice_id, matter_id, client_id, recorded_by, payment_date, amount,
  payment_method, status, reference_number, notes, trust_account_entry_id
) VALUES
-- Chen payments
('d3000001-0001-4001-8001-000000000001', 'b1000001-0001-4001-8001-000000000001', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-15', 8000.00, 'ach', 'completed', 'ACH-88421', 'First installment — INV-2025-0101', NULL),

('d3000001-0001-4001-8001-000000000002', 'b1000001-0001-4001-8001-000000000001', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-28', 4250.00, 'check', 'completed', 'CHK-11042', 'Final payment — INV-2025-0101', NULL),

('d3000001-0001-4001-8001-000000000003', 'b1000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-03-20', 3000.00, 'check', 'completed', 'CHK-11058', 'Partial — INV-2025-0102', NULL),

('d3000001-0001-4001-8001-000000000004', 'b1000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-04-18', 2000.00, 'ach', 'partial', 'ACH-88503', 'Second partial — INV-2025-0102', NULL),

('d3000001-0001-4001-8001-000000000005', 'b1000001-0001-4001-8001-000000000003', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-06-01', 2500.00, 'wire', 'partial', 'WIR-22015', 'Late partial on overdue invoice', NULL),

('d3000001-0001-4001-8001-000000000006', 'b1000001-0001-4001-8001-000000000004', '830af589-cb26-4414-8552-6306a3cfd8c1', '2eebbe07-da6f-4aa0-b1d8-d713b8b32330',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-25', 2000.00, 'check', 'disputed', 'CHK-11089', 'Partial pay before dispute escalated', NULL),

-- James payments
('d3000001-0001-4001-8001-000000000007', 'b1000001-0001-4001-8001-000000000007', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-20', 3850.00, 'ach', 'completed', 'ACH-88102', 'Full payment — lease review', NULL),

('d3000001-0001-4001-8001-000000000008', 'b1000001-0001-4001-8001-000000000008', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-03-25', 2000.00, 'check', 'completed', 'CHK-22001', 'Partial — negotiation phase', NULL),

('d3000001-0001-4001-8001-000000000009', 'b1000001-0001-4001-8001-000000000008', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-04-30', 1000.00, 'check', 'pending', 'CHK-22018', 'Pending check clearance', NULL),

('d3000001-0001-4001-8001-000000000010', 'b1000001-0001-4001-8001-000000000009', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', 'bc81bdb8-d8e1-43b8-bf31-55370add8924',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-28', 750.00, 'check', 'partial', 'CHK-22031', 'Late partial on overdue lease invoice', NULL),

-- Santos PI payments
('d3000001-0001-4001-8001-000000000011', 'b1000001-0001-4001-8001-000000000010', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-25', 25000.00, 'wire', 'completed', 'WIR-19801', 'Settlement fee — first wire', NULL),

('d3000001-0001-4001-8001-000000000012', 'b1000001-0001-4001-8001-000000000010', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-10', 20000.00, 'wire', 'completed', 'WIR-19844', 'Settlement fee — final wire', NULL),

('d3000001-0001-4001-8001-000000000013', 'b1000001-0001-4001-8001-000000000011', '702637bb-f340-4793-9170-6dc68e116c40', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-05', 3500.00, 'check', 'completed', 'CHK-33001', 'Partial cost recovery payment', NULL),

-- Santos WT payments (trust-linked)
('d3000001-0001-4001-8001-000000000014', 'b1000001-0001-4001-8001-000000000012', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-30', 5000.00, 'trust_transfer', 'completed', 'TR-2025-007', 'Trust draw on Q1 invoice', 'c2000001-0001-4001-8001-000000000007'),

('d3000001-0001-4001-8001-000000000015', 'b1000001-0001-4001-8001-000000000012', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-06-05', 3000.00, 'ach', 'completed', 'ACH-90201', 'ACH supplement on Q1 invoice', NULL),

('d3000001-0001-4001-8001-000000000016', 'b1000001-0001-4001-8001-000000000013', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4fad89fa-93c5-49e1-bdd1-9f566019fcdb',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-20', 6250.00, 'trust_transfer', 'completed', 'TR-2025-004', 'Full April invoice from trust', 'c2000001-0001-4001-8001-000000000004'),

-- Northside payments
('d3000001-0001-4001-8001-000000000017', 'b1000001-0001-4001-8001-000000000015', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-03-15', 22500.00, 'wire', 'completed', 'WIR-44001', 'Milestone 1 — due diligence complete', NULL),

('d3000001-0001-4001-8001-000000000018', 'b1000001-0001-4001-8001-000000000016', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-06-15', 7500.00, 'ach', 'completed', 'ACH-91001', 'Milestone 2 — first half', NULL),

('d3000001-0001-4001-8001-000000000019', 'b1000001-0001-4001-8001-000000000016', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '171d4853-2f7f-4f03-881d-349fe110e450',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-07-01', 3750.00, 'ach', 'pending', 'ACH-91022', 'Milestone 2 — second half pending', NULL);

-- ===================== 5. EXPENSES (18) =====================

INSERT INTO public.expenses (
  id, matter_id, profile_id, invoice_id, expense_date, amount, description,
  category, vendor_name, is_billable, is_reimbursable, status,
  approved_by, approved_at
) VALUES
-- Chen litigation expenses
('f5000001-0001-4001-8001-000000000001', '830af589-cb26-4414-8552-6306a3cfd8c1', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-01-15', 450.00, 'Superior Court filing fee — motion to compel', 'court_costs', 'Cook County Clerk', TRUE, TRUE, 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-16T10:00:00Z'),

('f5000001-0001-4001-8001-000000000002', '830af589-cb26-4414-8552-6306a3cfd8c1', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000001',
 '2025-01-22', 520.00, 'Expert witness consultation — supply chain', 'vendor_fees', 'Dr. Alan Reeves PhD', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-23T09:00:00Z'),

('f5000001-0001-4001-8001-000000000003', '830af589-cb26-4414-8552-6306a3cfd8c1', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000001',
 '2025-01-28', 380.00, 'Travel to Apex Supply warehouse inspection', 'travel', 'United Airlines', TRUE, TRUE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-29T11:00:00Z'),

('f5000001-0001-4001-8001-000000000004', '830af589-cb26-4414-8552-6306a3cfd8c1', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-02-10', 275.00, 'Deposition transcript — witness #2', 'materials', 'Veritext Legal Solutions', TRUE, FALSE, 'pending',
 NULL, NULL),

('f5000001-0001-4001-8001-000000000005', '830af589-cb26-4414-8552-6306a3cfd8c1', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000002',
 '2025-02-18', 650.00, 'Court reporter fees — 2 depositions', 'court_costs', 'Esquire Solutions', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-19T14:00:00Z'),

-- James lease expenses
('f5000001-0001-4001-8001-000000000006', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-01-08', 200.00, 'Title search — Riverside parcel', 'other', 'Chicago Title Co.', TRUE, FALSE, 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-09T10:00:00Z'),

('f5000001-0001-4001-8001-000000000007', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000007',
 '2025-01-20', 450.00, 'Recording fees — lease amendment', 'vendor_fees', 'DuPage County Recorder', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-01-21T09:00:00Z'),

('f5000001-0001-4001-8001-000000000008', 'a08bf4fd-44ec-4c84-9a94-be0c483c8e84', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-03-05', 175.00, 'Parking and mileage — landlord meeting', 'travel', NULL, TRUE, TRUE, 'pending',
 NULL, NULL),

-- Santos PI expenses (unprofitable matter edge case)
('f5000001-0001-4001-8001-000000000009', '702637bb-f340-4793-9170-6dc68e116c40', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2024-08-12', 890.00, 'Medical records retrieval — 3 providers', 'court_costs', 'MedRecs Express', TRUE, TRUE, 'paid',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2024-08-13T10:00:00Z'),

('f5000001-0001-4001-8001-000000000010', '702637bb-f340-4793-9170-6dc68e116c40', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000011',
 '2024-11-05', 1200.00, 'Private investigator — accident scene', 'vendor_fees', 'Midwest Investigations LLC', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2024-11-06T09:00:00Z'),

('f5000001-0001-4001-8001-000000000011', '702637bb-f340-4793-9170-6dc68e116c40', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2024-09-20', 650.00, 'Client medical co-pay reimbursement', 'reimbursable', 'Advocate Health', TRUE, TRUE, 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2024-09-21T11:00:00Z'),

-- Santos WT employment expenses
('f5000001-0001-4001-8001-000000000012', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000012',
 '2025-02-14', 480.00, 'EEOC filing fee', 'court_costs', 'EEOC Chicago District', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-15T10:00:00Z'),

('f5000001-0001-4001-8001-000000000013', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000013',
 '2025-04-22', 320.00, 'Travel to mediation — Springfield', 'travel', 'Amtrak', TRUE, TRUE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-04-23T09:00:00Z'),

('f5000001-0001-4001-8001-000000000014', 'bc8fccbe-ca07-45a3-baa2-78614ab6fe43', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-05-08', 195.00, 'Printing and binding — discovery packet', 'materials', 'FedEx Office', TRUE, FALSE, 'approved',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-09T10:00:00Z'),

-- Northside M&A expenses
('f5000001-0001-4001-8001-000000000015', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000015',
 '2025-02-20', 2400.00, 'Financial due diligence — clinic network', 'vendor_fees', 'Grant Thornton LLP', TRUE, FALSE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-02-21T14:00:00Z'),

('f5000001-0001-4001-8001-000000000016', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-04-10', 850.00, 'State regulatory filing fee — healthcare', 'court_costs', 'IL Dept of Public Health', TRUE, FALSE, 'pending',
 NULL, NULL),

('f5000001-0001-4001-8001-000000000017', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', 'b1000001-0001-4001-8001-000000000016',
 '2025-05-22', 1100.00, 'Partner travel — seller negotiation session', 'travel', 'Marriott Downtown', TRUE, TRUE, 'billed',
 '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', '2025-05-23T11:00:00Z'),

('f5000001-0001-4001-8001-000000000018', '90fe2894-11c3-4e21-8b14-ff2cc56b4d1c', '4a0bef63-d0d2-4ca9-aa8f-69082b6c5384', NULL,
 '2025-06-02', 125.00, 'Courier — signed LOI delivery (rejected)', 'other', 'UPS', TRUE, FALSE, 'rejected',
 NULL, NULL);

COMMIT;
