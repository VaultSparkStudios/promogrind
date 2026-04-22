import { upsertWorkflowEntry } from "../promograph/index.js";
import { updateResultFeedback, upsertResultFeedback } from "../track/insights.js";

function cloneAppData(appData = {}) {
  return { ...(appData || {}) };
}

export function appendWorkflow(appData = {}, workflowEntry = {}) {
  const next = cloneAppData(appData);
  next.workflowInbox = upsertWorkflowEntry(appData?.workflowInbox || [], workflowEntry);
  return next;
}

export function appendWorkflows(appData = {}, workflowEntries = []) {
  return (Array.isArray(workflowEntries) ? workflowEntries : [])
    .filter(Boolean)
    .reduce((current, workflow) => appendWorkflow(current, workflow), cloneAppData(appData));
}

export function writeWorkflowFeedback(appData = {}, feedbackEntry = {}, workflowEntry = feedbackEntry) {
  const next = cloneAppData(appData);
  next.resultFeedback = upsertResultFeedback(appData?.resultFeedback || [], feedbackEntry);
  next.workflowInbox = upsertWorkflowEntry(appData?.workflowInbox || [], workflowEntry);
  return next;
}

export function patchWorkflowState(appData = {}, workflow = {}, patch = {}, { syncFeedback = true } = {}) {
  const nextTimestamp = patch.updatedAt || new Date().toISOString();
  const nextWorkflow = { ...workflow, ...patch, updatedAt: nextTimestamp };
  const next = cloneAppData(appData);
  next.workflowInbox = upsertWorkflowEntry(appData?.workflowInbox || [], nextWorkflow);

  const hasFeedbackEntry = Array.isArray(appData?.resultFeedback)
    && appData.resultFeedback.some((entry) => entry?.id === workflow?.id);

  next.resultFeedback = syncFeedback && hasFeedbackEntry
    ? updateResultFeedback(appData?.resultFeedback || [], workflow.id, { ...patch, updatedAt: nextTimestamp })
    : (appData?.resultFeedback || []);

  return next;
}

