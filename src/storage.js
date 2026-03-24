const KEY = "promo_engine_v3";

export const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
};

export const save = (data) => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch {}
};

export const update = (fn) => {
  const data = load();
  const updated = fn(data);
  save(updated);
  return updated;
};
