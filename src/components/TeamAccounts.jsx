import React, { useEffect, useState } from "react";
import { supabase } from "../auth.js";
import { K, font } from "../lib/shared.js";
import { S, Tl, LoadingState } from "../ui.jsx";

const TeamAccounts = () => {
  const [taUser, setTaUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoadingTeam(false); return; }
      const u = session.user;
      setTaUser(u);
      const { data, error } = await supabase.from('team_accounts').select('*').eq('owner_id', u.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setTeam(data);
        supabase.from('team_members').select('*').eq('team_id', data.id)
          .then(({ data: m, error }) => { if (error) setActionError('Team members could not be loaded. Refresh to try again.'); else setMembers(m || []); }).catch(() => setActionError('Team members could not be loaded. Refresh to try again.'));
      }
      setLoadingTeam(false);
    }).catch(() => { setLoadError(true); setLoadingTeam(false); });
  }, []);
  const createTeam = async () => {
    if (!teamName.trim() || !taUser || saving) return;
    setSaving(true); setActionError('');
    let created = false;
    try {
      const { data, error } = await supabase.from('team_accounts').insert({ owner_id: taUser.id, name: teamName.trim() }).select().single();
      if (error || !data) throw error || new Error('No saved team');
      setTeam(data);
      created = true;
      const owner = { team_id: data.id, user_id: taUser.id, role: 'owner', status: 'active', invited_email: taUser.email };
      const { error: memberError } = await supabase.from('team_members').insert(owner);
      if (memberError) { setActionError('Your team was created, but owner membership could not be saved. Refresh to check the member list.'); return; }
      setMembers([{ ...owner, id: 'saved-owner' }]);
    } catch { setActionError(created
      ? 'Your team was created, but owner membership could not be saved. Refresh to check the member list.'
      : 'Your team could not be created. Your name is still here so you can try again.'); }
    finally { setSaving(false); }
  };
  const inviteMember = async () => {
    if (!inviteEmail.trim() || !team || saving) return;
    setSaving(true); setActionError('');
    let recorded = false;
    try {
      const { error } = await supabase.from('team_members').insert({ team_id: team.id, invited_email: inviteEmail.trim(), role: 'member', status: 'pending' });
      if (error) throw error;
      recorded = true;
      setInviteEmail('');
      const { data: m, error: readError } = await supabase.from('team_members').select('*').eq('team_id', team.id);
      if (readError) { setActionError('The pending invitation was recorded, but the member list could not refresh. Email delivery is not confirmed.'); return; }
      setMembers(m || []);
    } catch { setActionError(recorded
      ? 'The pending invitation was recorded, but the member list could not refresh. Email delivery is not confirmed.'
      : 'The pending invitation could not be saved. Your email is still here so you can try again.'); }
    finally { setSaving(false); }
  };
  return (<div><div style={S.card}><Tl t="Team Accounts" badge="BETA" bc={K.pp}/>{actionError && <p role="alert" style={{color:K.rd}}>{actionError}</p>}
    {loadingTeam ? (
      <div style={{textAlign:'center',padding:32}}><LoadingState label="Loading team…"/></div>
    ) : loadError ? (
      <p role="alert" style={{ color: K.mt }}>Your team could not be loaded. Try refreshing this page.</p>
    ) : !team ? (
      <div>
        <div style={{fontWeight:700,color:K.tx,fontSize:18,marginBottom:8}}>Create a team</div>
        <div style={{color:K.dm,fontSize:14,marginBottom:20}}>
          Team accounts are in beta. Paid team checkout is currently unavailable. Creating a team does not purchase a subscription or unlock features marked coming soon.
        </div>
        {!taUser && <p style={{color:K.mt}}>Sign in to create a team.</p>}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
          <input
            placeholder="Team name (e.g. Promo Squad)"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            style={{...S.input,flex:1,padding:'10px 14px',fontSize:14}}
          />
          <button disabled={!taUser || !teamName.trim() || saving} onClick={createTeam} style={{padding:'10px 20px',background:K.pp,color: K.ink,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontFamily:font}}>
            Create Team
          </button>
        </div>
        <div style={{padding:16,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontWeight:600,color:K.gn,marginBottom:8}}>Current beta tools</div>
          <ul style={{color:K.dm,fontSize:14,paddingLeft:20,lineHeight:2}}>
            <li>Create a named team workspace</li>
            <li>Review its member list and recorded membership status</li>
            <li>Record a pending member invitation; email delivery is not confirmed here</li>
            <li>Features marked coming soon remain unavailable</li>
          </ul>
        </div>
      </div>
    ) : (
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:K.tx}}>{team.name}</div>
            <div style={{fontSize:14,color:K.mt}}>Recorded membership · {members.length} member{members.length !== 1 ? 's' : ''}</div>
          </div>
          <span style={{padding:'4px 12px',background:`${K.gn}15`,border:`1px solid ${K.gn}`,borderRadius:999,fontSize:14,color:K.gn}}>TEAM</span>
        </div>
        <p style={{color:K.mt}}>Pending invitations are records; email delivery is not confirmed here.</p>
        <div style={{marginBottom:20}}>
          <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Invite Members</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input
              type="email"
              placeholder="teammate@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{...S.input,flex:1}}
            />
            <button disabled={!inviteEmail.trim() || saving} onClick={inviteMember} style={{padding:'8px 16px',background:K.pp,color: K.ink,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:14,fontFamily:font}}>
              Invite
            </button>
          </div>
        </div>
        <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Team Members</div>
        {members.map(m => (
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,marginBottom:6}}>
            <div>
              <div style={{color:K.tx,fontSize:14}}>{m.invited_email || m.user_id}</div>
              <div style={{color:K.mt,fontSize:12}}>{m.role} · {m.status}</div>
            </div>
            <span style={{padding:'2px 10px',background:m.status==='active'?`${K.gn}15`:`${K.s3}`,border:`1px solid ${m.status==='active'?K.gn:K.bd2}`,borderRadius:999,fontSize:12,color:m.status==='active'?K.gn:K.mt}}>
              {m.status}
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div style={{color:K.mt,fontSize:14,textAlign:'center',padding:16}}>No members yet — invite your first teammate above</div>
        )}
      </div>
    )}
  </div></div>);
};

export default TeamAccounts;
