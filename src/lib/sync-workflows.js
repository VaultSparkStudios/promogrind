import { supabase } from '../auth.js';
import { normalizeWorkflowEntry, resolveWorkflowStatusConflict } from '../promograph/index.js';

const LEDGER_STATE_TABLE = 'ledger_state';
const TRACKER_STATE_TABLE = 'tracker_state';
const WORKFLOW_STATE_TABLE = 'workflow_state';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';
const WORKFLOW_BLOB_KEYS = ['workflowInbox', 'workflowHistory'];
function _getTrackerState(data = {}) {
  const {
    ledger,
    _updated,
    _entities,
    workflowInbox,
    workflowHistory,
    ...tracker
  } = data || {};
  return tracker;
}

function _getCombinedWorkflows(data = {}) {
  return [
    ...(Array.isArray(data.workflowInbox) ? data.workflowInbox : []),
    ...(Array.isArray(data.resultFeedback) ? data.resultFeedback : []),
  ].map((entry) => normalizeWorkflowEntry(entry));
}

export function _appendWorkflowHistory(previous = {}, next = {}, now = Date.now()) {
  const history = Array.isArray(previous.workflowHistory) ? [...previous.workflowHistory] : [];
  const existing = new Set(history.map((entry) => entry.eventKey));
  const previousMap = new Map(_getCombinedWorkflows(previous).map((workflow) => [workflow.id, workflow]));
  const nextWorkflows = _getCombinedWorkflows(next);

  for (const workflow of nextWorkflows) {
    const prev = previousMap.get(workflow.id);
    const eventAt = workflow.updatedAt || workflow.createdAt || new Date(now).toISOString();
    const eventKey = `${workflow.id}:${workflow.status}:${eventAt}`;
    if (existing.has(eventKey)) continue;

    const changed =
      !prev ||
      prev.status !== workflow.status ||
      prev.updatedAt !== workflow.updatedAt ||
      prev.actualProfit !== workflow.actualProfit ||
      prev.note !== workflow.note ||
      prev.skipReason !== workflow.skipReason ||
      prev.frictionReason !== workflow.frictionReason;

    if (!changed) continue;

    history.unshift({
      eventKey,
      workflowId: workflow.id,
      fromStatus: prev?.status || null,
      status: workflow.status,
      source: workflow.source || 'result_feedback',
      title: workflow.title || workflow.calculatorLabel,
      calculatorSlug: workflow.calculatorSlug,
      promoType: workflow.promoType,
      book: workflow.book,
      expectedProfit: workflow.expectedProfit,
      actualProfit: workflow.actualProfit,
      eventAt,
    });
    existing.add(eventKey);
  }

  return history.slice(0, 500);
}

export async function _loadRemoteEntityData(userId) {
  const result = {};
  const entityMeta = {};

  try {
    const { data, error } = await supabase.from(LEDGER_STATE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    if (!error && data && Array.isArray(data.ledger)) {
      result.ledger = data.ledger;
      entityMeta.ledger = new Date(data.updated_at || 0).getTime();
    }
  } catch {}

  try {
    const { data, error } = await supabase.from(TRACKER_STATE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    if (!error && data && data.tracker && typeof data.tracker === 'object' && !Array.isArray(data.tracker)) {
      Object.assign(result, data.tracker);
      const updatedAt = new Date(data.updated_at || 0).getTime();
      for (const key of Object.keys(data.tracker)) {
        if (key === '_entities') continue;
        entityMeta[key] = Math.max(Number(entityMeta[key] || 0), updatedAt);
      }
      if (data.tracker._entities && typeof data.tracker._entities === 'object') {
        Object.assign(entityMeta, data.tracker._entities);
      }
    }
  } catch {}

  const workflowData = await _loadRemoteWorkflowData(userId);
  Object.assign(result, workflowData);
  Object.assign(entityMeta, workflowData._entities || {});

  if (Object.keys(entityMeta).length) result._entities = entityMeta;
  return result;
}

async function _loadRemoteWorkflowData(userId) {
  const result = {};
  const entityMeta = {};

  try {
    const { data, error } = await supabase.from(WORKFLOW_STATE_TABLE).select('*').eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length) {
      result.workflowInbox = data.map((row) => normalizeWorkflowEntry({
        id: row.workflow_id,
        calculatorKey: row.calculator_key,
        calculatorSlug: row.calculator_slug,
        calculatorLabel: row.calculator_label,
        title: row.title,
        summary: row.summary,
        promoType: row.promo_type,
        status: row.status,
        expectedProfit: row.expected_profit,
        actualProfit: row.actual_profit,
        calculatorAccurate: row.calculator_accurate,
        book: row.book,
        skipReason: row.skip_reason,
        frictionReason: row.friction_reason,
        executionMinutes: row.execution_minutes,
        wouldRepeat: row.would_repeat,
        confidence: row.confidence,
        opportunityScore: row.opportunity_score,
        advisorPosture: row.advisor_posture,
        advisorConfidenceReceipt: row.advisor_confidence_receipt,
        actionability: row.actionability,
        nextStep: row.next_step,
        note: row.note,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      entityMeta.workflowInbox = Math.max(...data.map((row) => new Date(row.updated_at || row.created_at || 0).getTime()));
    }
  } catch {}

  try {
    const { data, error } = await supabase.from(WORKFLOW_HISTORY_TABLE).select('*').eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length) {
      result.workflowHistory = data
        .map((row) => ({
            eventKey: row.event_key,
            workflowId: row.workflow_id,
            fromStatus: row.from_status,
            status: row.status,
            source: row.source,
          title: row.title,
          calculatorSlug: row.calculator_slug,
          promoType: row.promo_type,
          book: row.book,
          expectedProfit: row.expected_profit,
          actualProfit: row.actual_profit,
          executionMinutes: row.execution_minutes,
          wouldRepeat: row.would_repeat,
          eventAt: row.event_at,
        }))
        .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
      entityMeta.workflowHistory = Math.max(...data.map((row) => new Date(row.event_at || 0).getTime()));
    }
  } catch {}

  if (Object.keys(entityMeta).length) result._entities = entityMeta;
  return result;
}

export async function _saveEntityState(userId, data) {
  await supabase.from(LEDGER_STATE_TABLE).upsert({
    user_id: userId,
    ledger: Array.isArray(data.ledger) ? data.ledger : [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  const tracker = _getTrackerState(data);
  await supabase.from(TRACKER_STATE_TABLE).upsert({
    user_id: userId,
    tracker,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function _saveWorkflowEntities(userId, data) {
  const workflows = _getCombinedWorkflows(data);
  if (workflows.length) {
    const stateRows = workflows.map((workflow) => ({
      user_id: userId,
      workflow_id: workflow.id,
      calculator_key: workflow.calculatorKey,
      calculator_slug: workflow.calculatorSlug,
      calculator_label: workflow.calculatorLabel,
      title: workflow.title,
      summary: workflow.summary,
      promo_type: workflow.promoType,
      status: workflow.status,
      expected_profit: workflow.expectedProfit,
      actual_profit: workflow.actualProfit,
      calculator_accurate: workflow.calculatorAccurate,
      book: workflow.book,
      skip_reason: workflow.skipReason,
      friction_reason: workflow.frictionReason,
      execution_minutes: workflow.executionMinutes,
      would_repeat: workflow.wouldRepeat,
      confidence: workflow.confidence,
      opportunity_score: workflow.opportunityScore,
      advisor_posture: workflow.advisorPosture,
      advisor_confidence_receipt: workflow.advisorConfidenceReceipt,
      actionability: workflow.actionability,
      next_step: workflow.nextStep,
      note: workflow.note,
      source: workflow.source,
      created_at: workflow.createdAt,
      updated_at: workflow.updatedAt,
    }));
    await supabase.from(WORKFLOW_STATE_TABLE).upsert(stateRows, { onConflict: 'user_id,workflow_id' });
  }

  const historyRows = Array.isArray(data.workflowHistory) ? data.workflowHistory : [];
  if (historyRows.length) {
    await supabase.from(WORKFLOW_HISTORY_TABLE).upsert(historyRows.map((entry) => ({
        event_key: entry.eventKey,
        user_id: userId,
        workflow_id: entry.workflowId,
        from_status: entry.fromStatus,
        status: entry.status,
        source: entry.source,
      title: entry.title,
      calculator_slug: entry.calculatorSlug,
      promo_type: entry.promoType,
      book: entry.book,
      expected_profit: entry.expectedProfit,
      actual_profit: entry.actualProfit,
      execution_minutes: entry.executionMinutes,
      would_repeat: entry.wouldRepeat,
      event_at: entry.eventAt,
    })), { onConflict: 'event_key' });
  }
}
