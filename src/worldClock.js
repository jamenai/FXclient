function formatWorldTime(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function initializeWorldClock(container, isCollapsed = () => false) {
  if (!container || window.__fx?.settings?.showWorldClock === false) return () => {};

  const clock = document.createElement("time");
  clock.className = "fx-world-clock";
  clock.setAttribute("role", "timer");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "14");
  icon.setAttribute("height", "14");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.8");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
  const value = document.createElement("span");
  clock.append(icon, value);
  container.append(clock);

  let timer = 0;
  let active = true;
  const update = () => {
    if (!active) return;
    const now = new Date();
    const label = window.__fx?.translateFX?.("worldTime") ?? "World time";
    const formattedTime = formatWorldTime(now);
    value.textContent = isCollapsed() ? formattedTime.slice(0, 5) : formattedTime;
    clock.title = `${label} (UTC)`;
    clock.setAttribute("aria-label", `${label} UTC ${formattedTime}`);
    clock.dateTime = now.toISOString();
    timer = window.setTimeout(update, 1000 - now.getMilliseconds());
  };
  update();

  return () => {
    active = false;
    window.clearTimeout(timer);
    clock.remove();
  };
}
