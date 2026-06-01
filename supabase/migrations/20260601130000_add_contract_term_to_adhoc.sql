-- Migration: add contract_term_months to adhoc_contracts
-- Drives the contract End Date (agreement_date + term months - 1 day).
ALTER TABLE public.adhoc_contracts ADD COLUMN IF NOT EXISTS contract_term_months integer;
