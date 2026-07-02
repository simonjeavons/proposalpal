-- Migration: add optional break_clause text to proposals and adhoc_contracts
-- Idempotent: safe to re-run.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS break_clause text;

ALTER TABLE public.adhoc_contracts
  ADD COLUMN IF NOT EXISTS break_clause text;
