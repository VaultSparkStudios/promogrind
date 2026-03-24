// ═══ ODDS CONVERSION ═══
export const toD = (am) => { const o = parseFloat(am); if (isNaN(o) || o === 0) return 0; return o > 0 ? o/100+1 : 100/Math.abs(o)+1; };
export const toA = (d) => { if (d >= 2) return "+"+Math.round((d-1)*100); if (d > 1) return ""+Math.round(-100/(d-1)); return "0"; };
export const toP = (d) => d > 0 ? (1/d*100) : 0;
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
export const toF = (d) => { if (d <= 1) return "0/1"; const n = Math.round((d-1)*100), dn = 100, g = gcd(n, dn); return `${n/g}/${dn/g}`; };
export const f = (n, dp=2) => (typeof n === "number" ? n.toFixed(dp) : parseFloat(n||0).toFixed(dp));

// ═══ CALCULATORS ═══
export const calcBonus = (sz, bO, hO) => {
  const bd=toD(bO), hd=toD(hO);
  if (bd<=1||hd<=1||!sz) return null;
  const wp=sz*(bd-1), hs=wp/hd, pBW=wp-hs, pHW=hs*(hd-1), g=Math.min(pBW,pHW);
  return {hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),r:f(g/sz*100,1)};
};

export const calcFirst = (s, o, hO) => {
  const d=toD(o), hd=toD(hO);
  if (d<=1||hd<=1||!s) return null;
  const p=s*d, hs=p/hd, pOW=p-s-hs, pHW=hs*hd-hs-s;
  return {hs:f(hs),pOW:f(pOW),pHW:f(pHW),g:f(Math.min(pOW,pHW))};
};

export const calcBoost = (s, o, bp, mx, hO) => {
  const d=toD(o), hd=toD(hO), b=parseFloat(bp)/100;
  if (d<=1||hd<=1||!s||!b) return null;
  const np=s*(d-1), ba=Math.min(np*b,parseFloat(mx)||Infinity), tp=s+np+ba, ed=tp/s, hs=tp/hd, pBW=tp-s-hs, pHW=hs*hd-hs-s, g=Math.min(pBW,pHW);
  return {eo:toA(ed),ed2:f(ed,4),bv:f(ba),hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),tp:f(tp)};
};

export const calcArb2 = (o1, o2, t) => {
  const d1=toD(o1), d2=toD(o2);
  if (d1<=1||d2<=1||!t) return null;
  const m=1/d1+1/d2, s1=t*(1/d1)/m, s2=t*(1/d2)/m, p=s1*d1;
  return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),pr:f(p-t),roi:f((p-t)/t*100)};
};

export const calcArb3 = (o1, o2, o3, t) => {
  const d1=toD(o1),d2=toD(o2),d3=toD(o3);
  if(d1<=1||d2<=1||d3<=1||!t) return null;
  const m=1/d1+1/d2+1/d3, s1=t*(1/d1)/m, s2=t*(1/d2)/m, s3=t*(1/d3)/m, p=s1*d1;
  return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),s3:f(s3),pr:f(p-t),roi:f((p-t)/t*100)};
};

export const calcNV = (o1, o2) => {
  const d1=toD(o1), d2=toD(o2);
  if(d1<=1||d2<=1) return null;
  const p1=1/d1, p2=1/d2, t=p1+p2, v=(t-1)*100, f1=p1/t, f2=p2/t;
  return {v:f(v,1),ip1:f(p1*100,1),ip2:f(p2*100,1),fp1:f(f1*100,1),fp2:f(f2*100,1),fo1:toA(1/f1),fo2:toA(1/f2)};
};

export const calcEV = (yo, fo, s) => {
  const yd=toD(yo), fd=toD(fo);
  if(yd<=1||fd<=1||!s) return null;
  const fp=1/fd, ev=(fp*(yd-1)*s)-((1-fp)*s);
  return {ev:f(ev),roi:f(ev/s*100,1),fp:f(fp*100,1),edge:f((yd-fd)/fd*100,1),ok:ev>0};
};

export const calcPH = (pp, hO, os) => {
  const hd=toD(hO);
  if(hd<=1||!pp||!os) return null;
  const hs=pp/hd, pPW=pp-os-hs, pHW=hs*hd-hs-os;
  return {hs:f(hs),pPW:f(pPW),pHW:f(pHW),g:f(Math.min(pPW,pHW))};
};

export const calcMid = (o1, o2, l1, l2, s) => {
  const d1=toD(o1), d2=toD(o2);
  if(d1<=1||d2<=1||!s) return null;
  const s2=(s*d1)/d2, ts=s+s2, wc=Math.max(s*d1,s2*d2)-ts, mw=s*d1+s2*d2-ts, w=Math.abs(parseFloat(l1)-parseFloat(l2));
  return {s2:f(s2),ts:f(ts),wc:f(wc),mw:f(mw),w:f(w,1)};
};

export const calcRO = (b, m, v) => {
  const bn=parseFloat(b),mn=parseFloat(m),vn=parseFloat(v)/100;
  if(!bn||!mn) return null;
  const tw=bn*mn, ec=tw*(vn||0.045), nv=bn-ec;
  return {tw:f(tw),ec:f(ec),nv:f(nv),nb:Math.ceil(tw/50),ok:nv>0};
};
