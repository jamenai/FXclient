const FLAG_SEQUENCE_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
const flagImages = new Map();
const regionNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

function countryCodeFromFlagSequence(sequence) {
  const code = Array.from(sequence, character =>
    String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65)
  ).join("").toLowerCase();
  if (!regionNames) return code;
  const regionName = regionNames.of(code.toUpperCase());
  return regionName && !regionName.toLowerCase().startsWith("unknown") ? code : null;
}

function getFlagImage(countryCode) {
  if (!flagImages.has(countryCode)) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const regionalIndicators = Array.from(countryCode.toUpperCase(), character =>
      (0x1f1e6 + character.charCodeAt(0) - 65).toString(16)
    ).join("-");
    image.onload = () => window.__fx?.sidebar?.requestResize?.();
    image.onerror = () => console.warn(`[ZFX Client] Could not load the ${countryCode.toUpperCase()} flag image.`);
    image.src = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${regionalIndicators}.svg`;
    flagImages.set(countryCode, image);
  }
  const image = flagImages.get(countryCode);
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** Draws Unicode country flag pairs as flag images while preserving the rest of the player name. */
export function drawPlayerNameWithCountryFlags(context, playerName, x, baselineY) {
  if (!context || typeof playerName !== "string" || !playerName.length) return false;
  const matches = Array.from(playerName.matchAll(FLAG_SEQUENCE_PATTERN));
  if (!matches.length) return false;

  const segments = [];
  let textOffset = 0;
  for (const match of matches) {
    const countryCode = countryCodeFromFlagSequence(match[0]);
    if (!countryCode) continue;
    const image = getFlagImage(countryCode);
    if (!image) return false;
    if (match.index > textOffset) segments.push({ text: playerName.slice(textOffset, match.index) });
    segments.push({ image });
    textOffset = match.index + match[0].length;
  }
  if (!segments.some(segment => segment.image)) return false;
  if (textOffset < playerName.length) segments.push({ text: playerName.slice(textOffset) });

  const textMetrics = context.measureText("Mg");
  const fontSize = Number.parseFloat(context.font.match(/[\d.]+px/)?.[0]) || 12;
  const ascent = textMetrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = textMetrics.actualBoundingBoxDescent || fontSize * 0.2;
  const flagHeight = Math.max(8, ascent + descent);
  const flagWidth = flagHeight * 4 / 3;
  const gap = fontSize * 0.08;
  const width = segments.reduce((total, segment) => total + (segment.image
    ? flagWidth + gap
    : context.measureText(segment.text).width), 0) - gap;

  let cursorX = x;
  if (context.textAlign === "center") cursorX -= width / 2;
  else if (context.textAlign === "right" || context.textAlign === "end") cursorX -= width;

  let flagTop = baselineY - ascent;
  if (context.textBaseline === "top" || context.textBaseline === "hanging") flagTop = baselineY;
  else if (context.textBaseline === "middle") flagTop = baselineY - flagHeight / 2;
  else if (context.textBaseline === "bottom" || context.textBaseline === "ideographic") flagTop = baselineY - flagHeight;

  context.save();
  try {
    context.textAlign = "left";
    for (const segment of segments) {
      if (segment.image) {
        context.drawImage(segment.image, cursorX, flagTop, flagWidth, flagHeight);
        cursorX += flagWidth + gap;
      } else {
        context.fillText(segment.text, cursorX, baselineY);
        cursorX += context.measureText(segment.text).width;
      }
    }
  } finally {
    context.restore();
  }
  return true;
}
