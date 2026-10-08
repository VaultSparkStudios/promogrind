import { assertTargetManagementProject, PROMOGRIND_PROJECT_REF } from './supabase-deploy-plan.mjs';

// A generic Studio REST credential may belong to another app. Never send it
// to PromoGrind. Management access is an independent, target-verified path.
export async function probeSupabaseProject({ url, serviceKey, managementToken, fetchImpl = fetch, offline = false }) {
  let targetMatch = false;
  try { targetMatch = new URL(url).origin === `https://${PROMOGRIND_PROJECT_REF}.supabase.co`; } catch {}
  if (offline) return { state: serviceKey || managementToken ? 'present' : 'missing', targetMatch, reason: 'Live project authorization not probed in offline mode.' };
  if (targetMatch && serviceKey) {
    try {
    const response = await fetchImpl(`https://${PROMOGRIND_PROJECT_REF}.supabase.co/rest/v1/`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(12000) });
    if (response.ok) return { state: 'authorized', targetMatch: true, httpStatus: response.status, reason: 'Pinned target REST surface authorized the service credential.' };
    if (!managementToken) return { state: 'present', targetMatch: true, httpStatus: response.status, reason: 'Pinned REST credential did not authorize the project.' };
    } catch {
      if (!managementToken) return { state: 'present', targetMatch: true, reason: 'Pinned REST probe unavailable; no management authority was provided.' };
    }
  }
  if (!managementToken) return { state: serviceKey ? 'present' : 'missing', targetMatch: false, reason: 'No verified PromoGrind authority; a generic credential is not project access.' };
  const response = await fetchImpl(`https://api.supabase.com/v1/projects/${PROMOGRIND_PROJECT_REF}`, { headers: { Authorization: `Bearer ${managementToken}` }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) return { state: 'present', targetMatch: false, httpStatus: response.status, reason: 'Management credential did not authorize the pinned project.' };
  try { assertTargetManagementProject(await response.json()); }
  catch { return { state: 'authenticated', targetMatch: false, httpStatus: response.status, reason: 'Management response failed the pinned project identity check.' }; }
  return { state: 'authorized', targetMatch: true, httpStatus: response.status, reason: 'Pinned project management access authorized; this does not prove REST, email or user journeys.' };
}
