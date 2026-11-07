import { computed, createApp, defineComponent, onBeforeUnmount, onMounted, ref } from "vue/dist/vue.esm-bundler.js";

let nativeProfileSnapshot = null;
let savedAccountSnapshot = [];
let savedAccountActions = null;
function normalizeAccountText(value) {
  if (typeof value !== "string") return value;
  try { return decodeURIComponent(escape(value)); } catch { return value; }
}

export const myAccountAdapter = {
  setNativeProfile(data) {
    if (!data || typeof data !== "object") return;
    const numeric = value => Number.isFinite(Number(value)) ? Number(value) : null;
    const rank = value => numeric(value) === null ? null : numeric(value) + 1;
    const activity = ["Browsing the menus", "Watching a replay", "Playing a team game", "Playing a battle royale game", "Playing a 1v1 match", "Fighting zombies", "In the lobby", "Playing in single player"];
    const activityDe = ["In den Menüs", "Sieht ein Replay", "Spielt ein Teamspiel", "Spielt Battle Royale", "Spielt ein 1v1-Spiel", "Kämpft gegen Zombies", "In der Lobby", "Spielt im Einzelspielermodus"];
    const activityIndex = numeric(data.aR9);
    nativeProfileSnapshot = {
      accountName: String(data.username || ""),
      balance: numeric(data.y4) === null ? null : numeric(data.y4) / 100,
      accountRank: rank(data.aQo),
      emailVerified: Boolean(data.aR7),
      online: numeric(data.aR8) !== null && numeric(data.aR8) < 1,
      activityEn: activityIndex !== null ? activity[activityIndex] || "" : "",
      activityDe: activityIndex !== null ? activityDe[activityIndex] || "" : "",
      bio: String(data.aRM || "").trim(),
      supporter: Boolean(data.aRW),
      oneVsOne: { elo: numeric(data.y0), rank: rank(data.y1), totalPlayers: numeric(data.y3), games: numeric(data.y2) },
      battleRoyale: { rating: numeric(data.a2j) === null ? null : numeric(data.a2j) / 100, rank: rank(data.aR1), totalPlayers: numeric(data.y3) },
      zombies: { rating: numeric(data.aR3) === null ? null : numeric(data.aR3) / 100, rank: rank(data.aR2) },
      primaryClan: { tag: String(data.y5 || ""), monthly: numeric(data.y7), rank: rank(data.y9), total: numeric(data.yA), wins: numeric(data.yC) },
      secondaryClan: { tag: String(data.y6 || ""), total: numeric(data.y8), wins: numeric(data.yB) },
      clanLeadership: { rating: numeric(data.aRU) === null ? null : numeric(data.aRU) / 10, clan: String(data.aRV || "") },
    };
    window.dispatchEvent(new Event("fx-my-account-profile-update"));
  },
  getSnapshot() { return nativeProfileSnapshot ? { ...nativeProfileSnapshot } : null; },
  setSavedAccounts(data, select, login, remove) {
    const names = Array.isArray(data?.options) ? data.options : [];
    savedAccountSnapshot = names.map((name, index) => ({ name: String(name || "").trim(), index }))
      .filter(entry => entry.index > 0 && entry.name);
    savedAccountActions = { data, select, login, remove };
    window.dispatchEvent(new Event("fx-my-account-saved-accounts-update"));
  },
  getSavedAccounts() {
    const names = Array.isArray(savedAccountActions?.data?.options) ? savedAccountActions.data.options : savedAccountSnapshot.map(entry => entry.name);
    return names.map((name, index) => ({ name: String(name || "").trim(), index })).filter(entry => entry.index > 0 && entry.name);
  },
  useSavedAccount(index) {
    if (!this.getSavedAccounts().some(item => item.index === index) || !savedAccountActions) return false;
    savedAccountActions.select(index);
    savedAccountActions.login();
    return true;
  },
  removeSavedAccount(index) {
    if (!this.getSavedAccounts().some(item => item.index === index) || !savedAccountActions) return false;
    savedAccountActions.select(index);
    savedAccountActions.remove();
    return true;
  },
};

const MyAccountView = defineComponent({
  name: "FxMyAccountView",
  setup() {
    const visible = ref(false);
    const activeSection = ref("overview");
    const language = ref("");
    const playerName = ref("");
    const accountId = ref("");
    const gameProfile = ref(null);
    const savedAccounts = ref([]);
    const bioDraft = ref("");
    const emailDraft = ref("");
    const verificationCode = ref("");
    const status = ref("");
    let refreshTimer = 0;
    let statusTimer = 0;
    let restoreMenuTimer = 0;
    let profileHydrationListener = null;
    let returnMenuState = null;
    const handedOffToNative = ref(false);
    const isGerman = computed(() => language.value.startsWith("de"));
    const labels = computed(() => { const dictionary = isGerman.value ? {
      eyebrow: "ZFX CLIENT · KONTO", title: "Mein Konto", subtitle: "Dein Territorial.io-Profil und deine Konto-ID.",
      profile: "Spielerprofil", accountId: "Account-ID", changeName: "Spielernamen ändern",
      copy: "ID kopieren", copied: "Account-ID kopiert", copyFailed: "Kopieren nicht möglich",
      accountTools: "Weitere Kontofunktionen", accountToolsNote: "Öffnet die Kontoverwaltung des Spiels.",
      openAccountTools: "Kontoverwaltung öffnen", close: "Schließen", unavailable: "Nicht verfügbar",
    } : {
      eyebrow: "ZFX CLIENT · ACCOUNT", title: "My Account", subtitle: "Your Territorial.io profile and account ID.",
      profile: "Player profile", accountId: "Account ID", changeName: "Change player name",
      copy: "Copy ID", copied: "Account ID copied", copyFailed: "Could not copy ID",
      accountTools: "More account options", accountToolsNote: "Opens the game's account manager.",
      openAccountTools: "Open account manager", close: "Close", unavailable: "Unavailable",
    }; return Object.fromEntries(Object.entries(dictionary).map(([key, value]) => [key, normalizeAccountText(value)])); });
    const extendedLabels = computed(() => {
      const dictionary = ({
      ...labels.value,
      ...(isGerman.value ? {
        overview: "Kontoübersicht", balance: "Kontostand", accountRank: "Kontorang", gameStats: "Spielstatistiken",
        elo: "Elo", rating: "Wertung", rank: "Rang", games: "Gespielte Partien", clanStats: "Clan-Statistik",
        primaryClan: "Hauptclan", secondaryClan: "Weitere Clan-Wertung", monthly: "Monatspunkte", total: "Gesamtpunkte",
        oneVsOne: "1v1", battleRoyale: "Battle Royale", zombies: "Zombie-Modus", clanLeadership: "Clanleitung",
        currentActivity: "Aktivität", online: "Online", offline: "Offline", accountName: "Kontoname",
        bio: "Profiltext", supporter: "Unterstützerstatus", supporterActive: "Verknüpft", supporterInactive: "Nicht verknüpft",
        savedAccounts: "Gespeicherte Konten", useAccount: "Anmelden", removeAccount: "Entfernen", noSavedAccounts: "Keine gespeicherten Konten.",
      overviewTab: "Übersicht", accountTab: "Konto", securityTab: "Sicherheit", profileTab: "Profil",
      accountActions: "Kontoaktionen", switchAccount: "Zu anderem Konto wechseln", createAccount: "Neues Konto erstellen", deleteAccount: "Konto löschen",
      security: "Sicherheit und Zugriff", password: "Passwort", resetPassword: "Passwort ändern / zurücksetzen", email: "E-Mail-Adresse",
      emailPlaceholder: "Neue E-Mail-Adresse", codePlaceholder: "Bestätigungscode", requestCode: "Code anfordern", submitCode: "Code bestätigen",
      profileBio: "Profilbeschreibung", saveBio: "Beschreibung speichern", bioPlaceholder: "Kurze Beschreibung für dein Profil",
      actionUnavailable: "Diese Spielaktion ist gerade nicht verfügbar.",
        wins: "Siege", verified: "E-Mail bestätigt", notVerified: "Nicht bestätigt",
      } : {
        overview: "Account overview", balance: "Account balance", accountRank: "Account rank", gameStats: "Game statistics",
        elo: "Elo", rating: "Rating", rank: "Rank", games: "Games played", clanStats: "Clan statistics",
        primaryClan: "Primary clan", secondaryClan: "Secondary clan rating", monthly: "Monthly points", total: "Total points",
        oneVsOne: "1v1", battleRoyale: "Battle Royale", zombies: "Zombie mode", clanLeadership: "Clan leadership",
        currentActivity: "Activity", online: "Online", offline: "Offline", accountName: "Account name",
        bio: "Profile bio", supporter: "Supporter status", supporterActive: "Connected", supporterInactive: "Not connected",
        savedAccounts: "Saved accounts", useAccount: "Log in", removeAccount: "Remove", noSavedAccounts: "No saved accounts.",
      overviewTab: "Overview", accountTab: "Account", securityTab: "Security", profileTab: "Profile",
      accountActions: "Account actions", switchAccount: "Switch to another account", createAccount: "Create new account", deleteAccount: "Delete account",
      security: "Security and access", password: "Password", resetPassword: "Change / reset password", email: "Email address",
      emailPlaceholder: "New email address", codePlaceholder: "Verification code", requestCode: "Request code", submitCode: "Verify code",
      profileBio: "Profile bio", saveBio: "Save bio", bioPlaceholder: "A short description for your profile",
      actionUnavailable: "This game action is not available right now.",
        wins: "Wins", verified: "Email verified", notVerified: "Not verified",
      }),
      });
      return Object.fromEntries(Object.entries(dictionary).map(([key, value]) => [key, normalizeAccountText(value)]));
    });
    const navigation = computed(() => [
      { id: "overview", icon: "◈", label: extendedLabels.value.overviewTab },
      { id: "account", icon: "◎", label: extendedLabels.value.accountTab },
      { id: "security", icon: "⌑", label: extendedLabels.value.securityTab },
      { id: "profile", icon: "◉", label: extendedLabels.value.profileTab },
    ]);

    function refresh() {
      const fx = window.__fx;
      language.value = String(fx?.getGameLanguage?.() || language.value || navigator.language || "en").toLowerCase();
      const nativeName = fx?.getNativeHomeNameInput?.()?.value;
      const names = fx?.getGameVar?.("rawPlayerNames");
      const playerId = fx?.getGameVar?.("playerId");
      playerName.value = String(typeof nativeName === "string" && nativeName.trim()
        ? nativeName : Array.isArray(names) ? names[playerId] || "" : "").trim();
      accountId.value = String(fx?.getNativeAccountId?.() || "").trim();
      gameProfile.value = fx?.myAccountAdapter?.getSnapshot?.() || null;
      savedAccounts.value = fx?.myAccountAdapter?.getSavedAccounts?.() || [];
    }

    function open() {
      if (visible.value) return;
      refresh();
      activeSection.value = "overview";
      bioDraft.value = String(gameProfile.value?.bio || "");
      status.value = "";
      visible.value = true;
      if (typeof window.__fx?.openAccount === "function") {
        returnMenuState = Number(window.__fx.nativeMenuState);
        handedOffToNative.value = false;
        profileHydrationListener = refresh;
        window.addEventListener("fx-my-account-profile-update", profileHydrationListener);
        window.__fx.openAccount();
      }
    }
    function close() {
      visible.value = false;
      if (!handedOffToNative.value && Number.isInteger(returnMenuState)
        && Number(window.__fx?.nativeMenuState) !== returnMenuState) {
        window.clearTimeout(restoreMenuTimer);
        restoreMenuTimer = window.setTimeout(() => window.__fx?.setNativeMenuState?.(returnMenuState), 120);
      }
      if (profileHydrationListener) window.removeEventListener("fx-my-account-profile-update", profileHydrationListener);
      profileHydrationListener = null;
    }
    function handoffToNative(action) {
      const target = findNativeButton(action.labelId, action.prefix === true);
      if (!target) { status.value = labels.value.actionUnavailable; return false; }
      handedOffToNative.value = true;
      visible.value = false;
      target.click();
      window.__fx?.hideCustomLobbyView?.();
      return true;
    }
    function useSavedAccount(index) {
      handedOffToNative.value = true;
      window.__fx?.myAccountAdapter?.useSavedAccount?.(index);
      close();
    }
    function removeSavedAccount(index) { window.__fx?.myAccountAdapter?.removeSavedAccount?.(index); refresh(); }
    async function copyId() {
      if (!accountId.value) return;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(accountId.value);
        else {
          const input = document.createElement("textarea");
          input.value = accountId.value;
          input.style.position = "fixed";
          input.style.opacity = "0";
          document.body.append(input);
          input.select();
          const copied = document.execCommand("copy");
          input.remove();
          if (!copied) throw new Error("Clipboard unavailable");
        }
        status.value = labels.value.copied;
      } catch { status.value = labels.value.copyFailed; }
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => { status.value = ""; }, 1800);
    }
    function changeName() {
      close();
      window.requestAnimationFrame(() => window.__fx?.openPlayerNameView?.());
    }
    function findNativeButton(labelId, prefix = false) {
      const expected = String(window.__fx?.getNativeGameLabel?.(labelId) || "").trim();
      if (!expected) return null;
      const candidates = [...document.querySelectorAll("button")].filter(button => !button.closest("#fx-my-account-view-root"));
      return candidates.reverse().find(button => {
        const text = String(button.textContent || "").trim();
        return prefix ? text.startsWith(expected) : text === expected;
      }) || null;
    }
    function findNativeSection(labelId) {
      const expected = String(window.__fx?.getNativeGameLabel?.(labelId) || "").trim();
      if (!expected) return null;
      return [...document.querySelectorAll("h2")].reverse().find(heading => heading.textContent.trim() === expected)?.parentElement || null;
    }
    function fillNativeInput(sectionLabelId, selector, value) {
      const section = findNativeSection(sectionLabelId);
      const input = section?.querySelector(selector);
      if (!input) return false;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur"));
      return true;
    }
    function requestEmailCode() {
      const section = findNativeSection(264);
      const email = section?.querySelector('input[type="email"]');
      if (email && emailDraft.value) {
        email.value = emailDraft.value.trim();
        email.dispatchEvent(new Event("input", { bubbles: true }));
        email.dispatchEvent(new Event("blur"));
      }
      if (!handoffToNative({ labelId: 268 })) return;
    }
    function submitEmailCode() {
      const section = findNativeSection(264);
      const codeInput = section?.querySelector('input:not([type="email"]):not([type="password"])');
      if (codeInput && verificationCode.value) {
        codeInput.value = verificationCode.value.trim();
        codeInput.dispatchEvent(new Event("input", { bubbles: true }));
        codeInput.dispatchEvent(new Event("blur"));
      }
      handoffToNative({ labelId: 271 });
    }
    function saveBio() {
      const section = findNativeSection(272);
      const input = section?.querySelector("textarea");
      if (!input) { status.value = labels.value.actionUnavailable; return; }
      input.value = bioDraft.value.slice(0, 160);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      handoffToNative({ labelId: 273 });
    }
    function onKeyDown(event) { if (visible.value && event.key === "Escape") close(); }

    onMounted(() => {
      refresh();
      refreshTimer = window.setInterval(refresh, 700);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("fx-my-account-profile-update", refresh);
      window.addEventListener("fx-my-account-saved-accounts-update", refresh);
      window.__fx.openVueMyAccount = open;
      window.__fx.closeVueMyAccount = close;
    });
    onBeforeUnmount(() => {
      window.clearInterval(refreshTimer);
      window.clearTimeout(statusTimer);
      window.clearTimeout(restoreMenuTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("fx-my-account-profile-update", refresh);
      if (profileHydrationListener) window.removeEventListener("fx-my-account-profile-update", profileHydrationListener);
      window.removeEventListener("fx-my-account-saved-accounts-update", refresh);
      if (window.__fx?.openVueMyAccount === open) delete window.__fx.openVueMyAccount;
      if (window.__fx?.closeVueMyAccount === close) delete window.__fx.closeVueMyAccount;
    });
    return {
      visible, activeSection, navigation, playerName, accountId, gameProfile, savedAccounts, status, isGerman,
      bioDraft, emailDraft, verificationCode, labels: extendedLabels, close, copyId, changeName,
      handoffToNative, requestEmailCode, submitEmailCode, saveBio, useSavedAccount, removeSavedAccount,
    };
  },
  template: `
    <div v-if="visible" class="fx-my-account-overlay" @pointerdown.self="close">
      <main class="fx-my-account-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-my-account-title">
        <header class="fx-my-account-header">
          <div class="fx-my-account-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg></div>
          <div><small>{{ labels.eyebrow }}</small><h1 id="fx-my-account-title">{{ labels.title }}</h1><p>{{ labels.subtitle }}</p></div>
          <button type="button" class="fx-my-account-close" :aria-label="labels.close" @click="close">×</button>
        </header>
        <div class="fx-my-account-layout">
          <nav class="fx-my-account-nav" :aria-label="labels.title">
            <button v-for="item in navigation" :key="item.id" type="button" :class="{ 'is-active': activeSection === item.id }" @click="activeSection = item.id"><span aria-hidden="true">{{ item.icon }}</span>{{ item.label }}</button>
          </nav>
          <section class="fx-my-account-content">
          <section v-if="activeSection === 'overview'" class="fx-my-account-section">
          <article class="fx-my-account-profile">
            <div class="fx-my-account-avatar">{{ (playerName || 'Z').replace(/^\s*\[[^\]]+\]\s*/, '').slice(0, 1).toUpperCase() }}</div>
            <div class="fx-my-account-profile-copy"><small>{{ labels.profile }}</small><strong :title="playerName">{{ playerName || labels.unavailable }}</strong></div>
            <button type="button" class="fx-my-account-primary" @click="changeName">{{ labels.changeName }} <span>›</span></button>
          </article>
          <article class="fx-my-account-id-card">
            <div><small>{{ labels.accountId }}</small><strong>{{ accountId || labels.unavailable }}</strong></div>
            <button type="button" :disabled="!accountId" @click="copyId">{{ labels.copy }}</button>
          </article>
          <section v-if="gameProfile" class="fx-my-account-data">
            <header><div><small>ZFX CLIENT · LIVE</small><h2>{{ labels.overview }}</h2></div><span :class="gameProfile.emailVerified ? 'is-verified' : 'is-unverified'">{{ gameProfile.emailVerified ? labels.verified : labels.notVerified }}</span></header>
            <div class="fx-my-account-native-status"><strong>{{ labels.accountName }}:</strong> {{ gameProfile.accountName || labels.unavailable }} <span :class="gameProfile.online ? 'is-online' : 'is-offline'">{{ gameProfile.online ? labels.online : labels.offline }}</span><small v-if="gameProfile.activityEn">{{ labels.currentActivity }}: {{ isGerman ? gameProfile.activityDe : gameProfile.activityEn }}</small></div>
            <div class="fx-my-account-metrics">
              <article><small>{{ labels.balance }}</small><strong>{{ gameProfile.balance?.toLocaleString() ?? '—' }} <i>Gold</i></strong></article>
              <article><small>{{ labels.accountRank }}</small><strong>{{ gameProfile.accountRank ?? '—' }}</strong></article>
            </div>
            <h3>{{ labels.gameStats }}</h3>
            <div class="fx-my-account-stats">
              <article><small>{{ labels.oneVsOne }}</small><strong>{{ gameProfile.oneVsOne.elo ?? '—' }} <i>{{ labels.elo }}</i></strong><span>{{ labels.rank }} {{ gameProfile.oneVsOne.rank ?? '—' }} · {{ gameProfile.oneVsOne.games ?? '—' }} {{ labels.games }}</span></article>
              <article><small>{{ labels.battleRoyale }}</small><strong>{{ gameProfile.battleRoyale.rating ?? '—' }} <i>{{ labels.rating }}</i></strong><span>{{ labels.rank }} {{ gameProfile.battleRoyale.rank ?? '—' }}</span></article>
              <article><small>{{ labels.zombies }}</small><strong>{{ gameProfile.zombies.rating ?? '—' }} <i>{{ labels.rating }}</i></strong><span>{{ labels.rank }} {{ gameProfile.zombies.rank ?? '—' }}</span></article>
            </div>
            <h3>{{ labels.clanStats }}</h3>
            <div class="fx-my-account-clans">
              <article v-if="gameProfile.primaryClan.tag"><small>{{ labels.primaryClan }} · [{{ gameProfile.primaryClan.tag }}]</small><strong>{{ gameProfile.primaryClan.total ?? '—' }} <i>{{ labels.total }}</i></strong><span>{{ gameProfile.primaryClan.monthly ?? '—' }} {{ labels.monthly }} · {{ labels.rank }} {{ gameProfile.primaryClan.rank ?? '—' }} · {{ gameProfile.primaryClan.wins ?? '—' }} {{ labels.wins }}</span></article>
              <article v-if="gameProfile.secondaryClan.tag"><small>{{ labels.secondaryClan }} · [{{ gameProfile.secondaryClan.tag }}]</small><strong>{{ gameProfile.secondaryClan.total ?? '—' }} <i>{{ labels.total }}</i></strong><span>{{ gameProfile.secondaryClan.wins ?? '—' }} {{ labels.wins }}</span></article>
              <article v-if="gameProfile.clanLeadership.clan"><small>{{ labels.clanLeadership }} · [{{ gameProfile.clanLeadership.clan }}]</small><strong>{{ gameProfile.clanLeadership.rating ?? '—' }} <i>{{ labels.rating }}</i></strong></article>
            </div>
            <h3>{{ labels.supporter }}</h3>
            <div class="fx-my-account-clans"><article><small>{{ labels.supporter }}</small><strong>{{ gameProfile.supporter ? labels.supporterActive : labels.supporterInactive }}</strong></article></div>
            <article v-if="gameProfile.bio" class="fx-my-account-bio"><small>{{ labels.bio }}</small><p>{{ gameProfile.bio }}</p></article>
          </section>
          </section>
          <section v-if="activeSection === 'account'" class="fx-my-account-section fx-my-account-account-section">
          <section class="fx-my-account-saved-accounts">
            <header><div><small>ZFX CLIENT · ACCOUNT ACCESS</small><h2>{{ labels.savedAccounts }}</h2></div><span>{{ savedAccounts.length }}</span></header>
            <p v-if="!savedAccounts.length" class="fx-my-account-empty">{{ gameProfile ? labels.noSavedAccounts : labels.unavailable }}</p>
            <article v-for="account in savedAccounts" :key="account.index" class="fx-my-account-saved-row">
              <div><span class="fx-my-account-saved-icon" aria-hidden="true">◉</span><strong>{{ account.name }}</strong></div>
              <button type="button" @click="useSavedAccount(account.index)">{{ labels.useAccount }}</button>
              <button type="button" class="is-remove" @click="removeSavedAccount(account.index)">{{ labels.removeAccount }}</button>
            </article>
          </section>
          <article class="fx-my-account-action-grid">
            <button type="button" @click="handoffToNative({ labelId: 206 })"><span>SW</span><strong>{{ labels.switchAccount }}</strong><i>&rsaquo;</i></button>
            <button type="button" @click="handoffToNative({ labelId: 207 })"><span>+</span><strong>{{ labels.createAccount }}</strong><i>&rsaquo;</i></button>
            <button type="button" class="is-danger" @click="handoffToNative({ labelId: 208, prefix: true })"><span>X</span><strong>{{ labels.deleteAccount }}</strong><i>&rsaquo;</i></button>
          </article>
          </section>
          <section v-if="activeSection === 'security'" class="fx-my-account-section">
            <header class="fx-my-account-section-heading"><small>ZFX CLIENT / SECURITY</small><h2>{{ labels.security }}</h2></header>
            <article class="fx-my-account-action-card">
              <div><strong>{{ labels.password }}</strong><p>{{ isGerman ? 'Fordere einen sicheren Link zum Zuruecksetzen deines Passworts an.' : 'Request a secure link to reset your password.' }}</p></div>
              <button type="button" @click="handoffToNative({ labelId: 200, prefix: true })">{{ labels.resetPassword }} <span>&rsaquo;</span></button>
            </article>
            <article class="fx-my-account-form-card">
              <div><strong>{{ labels.email }}</strong><p>{{ isGerman ? 'E-Mail-Adresse aktualisieren und mit einem Code bestaetigen.' : 'Update your email address and verify it with a code.' }}</p></div>
              <label><span>{{ labels.email }}</span><input v-model.trim="emailDraft" type="email" autocomplete="email" :placeholder="labels.emailPlaceholder"></label>
              <button type="button" :disabled="!emailDraft.trim()" @click="requestEmailCode">{{ labels.requestCode }}</button>
              <label><span>{{ isGerman ? 'Bestaetigungscode' : 'Verification code' }}</span><input v-model.trim="verificationCode" inputmode="numeric" autocomplete="one-time-code" :placeholder="labels.codePlaceholder"></label>
              <button type="button" :disabled="!verificationCode.trim()" @click="submitEmailCode">{{ labels.submitCode }}</button>
            </article>
          </section>
          <section v-if="activeSection === 'profile'" class="fx-my-account-section">
            <header class="fx-my-account-section-heading"><small>ZFX CLIENT / PROFILE</small><h2>{{ labels.profile }}</h2></header>
            <article class="fx-my-account-action-card">
              <div><strong>{{ playerName || labels.unavailable }}</strong><p>{{ isGerman ? 'Deinen sichtbaren Spielernamen aendern.' : 'Change your visible player name.' }}</p></div>
              <button type="button" @click="changeName">{{ labels.changeName }} <span>?</span></button>
            </article>
            <article class="fx-my-account-form-card">
              <label><span>{{ labels.profileBio }}</span><textarea v-model="bioDraft" maxlength="160" rows="4" :placeholder="labels.bioPlaceholder"></textarea></label>
              <div class="fx-my-account-form-actions"><small>{{ bioDraft.length }}/160</small><button type="button" @click="saveBio">{{ labels.saveBio }}</button></div>
            </article>
          </section>
          <p v-if="status" class="fx-my-account-status" role="status">{{ status }}</p>
        </section>
        </div>
        <footer class="fx-my-account-footer"><span><i></i>ZFX Client</span><button type="button" @click="close">{{ labels.close }}</button></footer>
      </main>
    </div>`,
});

export function createVueMyAccountView() {
  if (document.getElementById("fx-my-account-view-root")) return () => {};
  const host = document.createElement("div");
  host.id = "fx-my-account-view-root";
  document.body.appendChild(host);
  const app = createApp(MyAccountView);
  app.config.errorHandler = (error, _instance, info) => console.error("[ZFX Client MyAccountView] Vue error:", info, error);
  app.mount(host);
  return () => { app.unmount(); host.remove(); };
}
