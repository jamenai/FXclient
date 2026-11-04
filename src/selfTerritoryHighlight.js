const installedContexts = new WeakSet();

function drawOutline(context, mapAccess, mapSize, offsetMethod, isPlayerCellMethod, widthField, heightField) {
  const width = mapSize?.[widthField];
  const height = mapSize?.[heightField];
  const playerId = window.__fx?.getGameVar?.("playerId");
  const settings = window.__fx?.settings;
  if (!context || !mapAccess || !Number.isInteger(width) || !Number.isInteger(height)
      || !Number.isInteger(playerId) || settings?.highlightSelfTerritory === false || width < 3 || height < 3) return;
  const outlineWidth = Math.max(1, Math.min(6, Number(settings?.selfTerritoryOutlineWidth) || 3));
  const glow = Math.max(0, Math.min(12, Number(settings?.selfTerritoryGlow) || 0));

  const ownCells = new Uint8Array(width * height);
  let hasOwnCells = false;
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const offset = mapAccess[offsetMethod](x, y);
      if (mapAccess[isPlayerCellMethod](playerId, offset)) {
        ownCells[rowOffset + x] = 1;
        hasOwnCells = true;
      }
    }
  }
  if (!hasOwnCells) return;

  context.save();
  context.beginPath();
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const cell = rowOffset + x;
      if (!ownCells[cell]) continue;
      if (!ownCells[cell - width]) { context.moveTo(x, y); context.lineTo(x + 1, y); }
      if (!ownCells[cell + 1]) { context.moveTo(x + 1, y); context.lineTo(x + 1, y + 1); }
      if (!ownCells[cell + width]) { context.moveTo(x + 1, y + 1); context.lineTo(x, y + 1); }
      if (!ownCells[cell - 1]) { context.moveTo(x, y + 1); context.lineTo(x, y); }
    }
  }

  context.lineJoin = "round";
  context.lineWidth = outlineWidth;
  context.strokeStyle = "#111111";
  context.stroke();
  context.lineWidth = Math.max(1, outlineWidth * 0.5);
  context.strokeStyle = "#42e8ff";
  context.shadowColor = `rgba(66, 232, 255, ${glow ? 0.9 : 0})`;
  context.shadowBlur = glow;
  context.stroke();
  context.shadowBlur = 0;
  context.lineWidth = Math.max(0.5, outlineWidth / 3);
  context.strokeStyle = "#ffffff";
  context.stroke();
  context.restore();
}

export function installSelfTerritoryHighlight(context, mapAccess, mapSize, offsetMethod, isPlayerCellMethod, widthField, heightField) {
  if (!context || installedContexts.has(context) || typeof context.putImageData !== "function") return;
  installedContexts.add(context);
  const putImageData = context.putImageData.bind(context);
  context.putImageData = (...args) => {
    const result = putImageData(...args);
    drawOutline(context, mapAccess, mapSize, offsetMethod, isPlayerCellMethod, widthField, heightField);
    return result;
  };
}
