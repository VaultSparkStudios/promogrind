import React, { useEffect, useState } from "react";
import { supabase } from "../auth.js";
import { K } from "../lib/shared.js";
import { S, Tl, LoadingState } from "../ui.jsx";

const TeamAccounts = () => {
  const [taUser, setTaUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoadingTeam(false); return; }
      const u = session.user;
      setTaUser(u);
      const { data } = await supabase.from('team_accounts').select('*').eq('owner_id', u.id).single();
      if (data) {
        setTeam(data);
        supabase.from('team_members').select('*').eq('team_id', data.id)
          .then(({ data: m }) => setMembers(m || []));
      }
      setLoadingTeam(false);
    });
  }, []);
  const createTeam = async () => {
    if (!teamName.trim() || !taUser) return;
    const { data } = await supabase.from('team_accounts').insert({ owner_id: taUser.id, name: teamName }).select().single();
    if (data) {
      setTeam(data);
      await supabase.from('team_members').insert({ team_id: data.id, user_id: taUser.id, role: 'owner', status: 'active', invited_email: taUser.email });
      setMembers([{ id: Date.now(), team_id: data.id, user_id: taUser.id, role: 'owner', status: 'active', invited_email: taUser.email }]);
    }
  };
  const inviteMember = async () => {
    if (!inviteEmail.trim() || !team) return;
    await supabase.from('team_members').insert({ team_id: team.id, invited_email: inviteEmail, role: 'member', status: 'pending' });
    setInviteEmail('');
    const { data: m } = await supabase.from('team_members').select('*').eq('team_id', team.id);
    setMembers(m || []);
  };
  return (<div><div style={S.card}><Tl t="Team Accounts" badge="BETA" bc={K.pp}/>
    {loadingTeam ? (
      <div style={{textAlign:'center',padding:32}}><LoadingState label="Loading teamâ€¦"/></div>
    ) : !team ? (
      <div>
        <div style={{fontWeight:700,color:K.tx,fontSize:18,marginBottom:8}}>Create Your Team Vault</div>
        <div style={{color:K.dm,fontSize:13,marginBottom:20}}>
          Team accounts let you share a vault, split P&amp;L, and coordinate promo hunting with a group. $49.99/mo for the whole team.
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input
            placeholder="Team name (e.g. Promo Squad)"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            style={{...S.input,flex:1,padding:'10px 14px',fontSize:14}}
          />
          <button onClick={createTeam} style={{padding:'10px 20px',background:K.pp,color:K.bg,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontFamily:font}}>
            Create Team
          </button>
        </div>
        <div style={{padding:16,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontWeight:600,color:K.gn,marginBottom:8}}>Included with Team ($49.99/mo)</div>
          <ul style={{color:K.dm,fontSize:13,paddingLeft:20,lineHeight:2}}>
            <li>Shared P/L Ledger â€” see combined profits across all members</li>
            <li>Team leaderboard â€” who&apos;s grinding hardest</li>
            <li>All VaultSparked features for every member</li>
            <li>Up to 5 team members</li>
          </ul>
        </div>
      </div>
    ) : (
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:K.tx}}>{team.name}</div>
            <div style={{fontSize:12,color:K.mt}}>Team Vault Â· {members.length} member{members.length !== 1 ? 's' : ''}</div>
          </div>
          <span style={{padding:'4px 12px',background:`${K.gn}15`,border:`1px solid ${K.gn}`,borderRadius:999,fontSize:12,color:K.gn}}>TEAM</span>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Invite Members</div>
          <div style={{display:'flex',gap:8}}>
            <input
              type="email"
              placeholder="teammate@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{...S.input,flex:1}}
            />
            <button onClick={inviteMember} style={{padding:'8px 16px',background:K.pp,color:K.bg,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:font}}>
              Invite
            </button>
          </div>
        </div>
        <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Team Members</div>
        {members.map(m => (
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,marginBottom:6}}>
            <div>
              <div style={{color:K.tx,fontSize:13}}>{m.invited_email || m.user_id}</div>
              <div style={{color:K.mt,fontSize:11}}>{m.role} Â· {m.status}</div>
            </div>
            <span style={{padding:'2px 10px',background:m.status==='active'?`${K.gn}15`:`${K.s3}`,border:`1px solid ${m.status==='active'?K.gn:K.bd2}`,borderRadius:999,fontSize:11,color:m.status==='active'?K.gn:K.mt}}>
              {m.status}
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div style={{color:K.mt,fontSize:13,textAlign:'center',padding:16}}>No members yet â€” invite your first teammate above</div>
        )}
      </div>
    )}
  </div></div>);
};

export default TeamAccounts;
