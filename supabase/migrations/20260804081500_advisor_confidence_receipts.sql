-- Persist the governed Advisor posture separately from raw model confidence.
-- The JSON receipt contains bounded reason codes and aggregate calibration only;
-- it never stores prompt text, secrets, or an inferred outcome probability.
alter table public.workflow_state
  add column if not exists advisor_posture text,
  add column if not exists advisor_confidence_receipt jsonb;

alter table public.workflow_state
  drop constraint if exists workflow_state_advisor_posture_check;

alter table public.workflow_state
  add constraint workflow_state_advisor_posture_check
  check (advisor_posture is null or advisor_posture in ('act', 'verify', 'abstain'));
