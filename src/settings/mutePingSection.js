function createCheckboxRow(labelKey, noteKey) {
  const label = document.createElement("label");
  label.className = "checkbox";
  const labelText = document.createTextNode("");
  label.append(labelText);
  let noteElement = null;
  if (noteKey) {
    noteElement = document.createElement("small");
    label.append(document.createElement("br"), noteElement);
  }
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const checkmark = document.createElement("span");
  checkmark.className = "checkmark";
  label.append(checkbox, checkmark);
  const updateLanguage = () => {
    labelText.nodeValue = window.__fx?.translateFX?.(labelKey) ?? labelKey;
    if (noteElement) noteElement.innerText = window.__fx?.translateFX?.(noteKey) ?? noteKey;
  };
  updateLanguage();
  return { label, checkbox, updateLanguage };
}

export function MutePingSection(container) {
  const pingTypes = [
    { key: "mutePingEveryone", label: "settingMuteEveryone" },
    { key: "mutePingRoom", label: "settingMuteRooms" },
    { key: "mutePingClan", label: "settingMuteClan" },
    { key: "mutePingLanguage", label: "settingMuteLanguage" },
    { key: "mutePingDirect", label: "settingMuteUsername" }
  ];

  const heading = document.createElement("h3");
  heading.className = "settings-subsection-title";
  heading.dataset.settingsSubsectionLabel = "Muted lobby pings";
  heading.innerText = window.__fx?.translateFX?.("settingMutedPings") ?? "Muted lobby pings";
  container.append(heading);

  const master = createCheckboxRow("settingMuteAllPings");
  container.append(master.label, document.createElement("br"));

  const subCheckboxes = {};
  const subRows = {};
  const savedState = {};
  pingTypes.forEach(({ key, label, note }) => {
    const row = createCheckboxRow(label, note);
    container.append(row.label, document.createElement("br"));
    subCheckboxes[key] = row.checkbox;
    subRows[key] = row;
    row.checkbox.addEventListener("change", () => savedState[key] = row.checkbox.checked);
  });

  function applyMasterState() {
    const allMuted = master.checkbox.checked;
    Object.keys(subCheckboxes).forEach(key => {
      subCheckboxes[key].checked = allMuted ? true : (savedState[key] ?? false);
      subCheckboxes[key].disabled = allMuted;
    });
  }
  master.checkbox.addEventListener("change", () => {
    if (master.checkbox.checked) Object.keys(subCheckboxes).forEach(key => savedState[key] = subCheckboxes[key].checked);
    applyMasterState();
  });

  this.update = function (settings) {
    heading.innerText = window.__fx?.translateFX?.("settingMutedPings") ?? "Muted lobby pings";
    master.updateLanguage();
    Object.values(subRows).forEach(row => row.updateLanguage());
    Object.keys(subCheckboxes).forEach(key => savedState[key] = !!settings[key]);
    master.checkbox.checked = !!settings.mutePingAll;
    applyMasterState();
  };
  this.save = function (targetSettings) {
    targetSettings.mutePingAll = master.checkbox.checked;
    Object.keys(subCheckboxes).forEach(key => {
      targetSettings[key] = master.checkbox.checked ? savedState[key] : subCheckboxes[key].checked;
    });
  };
}
