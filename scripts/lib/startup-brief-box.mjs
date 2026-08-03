export function createStartupBriefBox(width = 62) {
  if (!Number.isInteger(width) || width < 20 || width > 200) {
    throw new Error("startup brief box width must be an integer from 20 to 200");
  }

  const truncateWordAware = (value, targetWidth = width) => {
    const text = String(value ?? "");
    if (text.length <= targetWidth) return text;
    const cut = text.slice(0, targetWidth - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${lastSpace > Math.floor(targetWidth * 0.6) ? cut.slice(0, lastSpace) : cut}…`;
  };
  const pad = (value, targetWidth = width) => {
    const text = truncateWordAware(value, targetWidth);
    return text + " ".repeat(Math.max(0, targetWidth - text.length));
  };
  const boundedBar = (value, max, cells, round = Math.round) => {
    const safeMax = Number(max) > 0 ? Number(max) : 1;
    const filled = Math.min(cells, Math.max(0, round((Number(value) || 0) / safeMax * cells)));
    return "█".repeat(filled) + "░".repeat(cells - filled);
  };

  return Object.freeze({
    width,
    totalWidth: width + 4,
    truncateWordAware,
    pad,
    row: (content) => `║ ${pad(content)} ║`,
    blank: () => `║ ${" ".repeat(width)} ║`,
    top: (title) => {
      const label = title ? `══ ${title} ` : "";
      return `╔${label}${"═".repeat(Math.max(1, width + 2 - label.length))}╗`;
    },
    mid: (title) => {
      const label = title ? `══ ${title} ` : "";
      return `╠${label}${"═".repeat(Math.max(1, width + 2 - label.length))}╣`;
    },
    bot: () => `╚${"═".repeat(width + 2)}╝`,
    bar20: (score) => boundedBar(score, 100, 20),
    bar10: (score) => boundedBar(score, 100, 10),
    bar24: (total, max = 1000) => boundedBar(total, max, 24, Math.floor),
  });
}
