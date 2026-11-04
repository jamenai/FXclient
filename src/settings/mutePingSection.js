function createCheckboxRow(labelText, note) {
  const label = document.createElement("label");
  label.className = "checkbox";
  label.append(labelText + " ");
  if (note) {
    const noteElement = document.createElement("small");
    noteElement.innerText = note;
    label.append(document.createElement("br"), noteElement);
  }
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const checkmark = document.createElement("span");
  checkmark.className = "checkmark";
  label.append(checkbox, checkmark);
  return { label, checkbox };
}

export function MutePingSection(container) {
  const pingTypes = [
    { key: "mutePingEveryone", label: "Mute @all, @everyone and @0ya pings" },
    { key: "mutePingRoom", label: "Mute @room1 - @room4 pings" },
    { key: "mutePingClan", label: "Mute clan pings (@[TAG])" },
    { key: "mutePingLanguage", label: "Mute language pings (@en, @de, ...)" },
    { key: "mutePingDirect", label: "Mute pings of your username" }
  ];

  const header = document.createElement("p");
  const heading = document.createElement("b");
  heading.innerText = "Muted lobby pings";
  header.append(heading);
  container.append(header);

  const master = createCheckboxRow("Mute all pings");
  container.append(master.label, document.createElement("br"));

  const subCheckboxes = {};
  const savedState = {};
  pingTypes.forEach(({ key, label, note }) => {
    const row = createCheckboxRow(label, note);
    container.append(row.label, document.createElement("br"));
    subCheckboxes[key] = row.checkbox;
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
