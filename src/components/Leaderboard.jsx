import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../auth.js";
import { AppDataCtx } from "../contexts.jsx";
import { f, K, font, toD } from "../lib/shared.js";
import { Nt, RR, S, Tl } from "../ui.jsx";

export default function Leaderboard() {
  const { appData: data } = React.useContext(AppDataCtx);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [privacyOn, setPrivacyOn] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setMyUserId(user.id);
          setPrivacyOn(user.user_metadata?.leaderboard_visible !== false);
        }
        let lbData;
        let error;
        ({ data: lbData, error } = await supabase.from("vault_leaderboard").select("user_id,total_points,last_active").order("total_points", { ascending: false }).limit(20));
        if (error) {
          ({ data: lbData } = await supabase.from("vault_events").select("user_id,points").limit(5000));
          if (lbData) {
            const aggregate = {};
            lbData.forEach((row) => { aggregate[row.user_id] = (aggregate[row.user_id] || 0) + (row.points || 0); });
            lbData = Object.entries(aggregate)
              .map(([user_id, total_points]) => ({ user_id, total_points }))
              .sort((a, b) => b.total_points - a.total_points)
              .slice(0, 20);
          }
        }
        if (lbData) {
          setRows(lbData);
          if (user) {
            const index = lbData.findIndex((row) => row.user_id === user.id);
            setMyRank(index >= 0 ? index + 1 : null);
          }
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const togglePrivacy = async (value) => {
    setPrivacyOn(value);
    setPrivacySaving(true);
    try { await supabase.auth.updateUser({ data: { leaderboard_visible: value } }); } catch {}
    setPrivacySaving(false);
  };

  const mask = (uid) => `Grinder #${uid.slice(-4).toUpperCase()}`;
  const rankColor = (index) => index === 0 ? K.yl : index === 1 ? K.dm : index === 2 ? "#cd7f32" : K.mt;
  const myLedger = data.ledger || [];
  const myAvgClv = useMemo(() => {
    const clvRows = myLedger.filter((entry) => entry.myOdds && entry.closingOdds);
    if (!clvRows.length) return null;
    return clvRows.reduce((sum, entry) => {
      const my = toD(entry.myOdds);
      const closing = toD(entry.closingOdds);
      return sum + (my > 1 && closing > 1 ? (my / closing - 1) * 100 : 0);
    }, 0) / clvRows.length;
  }, [myLedger]);

  return (
    <div style={S.card}>
      <Tl t="Vault Points Leaderboard" badge="LIVE" bc={K.yl} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "10px 12px", background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: K.tx }}>Privacy Settings</span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: K.dm }}>
          <input type="checkbox" checked={privacyOn} onChange={(event) => togglePrivacy(event.target.checked)} style={{ cursor: "pointer" }} />
          Show my account on the public leaderboard
        </label>
        {privacySaving && <span style={{ fontSize: 10, color: K.yl }}>Saving...</span>}
      </div>
      {myRank && <Nt c={K.gn}>You are ranked #{myRank} on the leaderboard.</Nt>}
      <Nt c={K.ac}>Earn points by using calculators, logging bets, and daily logins.</Nt>
      {loading && <div style={{ textAlign: "center", padding: 32, color: K.mt, fontSize: 11 }}>Loading leaderboard...</div>}
      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: K.dm, marginBottom: 4 }}>Be the first on the leaderboard</div>
          <div style={{ fontSize: 11, color: K.mt, marginBottom: 14 }}>Use calculators and log bets to earn Vault Points and claim your spot.</div>
          <button onClick={() => { window.location.hash = "#/bonus-bet"; }} style={{ padding: "7px 18px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font }}>Start with Bonus Bet Converter</button>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto", gap: 12, padding: "5px 12px", marginBottom: 4 }}>
            <div /><div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Grinder</div>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>Pts</div>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase" }}>CLV</div>
          </div>
          {rows.map((row, index) => {
            const isMe = row.user_id === myUserId;
            return (
              <div key={row.user_id} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto auto", gap: 12, alignItems: "center", padding: "10px 12px", background: isMe ? `${K.gn}10` : index < 3 ? `${rankColor(index)}08` : K.s2, borderRadius: 6, marginBottom: 4, border: `1px solid ${isMe ? K.gn : index < 3 ? rankColor(index) + "30" : K.bd}` }}>
                <div style={{ fontSize: index < 3 ? 18 : 13, fontWeight: 700, color: rankColor(index), textAlign: "center" }}>{index + 1}</div>
                <div style={{ fontSize: 12, color: K.tx, fontWeight: index < 3 ? 600 : 400 }}>{mask(row.user_id)}{isMe && <span style={{ ...S.tag(K.gn), marginLeft: 6, fontSize: 8 }}>YOU</span>}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: K.yl }}>{(row.total_points || 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: isMe && myAvgClv !== null ? (myAvgClv >= 0 ? K.gn : K.rd) : K.mt }}>
                  {isMe && myAvgClv !== null ? `${myAvgClv >= 0 ? "+" : ""}${f(myAvgClv, 2)}%` : "-"}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {myAvgClv !== null && (
        <div style={{ marginTop: 12, padding: "12px 14px", background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1.5px" }}>My Stats</div>
          <RR l="My Points" v={`${rows.find((row) => row.user_id === myUserId)?.total_points || 0} pts`} c={K.yl} />
          <RR l="My Avg CLV" v={`${myAvgClv >= 0 ? "+" : ""}${f(myAvgClv, 2)}%`} c={myAvgClv >= 0 ? K.gn : K.rd} />
          {myRank && <RR l="My Rank" v={`#${myRank}`} c={K.pp} />}
        </div>
      )}
    </div>
  );
}
