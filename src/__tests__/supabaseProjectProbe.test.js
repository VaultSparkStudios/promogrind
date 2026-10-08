import { describe, expect, it, vi } from 'vitest';
import { probeSupabaseProject } from '../../scripts/lib/supabase-project-probe.mjs';
describe('Pinned Supabase capability probe', () => {
  it('tries management access after a target REST transport failure', async () => {
    const fetchImpl=vi.fn().mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ok:true,status:200,json:async()=>({id:'fjnpzjjyhnpmunfoycrp'})});
    const result=await probeSupabaseProject({url:'https://fjnpzjjyhnpmunfoycrp.supabase.co',serviceKey:'target-fixture',managementToken:'management-fixture',fetchImpl});
    expect(result.state).toBe('authorized');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.reason).toContain('management access');
  });
  it('never sends another project’s REST key to PromoGrind', async () => {
    const fetchImpl=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({id:'fjnpzjjyhnpmunfoycrp'})});
    const result=await probeSupabaseProject({url:'https://other-project.supabase.co',serviceKey:'wrong-project-fixture',managementToken:'management-fixture',fetchImpl});
    expect(result.state).toBe('authorized');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.supabase.com/v1/projects/fjnpzjjyhnpmunfoycrp');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('wrong-project-fixture');
  });
  it('rejects a successful response for the wrong project', async () => {
    const result=await probeSupabaseProject({managementToken:'fixture',fetchImpl:async()=>({ok:true,status:200,json:async()=>({id:'other-project'})})});
    expect(result.targetMatch).toBe(false);
    expect(result.state).not.toBe('authorized');
  });
  it('does not accept a hostname containing the pinned name', async () => {
    const fetchImpl=vi.fn();
    const result=await probeSupabaseProject({url:'https://fjnpzjjyhnpmunfoycrp.supabase.co.evil.invalid',serviceKey:'fixture',fetchImpl});
    expect(result.state).not.toBe('authorized');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
