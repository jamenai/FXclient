import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";
import { ZfxLogoMark } from "./zfxLogoMark.js";

const ReplayView = defineComponent({
  name: "FxReplayView",
  components: { ZfxLogoMark },
  setup() {
    const visible = ref(false);
    const replayText = ref("");
    const savedReplays = ref([]);
    const status = ref("");
    const textarea = ref(null);
    const gameLanguage = ref("");
    let languageTimer = 0;
    function refreshLanguage() {
      const selected = window.__fx?.getGameLanguage?.();
      if (selected !== undefined && selected !== null && String(selected).trim()) {
        gameLanguage.value = String(selected).toLowerCase();
      } else if (!gameLanguage.value) {
        gameLanguage.value = (navigator.language || "en").toLowerCase();
      }
    }
    const isGerman = computed(() => gameLanguage.value.startsWith("de"));
    const labels = computed(() => isGerman.value ? {
      title: "Replays", subtitle: "Replay-Daten einfügen, laden und gespeicherte Partien öffnen.",
      inputTitle: "Replay-Daten", placeholder: "Replay-Daten hier einfügen …", launch: "Replay starten",
      selectAll: "Alles auswählen", copy: "Kopieren", copied: "Kopiert", clear: "Leeren", close: "Schließen",
      saved: "Gespeicherte Replays", empty: "Noch keine Replays gespeichert. Beendete Partien werden hier abgelegt.",
      load: "Laden", remove: "Löschen", invalid: "Bitte füge gültige Replay-Daten ein.", copyFailed: "Kopieren nicht möglich.",
      recent: "Zuletzt gespielt", game: "Partie",
    } : {
      title: "Replays", subtitle: "Paste replay data, launch it, or open a saved game.",
      inputTitle: "Replay data", placeholder: "Paste replay data here …", launch: "Launch replay",
      selectAll: "Select all", copy: "Copy", copied: "Copied", clear: "Clear", close: "Close",
      saved: "Saved replays", empty: "No replays saved yet. Finished games will appear here.",
      load: "Load", remove: "Delete", invalid: "Paste valid replay data first.", copyFailed: "Could not copy replay data.",
      recent: "Played", game: "Game",
    });

    function refresh() { savedReplays.value = window.__fx?.replayHistory?.getAll?.() ?? []; }
    function open() { refresh(); status.value = ""; visible.value = true; window.requestAnimationFrame(() => textarea.value?.focus()); }
    function close() { visible.value = false; }
    function launch(data = replayText.value) {
      const clean = String(data || "").trim();
      if (!clean || typeof window.__fx?.replayHistory?.load !== "function") { status.value = labels.value.invalid; return; }
      visible.value = false;
      window.__fx.replayHistory.load(clean, null);
      replayText.value = "";
    }
    function copy(text = replayText.value) {
      if (!text) return;
      const done = () => { status.value = labels.value.copied; window.setTimeout(() => { status.value = ""; }, 1400); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => { status.value = labels.value.copyFailed; });
      else {
        const field = document.createElement("textarea"); field.value = text; document.body.append(field); field.select();
        try { document.execCommand("copy"); done(); } catch { status.value = labels.value.copyFailed; } finally { field.remove(); }
      }
    }
    function formatDate(timestamp) {
      const date = new Date(timestamp);
      return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    function removeReplay(timestamp) { window.__fx?.replayHistory?.remove?.(timestamp); refresh(); }
    function onKeyDown(event) { if (visible.value && event.key === "Escape") close(); }
    onMounted(() => {
      refreshLanguage();
      languageTimer = window.setInterval(refreshLanguage, 500);
      window.addEventListener("keydown", onKeyDown);
      window.__fx.openVueReplays = open;
      window.__fx.closeVueReplays = close;
    });
    onBeforeUnmount(() => {
      window.clearInterval(languageTimer);
      window.removeEventListener("keydown", onKeyDown);
      if (window.__fx?.openVueReplays === open) delete window.__fx.openVueReplays;
      if (window.__fx?.closeVueReplays === close) delete window.__fx.closeVueReplays;
    });
    return { visible, replayText, savedReplays, status, textarea, labels, open, close, launch, copy, refresh, formatDate, removeReplay };
  },
  template: `
    <div v-show="visible" class="fx-replay-overlay" @pointerdown.self="close">
      <main class="fx-replay-view" role="dialog" aria-modal="true" aria-labelledby="fx-replay-title">
        <header class="fx-replay-header">
          <ZfxLogoMark class="fx-replay-brand-mark" aria-hidden="true" />
          <div><small>ZFX CLIENT · REPLAY</small><h1 id="fx-replay-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-replay-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div class="fx-replay-content">
          <section class="fx-replay-input-card">
            <div class="fx-replay-section-heading"><div><span class="fx-replay-kicker">01</span><h2>{{ labels.inputTitle }}</h2></div><span class="fx-replay-live-dot"></span></div>
            <textarea ref="textarea" v-model="replayText" :placeholder="labels.placeholder" spellcheck="false" autocomplete="off"></textarea>
            <div class="fx-replay-input-footer"><span v-if="status" role="status">{{ status }}</span><span v-else>{{ replayText.length.toLocaleString() }} {{ isGerman ? 'Zeichen' : 'characters' }}</span>
              <div class="fx-replay-actions"><button type="button" class="fx-replay-button is-quiet" @click="textarea?.select()">{{ labels.selectAll }}</button><button type="button" class="fx-replay-button is-quiet" @click="copy()">{{ labels.copy }}</button><button type="button" class="fx-replay-button is-quiet" @click="replayText = ''; status = ''">{{ labels.clear }}</button><button type="button" class="fx-replay-button is-primary" @click="launch()">▶ {{ labels.launch }}</button></div>
            </div>
          </section>
          <section class="fx-replay-saved-card">
            <div class="fx-replay-section-heading"><div><span class="fx-replay-kicker">02</span><h2>{{ labels.saved }}</h2></div><span class="fx-replay-count">{{ savedReplays.length }}</span></div>
            <p v-if="!savedReplays.length" class="fx-replay-empty">{{ labels.empty }}</p>
            <div v-else class="fx-replay-list"><article v-for="(replay, index) in savedReplays" :key="replay.timestamp" class="fx-replay-row">
              <div class="fx-replay-index">{{ String(index + 1).padStart(2, '0') }}</div><div class="fx-replay-meta"><strong>{{ labels.game }} {{ savedReplays.length - index }}</strong><small>{{ formatDate(replay.timestamp) }}</small></div>
              <button type="button" class="fx-replay-button is-primary is-small" @click="launch(replay.data)">{{ labels.load }}</button><button type="button" class="fx-replay-icon-button" :aria-label="labels.remove" :title="labels.remove" @click="removeReplay(replay.timestamp)">×</button>
            </article></div>
          </section>
        </div>
        <footer class="fx-replay-footer"><span><i></i>{{ labels.recent }} · {{ savedReplays.length }} / 5</span><button type="button" class="fx-replay-button is-quiet" @click="close">{{ labels.close }}</button></footer>
      </main>
    </div>`,
});

export function createVueReplayView() {
  if (document.getElementById("fx-replay-view-root")) return () => {};
  const host = document.createElement("div"); host.id = "fx-replay-view-root"; document.body.appendChild(host);
  const app = createApp(ReplayView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client ReplayView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
