const HEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export function relativeLuminance(hex) {
  const match = String(hex || "").match(HEX);
  if (!match) throw new TypeError(`Expected a six-digit hex color, received ${hex}`);
  const [r, g, b] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function auditSemanticPalette(palette, { minimum = 4.5 } = {}) {
  const foregrounds = ["ac", "gn", "rd", "yl", "pp", "tx", "dm", "mt"];
  const surfaces = ["bg", "s1", "s2", "s3"];
  const textPairs = foregrounds.flatMap((foreground) => surfaces.map((surface) => ({
    foreground, surface, ratio: contrastRatio(palette[foreground], palette[surface]),
  })));
  const inkPairs = ["ac", "gn", "rd", "yl", "pp"].map((surface) => ({
    foreground: "ink", surface, ratio: contrastRatio(palette.ink, palette[surface]),
  }));
  const pairs = [...textPairs, ...inkPairs];
  return { minimum, pairs, failures: pairs.filter((pair) => pair.ratio < minimum) };
}
