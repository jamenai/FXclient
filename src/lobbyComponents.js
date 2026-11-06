import { defineComponent } from "vue/dist/vue.esm-bundler.js";

export const MapHeader = defineComponent({
  props: { map: String, mapImage: String, nextMap: String, nextTeamCountLabel: String, isContest: Boolean, nextIsContest: Boolean, noFullsend: Boolean, nextNoFullsend: Boolean, labels: Object, modes: Array, readyCount: Number, readyClans: Array, readyClanTotal: Number, teamCount: String, lobbyRating: Object, readyState: String, readyDisabled: Boolean },
  emits: ["select-mode", "ready"],
  template: `
    <header class="fx-custom-lobby-top">
      <nav class="fx-custom-lobby-modes" :aria-label="labels.modes">
        <button v-for="mode in modes" :key="mode.id" type="button"
          class="fx-custom-lobby-mode" :class="{ 'is-active': mode.active }"
          :data-mode="/team/i.test(mode.label) ? 'team' : /battle royale/i.test(mode.label) ? 'battle-royale' : /1v1/i.test(mode.label) ? 'duel' : /zombie/i.test(mode.label) ? 'zombie' : 'mode'"
          @click="$emit('select-mode', mode)">
          <span class="fx-custom-lobby-mode-meta">
            <span v-if="mode.clock" class="fx-custom-lobby-mode-clock"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>{{ mode.clock }}</span>
            <span class="fx-custom-lobby-mode-count-group">
              <span v-if="mode.count" class="fx-custom-lobby-mode-count">{{ mode.count }}</span>
              <span v-if="mode.teamCountLabel && /team/i.test(mode.label)" class="fx-custom-lobby-team-count">{{ mode.teamCountLabel }}</span>
            </span>
          </span>
          <span class="fx-custom-lobby-mode-emblem" aria-hidden="true">
            <svg v-if="/team/i.test(mode.label)" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 15.5a5 5 0 0 1 6.5 4.5"/></svg>
            <svg v-else-if="/battle royale/i.test(mode.label)" viewBox="0 0 24 24"><path d="M12 2.5 20 6v5.2c0 5-3.4 8.2-8 10.3-4.6-2.1-8-5.3-8-10.3V6Z"/><circle cx="12" cy="11" r="3.2"/><path d="M12 6.5v1.3m0 6.4v1.3m-4.5-3.5h1.3m6.4 0h1.3"/></svg>
            <svg v-else-if="/1v1/i.test(mode.label)" viewBox="0 0 24 24"><path d="m5 4 14 16M19 4 5 20"/><path d="m3.5 2.5 3 1-1 3m15-4-3 1 1 3M3.5 21.5l3-1-1-3m15 4-3-1 1-3"/><path d="M9 8h6M9 16h6"/></svg>
            <svg v-else-if="/zombie/i.test(mode.label)" viewBox="0 0 24 24"><path d="M5 10a7 7 0 1 1 14 0v6a2 2 0 0 1-2 2h-1l-2 3h-4l-2-3H7a2 2 0 0 1-2-2Z"/><path d="M9 11h1m4 0h1m-6 4 2 1 2-1m-4 4v2m6-2v2"/><path d="m7 5-2-2m12 2 2-2"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2Z"/><path d="m19 15 1.2 3.1L23 19.3l-2.8 1.1L19 23l-1.1-2.6-2.9-1.1 2.9-1.2L19 15Z"/></svg>
          </span>
          <strong class="fx-custom-lobby-mode-title">{{ mode.label }}</strong>
          <span v-if="mode.map" class="fx-custom-lobby-mode-map">{{ mode.map }}</span>
        </button>
      </nav>
      <div class="fx-custom-lobby-map-cards">
      <section class="fx-custom-lobby-map-hero" :class="{ 'is-contest': isContest }">
        <img v-if="mapImage" class="fx-custom-lobby-map-image" :src="mapImage" alt="" aria-hidden="true">
        <div class="fx-custom-lobby-map-heading">
          <span>{{ labels.currentMap }}<b v-if="isContest" class="fx-custom-lobby-contest-badge">🏆 CONTEST</b></span>
          <h1>{{ map || labels.title }}</h1>
          <strong v-if="teamCount" class="fx-custom-lobby-map-team-count">{{ teamCount }}</strong>
          <section class="fx-custom-lobby-rating-card" :title="lobbyRating?.title || labels.lobbyRatingUnavailable">
            <img v-if="lobbyRating" :src="lobbyRating.image" alt="" aria-hidden="true">
            <div><span>{{ labels.lobbyRating }}</span><strong>{{ lobbyRating?.value || '—' }}<small v-if="lobbyRating"> / 10</small></strong><small>{{ lobbyRating?.meta || labels.lobbyRatingUnavailable }}</small></div>
          </section>
        </div>
        <section class="fx-custom-lobby-clan-chart-card" :aria-label="labels.readyClansByClan">
          <svg class="fx-custom-lobby-clan-chart-pie" viewBox="0 0 42 42" role="img" :aria-label="labels.readyClansByClan">
            <circle class="fx-custom-lobby-clan-chart-track" cx="21" cy="21" r="16" />
            <circle v-for="clan in readyClans" :key="clan.tag" class="fx-custom-lobby-clan-chart-slice" cx="21" cy="21" r="16" :stroke="clan.color" :stroke-dasharray="clan.dashArray" :stroke-dashoffset="clan.dashOffset" />
            <text x="21" y="22" text-anchor="middle">{{ readyClanTotal }}</text>
          </svg>
          <div class="fx-custom-lobby-clan-chart-legend">
            <strong>{{ labels.readyClansByClan }}</strong>
            <span v-if="!readyClans.length" class="fx-custom-lobby-clan-chart-empty">{{ labels.noReadyClanPlayers }}</span>
            <span v-for="clan in readyClans" :key="clan.tag" class="fx-custom-lobby-clan-chart-item" :title="clan.count + ' ' + labels.ready.toLowerCase()">
              <i :style="{ backgroundColor: clan.color }"></i><b v-if="!clan.isOthers">{{ clan.tag }}</b><b v-else>({{ labels.others }})</b><span>{{ clan.count }}</span>
            </span>
          </div>
        </section>
        <div class="fx-custom-lobby-map-details">
          <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/></svg><span>{{ labels.currentMap }}</span><strong>{{ map || '—' }}</strong></div>
          <div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m2-9a3 3 0 1 0 0-6m1 9a5 5 0 0 1 3 4"/></svg><span>{{ labels.readyPlayers }}</span><strong>{{ readyCount }}</strong></div>
          <div v-if="teamCount"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0m1-4a4.5 4.5 0 0 1 5 4"/></svg><span>{{ labels.teams }}</span><strong>{{ teamCount }}</strong></div>
          <strong v-if="noFullsend" class="fx-custom-lobby-rules-badge">NO FULLSEND</strong>
          <button type="button" class="fx-custom-lobby-ready" :class="'is-' + readyState" :aria-pressed="readyState === 'ready'" :disabled="readyDisabled" @click="$emit('ready')">{{ labels.readyAction }}</button>
        </div>
      </section>
      <article class="fx-custom-lobby-card fx-custom-lobby-next-card" :class="{ 'is-contest': nextIsContest }"><span>{{ labels.nextMap }}<b v-if="nextIsContest" class="fx-custom-lobby-contest-badge">🏆 CONTEST</b></span><strong>{{ nextMap || "-" }}</strong><small v-if="nextTeamCountLabel" class="fx-custom-lobby-next-teams">{{ nextTeamCountLabel }}</small><strong v-if="nextNoFullsend" class="fx-custom-lobby-rules-badge">NO FULLSEND</strong></article>
      </div>
    </header>`,
});

export const LobbyProgress = defineComponent({
  props: { snapshot: Object, labels: Object },
  template: `
    <section class="fx-custom-lobby-summary">
      <article class="fx-custom-lobby-progress-card">
        <div class="fx-custom-lobby-progress-track"><div class="fx-custom-lobby-progress-fill" :style="{ width: (snapshot.progressPercent ?? 0) + '%' }"></div></div>
        <strong class="fx-custom-lobby-progress-percent">{{ percentLabel }}</strong>
        <span class="fx-custom-lobby-progress-eta">{{ etaLabel }}</span>
      </article>
    </section>`,
  data() { return {
    progressSamples: [], progressTimer: 0, currentTime: Date.now(),
    countdownSequence: null, audioContext: null, audioUnlockHandler: null,
  }; },
  mounted() {
    this.recordProgressSample();
    this.audioUnlockHandler = () => this.unlockProgressAudio();
    document.addEventListener("pointerdown", this.audioUnlockHandler, { capture: true, passive: true });
    document.addEventListener("keydown", this.audioUnlockHandler, { capture: true });
    this.progressTimer = window.setInterval(() => {
      this.currentTime = Date.now();
      this.recordProgressSample();
      this.tickProgressCountdown();
    }, 250);
  },
  beforeUnmount() {
    if (this.progressTimer) window.clearInterval(this.progressTimer);
    if (this.audioUnlockHandler) {
      document.removeEventListener("pointerdown", this.audioUnlockHandler, true);
      document.removeEventListener("keydown", this.audioUnlockHandler, true);
    }
    this.audioContext?.close().catch(() => {});
  },
  watch: {
    "snapshot.progressPercent"() {
      this.recordProgressSample();
      this.tickProgressCountdown();
    },
  },
  computed: {
    percentLabel() {
      const value = this.snapshot.progressPercent ?? 0;
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    },
    etaSeconds() {
      const percent = Number(this.snapshot.progressPercent);
      const now = this.currentTime;
      if (!Number.isFinite(percent) || percent >= 100) return null;
      const samples = this.progressSamples;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const elapsedMinutes = first && last ? (last.time - first.time) / 60000 : 0;
      const gained = first && last ? last.percent - first.percent : 0;
      const rate = elapsedMinutes > 0 ? gained / elapsedMinutes : 0;
      if (rate <= 0) return null;
      const minutesRemaining = Math.max(0, (100 - percent) / rate - Math.max(0, (now - last.time) / 60000));
      return Number.isFinite(minutesRemaining) ? Math.ceil(minutesRemaining * 60) : null;
    },
    etaLabel() {
      const percent = Number(this.snapshot.progressPercent);
      if (!Number.isFinite(percent)) return this.labels.etaUnavailable;
      if (percent >= 100) return "100%";
      const etaSeconds = this.etaSeconds;
      if (!Number.isFinite(etaSeconds)) return this.labels.etaUnavailable;
      let estimate;
      if (etaSeconds < 60) estimate = `~${Math.max(1, etaSeconds)} s`;
      else if (etaSeconds < 3600) estimate = `~${Math.ceil(etaSeconds / 60)} min`;
      else estimate = `~${Math.floor(etaSeconds / 3600)} h ${Math.ceil((etaSeconds % 3600) / 60)} min`;
      return estimate;
    },
  },
  methods: {
    unlockProgressAudio() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioContext ||= new AudioContextClass();
        if (this.audioContext.state === "suspended") this.audioContext.resume().catch(() => {});
      } catch { /* Audio is optional. */ }
    },
    playProgressBeep(second) {
      try {
        this.unlockProgressAudio();
        const context = this.audioContext;
        if (!context || context.state !== "running") return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(second === 1 ? 980 : 760, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.13);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.14);
      } catch { /* Audio is optional. */ }
    },
    tickProgressCountdown() {
      const percent = Number(this.snapshot.progressPercent);
      if (!Number.isFinite(percent) || percent <= 80) {
        this.countdownSequence = null;
        return;
      }
      if (!this.countdownSequence) {
        const eta = this.etaSeconds;
        if (!Number.isFinite(eta) || eta > 5 || eta < 1) return;
        this.countdownSequence = { nextSecond: Math.min(5, eta), nextAt: Date.now() };
      }
      if (this.countdownSequence.nextSecond < 1 || Date.now() < this.countdownSequence.nextAt) return;
      const second = this.countdownSequence.nextSecond;
      this.playProgressBeep(second);
      this.countdownSequence.nextSecond--;
      this.countdownSequence.nextAt = Date.now() + 1000;
    },
    recordProgressSample() {
      const percent = Number(this.snapshot.progressPercent);
      if (!Number.isFinite(percent)) return;
      const time = Date.now();
      const last = this.progressSamples[this.progressSamples.length - 1];
      if (last && percent < last.percent) {
        this.progressSamples = [];
        this.countdownSequence = null;
      }
      const currentLast = this.progressSamples[this.progressSamples.length - 1];
      if (!currentLast || percent > currentLast.percent) {
        this.progressSamples.push({ percent, time });
      }
      this.progressSamples = this.progressSamples.filter(sample => time - sample.time <= 30 * 60 * 1000);
    },
  },
});

export const PlayerList = defineComponent({
  props: { players: Array, allPlayers: Array, clans: Array, labels: Object, count: Number, playerCountLabel: String, query: String, sortBy: String, readyFilter: String, affiliationFilter: String, activeTab: String, chatMessages: Array, chatStatus: String, teamMode: Boolean, teamPlayers: Array, teamClan: String, teamCount: String, clanCount: String, topReadyClan: Object, onlyReadyClans: Boolean, currentMap: String, nextMap: String, nextTeamCount: String },
  emits: ["update:query", "update:sort", "update:ready-filter", "update:affiliation-filter", "reset-filter-groups", "reset-filters", "filter-ready-clans", "select-player", "select-tab", "send-chat", "send-call", "send-join", "send-team-message"],
  data() { return { teamMessage: "", teamMessageStatus: "" }; },
  template: `
    <section class="fx-custom-lobby-player-panel fx-custom-lobby-workspace">
      <nav class="fx-custom-lobby-workspace-tabs" :aria-label="labels.lobbyViews">
        <button type="button" data-tab="overview" :class="{ 'is-active': activeTab === 'overview' }" :aria-selected="activeTab === 'overview'" @click="$emit('select-tab', 'overview')"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>{{ labels.overview }}</button>
        <button type="button" data-tab="chat" :class="{ 'is-active': activeTab === 'chat' }" :aria-selected="activeTab === 'chat'" @click="$emit('select-tab', 'chat')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 10h8M8 14h5"/></svg>{{ labels.chat }}</button>
        <button type="button" data-tab="players" :class="{ 'is-active': activeTab === 'players' }" :aria-selected="activeTab === 'players'" @click="$emit('select-tab', 'players')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2Z"/></svg>{{ labels.players }} <span class="fx-custom-lobby-tab-count">{{ playerCountLabel }}</span></button>
        <button type="button" data-tab="clans" :class="{ 'is-active': activeTab === 'clans' }" :aria-selected="activeTab === 'clans'" @click="$emit('select-tab', 'clans')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 6v5.2c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6Z"/><path d="M8 12h8M12 8v8"/></svg>{{ labels.clans }} <span class="fx-custom-lobby-tab-count">{{ clanCount }}</span></button>
        <button v-if="teamMode" type="button" data-tab="team" :class="{ 'is-active': activeTab === 'team' }" :aria-selected="activeTab === 'team'" @click="$emit('select-tab', 'team')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 15.5a5 5 0 0 1 6.5 4.5"/></svg>{{ labels.team }} <span class="fx-custom-lobby-tab-count">{{ teamCount }}</span></button>
        <button v-if="teamMode" type="button" data-tab="calls" :class="{ 'is-active': activeTab === 'calls' }" :aria-selected="activeTab === 'calls'" @click="$emit('select-tab', 'calls')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v5m0 8v5M3 12h5m8 0h5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>{{ labels.calls }}</button>
      </nav>
      <div v-if="activeTab === 'players' || (activeTab === 'team' && teamMode)" class="fx-custom-lobby-roster-view">
        <div class="fx-custom-lobby-player-header">
          <input type="search" :value="query" :placeholder="labels.search" :aria-label="labels.search" @input="$emit('update:query', $event.target.value)">
          <label class="fx-custom-lobby-sort"><span>{{ labels.sort }}</span><select :value="sortBy" :aria-label="labels.sort" @change="$emit('update:sort', $event.target.value)"><option value="rank-desc">{{ labels.sortRankDesc }}</option><option value="rank-asc">{{ labels.sortRankAsc }}</option><option value="name">{{ labels.sortName }}</option></select></label>
          <div class="fx-custom-lobby-filter-toolbar">
            <button type="button" :class="{ 'is-active': readyFilter === 'all' && (activeTab === 'team' || affiliationFilter === 'all') }" @click="$emit('reset-filter-groups')">{{ labels.all }}</button>
            <div class="fx-custom-lobby-filters" role="group" :aria-label="labels.readinessFilters">
              <button type="button" :class="{ 'is-active': readyFilter === 'ready' }" @click="$emit('update:ready-filter', 'ready')">{{ labels.ready }}</button>
              <button type="button" :class="{ 'is-active': readyFilter === 'not-ready' }" @click="$emit('update:ready-filter', 'not-ready')">{{ labels.notReady }}</button>
            </div>
            <div v-if="activeTab !== 'team'" class="fx-custom-lobby-filters" role="group" :aria-label="labels.affiliationFilters">
              <button type="button" :class="{ 'is-active': affiliationFilter === 'clan' }" @click="$emit('update:affiliation-filter', 'clan')">{{ labels.clan }}</button>
              <button type="button" :class="{ 'is-active': affiliationFilter === 'followed' }" @click="$emit('update:affiliation-filter', 'followed')">{{ labels.followed }}</button>
            </div>
            <button type="button" class="fx-custom-lobby-filter-reset" @click="$emit('reset-filters')">{{ labels.resetFilters }}</button>
          </div>
        </div>
        <div class="fx-custom-lobby-table-wrap">
          <table class="fx-custom-lobby-table">
            <thead><tr><th>#</th><th>{{ labels.players }}</th><th>{{ labels.clan }}</th><th>{{ labels.rank }}</th><th>{{ labels.status }}</th></tr></thead>
            <tbody>
              <tr v-for="(player, index) in visiblePlayers" :key="player.id || player.name + ':' + index" :class="{ 'is-self': player.self }" :title="player.title || player.name" :style="player.color ? { '--fx-custom-player-color': player.color } : null" @click="$emit('select-player', player)">
                <td>{{ index + 1 }}</td>
                <td class="fx-custom-lobby-player-name"><i class="fx-custom-lobby-status-dot" :class="'is-' + player.readiness"></i>{{ player.name }}</td>
                <td class="fx-custom-lobby-player-clan">{{ player.clan ? '[' + player.clan + ']' : '—' }}</td>
                <td>{{ player.rankText || (player.rank ? '#' + player.rank.toLocaleString() : '-') }}</td>
                <td class="fx-custom-lobby-player-status" :class="'is-' + player.readiness">{{ player.readiness === 'ready' ? labels.ready : player.readiness === 'not-ready' ? labels.notReady : labels.online }}</td>
              </tr>
              <tr v-if="!visiblePlayers.length"><td colspan="5" class="fx-custom-lobby-empty">{{ activeTab === 'team' && !teamClan ? labels.noClan : labels.noPlayers }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <section v-else-if="activeTab === 'overview'" class="fx-custom-lobby-overview">
        <div class="fx-custom-lobby-overview-stats">
          <article class="is-players"><span>{{ labels.players }}</span><strong>{{ playerCountLabel }}</strong></article>
          <article class="is-clans"><span>{{ labels.clans }}</span><strong>{{ clanCount }}</strong></article>
          <article v-if="teamMode" class="is-team"><span>{{ labels.team }}</span><strong>{{ teamCount }}</strong></article>
          <article v-if="topReadyClan" class="is-top-clan"><span>{{ labels.topReadyClan }}</span><strong>[{{ topReadyClan.tag }}]</strong><small>{{ topReadyClan.readyCount }} / {{ topReadyClan.players.length }} {{ labels.ready.toLowerCase() }}</small></article>
        </div>
        <section class="fx-custom-lobby-overview-top-ready">
          <header><div><h2>{{ labels.topReadyPlayers }}</h2><p>{{ labels.overviewLeadersNote }}</p></div><span class="fx-custom-lobby-overview-count">{{ topReadyPlayers.length }} / 3</span></header>
          <ol v-if="topReadyPlayers.length">
            <li v-for="(player, index) in topReadyPlayers" :key="player.id || player.name" :class="{ 'is-self': player.self }">
              <span class="fx-custom-lobby-overview-place" :class="'is-place-' + (index + 1)">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="fx-custom-lobby-overview-name"><i class="fx-custom-lobby-status-dot is-ready"></i><strong>{{ player.name }}</strong><small>{{ player.rankText || (player.rank ? '#' + player.rank.toLocaleString() : '-') }}</small></span>
              <span v-if="player.clan" class="fx-custom-lobby-overview-clan">[{{ player.clan }}]</span>
            </li>
          </ol>
          <p v-else class="fx-custom-lobby-empty">{{ labels.noReadyPlayers }}</p>
        </section>
      </section>
      <section v-else-if="activeTab === 'clans'" class="fx-custom-lobby-clans-view">
        <div class="fx-custom-lobby-filters fx-custom-lobby-clan-filters" role="group" :aria-label="labels.clans">
          <button type="button" :class="{ 'is-active': !onlyReadyClans }" @click="$emit('filter-ready-clans', false)">{{ labels.all }}</button>
          <button type="button" :class="{ 'is-active': onlyReadyClans }" @click="$emit('filter-ready-clans', true)">{{ labels.onlyReadyClans }}</button>
        </div>
        <div class="fx-custom-lobby-table-wrap">
          <table class="fx-custom-lobby-table">
            <thead><tr><th>#</th><th>{{ labels.clan }}</th><th>{{ labels.players }}</th><th>{{ labels.ready }}</th></tr></thead>
            <tbody>
              <tr v-for="(clan, index) in clans" :key="clan.tag" :class="{ 'is-self': teamClan && clan.tag === teamClan }">
                <td>{{ index + 1 }}</td><td class="fx-custom-lobby-player-clan">[{{ clan.tag }}]</td>
                <td>{{ clan.players.length }}</td><td>{{ clan.readyCount }} / {{ clan.players.length }}</td>
              </tr>
              <tr v-if="!clans.length"><td colspan="4" class="fx-custom-lobby-empty">{{ onlyReadyClans ? labels.noReadyClans : labels.noClans }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-else-if="activeTab === 'calls' && teamMode" class="fx-custom-lobby-calls-view">
        <div class="fx-custom-lobby-call-actions">
          <button type="button" :disabled="!teamClan" @click="$emit('send-join', 'cont')">{{ labels.joinCont }}</button>
          <button type="button" :disabled="!teamClan" @click="$emit('send-join', 'current')">{{ labels.join }}</button>
          <button type="button" :disabled="!teamClan || !nextMap || !nextTeamCount" @click="$emit('send-join', 'next')">{{ labels.joinNext.replace('{map}', nextMap || labels.nextGame).replace('{count}', (nextTeamCount || '').replace(/\s*teams?$/i, '') || '?') }}</button>
        </div>
        <div class="fx-custom-lobby-call-compass" role="group" :aria-label="labels.spawnDirections">
          <button v-for="direction in spawnDirections" :key="direction.key" type="button" :class="{ 'is-center': direction.key === 'center' }" :style="{ gridColumn: direction.column, gridRow: direction.row }" :disabled="!teamClan || !currentMap" :aria-label="labels[direction.labelKey]" :title="labels[direction.labelKey]" @click="$emit('send-call', direction.key)"><span>{{ direction.icon }}</span></button>
        </div>
        <form class="fx-custom-lobby-call-message" @submit.stop.prevent="sendTeamMessage">
          <input v-model="teamMessage" type="text" :maxlength="110" :placeholder="labels.teamMessagePlaceholder" :aria-label="labels.teamMessagePlaceholder" :disabled="!teamClan" @keydown.stop @keyup.stop @keypress.stop>
          <button type="submit" :disabled="!teamClan || !teamMessage.trim()">{{ labels.send }}</button>
          <span v-if="teamMessageStatus" role="status">{{ teamMessageStatus }}</span>
        </form>
      </section>
      <LobbyChat v-else :labels="labels" :messages="chatMessages" :status="chatStatus" @send="sendChat" />
    </section>`,
  computed: {
    spawnDirections() { return [
      { key: "top left", icon: "↖", labelKey: "topLeft", column: 1, row: 1 },
      { key: "top", icon: "↑", labelKey: "top", column: 2, row: 1 },
      { key: "top right", icon: "↗", labelKey: "topRight", column: 3, row: 1 },
      { key: "left", icon: "←", labelKey: "left", column: 1, row: 2 },
      { key: "center", icon: "◎", labelKey: "center", column: 2, row: 2 },
      { key: "right", icon: "→", labelKey: "right", column: 3, row: 2 },
      { key: "bottom left", icon: "↙", labelKey: "bottomLeft", column: 1, row: 3 },
      { key: "bottom", icon: "↓", labelKey: "bottom", column: 2, row: 3 },
      { key: "bottom right", icon: "↘", labelKey: "bottomRight", column: 3, row: 3 },
    ]; },
    visiblePlayers() { return this.activeTab === "team" ? this.teamPlayers : this.players; },
    topReadyPlayers() {
      return [...(this.allPlayers || [])]
        .filter(player => player.readiness === "ready")
        .sort((left, right) => (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY)
          || left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
        .slice(0, 3);
    },
  },
  methods: {
    sendChat(message, callback) { this.$emit("send-chat", message, callback); },
    sendTeamMessage() {
      const message = this.teamMessage.trim();
      if (!message || !this.teamClan) return;
      this.teamMessageStatus = "";
      this.$emit("send-team-message", message, sent => {
        this.teamMessageStatus = sent ? this.labels.messageSent : this.labels.messageSendFailed;
        if (sent) this.teamMessage = "";
      });
    },
  },
});

export const LobbyChat = defineComponent({
  props: { labels: Object, messages: Array, status: String },
  emits: ["send"],
  data() { return { message: "", activationTimer: 0, activationStartedAt: 0, stickToChatBottom: true }; },
  mounted() {
    this.activationStartedAt = Date.now();
    const tryActivate = () => {
      const activate = window.__fx?.setNativeLobbyChatMode;
      if (typeof activate === "function") {
        this.activationTimer = 0;
        if (window.__fx?.lobbyChatActivationStatus !== "sent:0") activate(0);
        return;
      }
      if (Date.now() - this.activationStartedAt >= 60000) {
        this.activationTimer = 0;
        console.warn("[ZFX Client LobbyChat] Native chat activation bridge did not become available.");
        return;
      }
      this.activationTimer = window.setTimeout(tryActivate, 250);
    };
    tryActivate();
    this.$nextTick(() => {
      const list = this.$refs.messages;
      if (list) list.scrollTop = list.scrollHeight;
    });
  },
  beforeUnmount() {
    if (this.activationTimer) window.clearTimeout(this.activationTimer);
  },
  methods: {
    submit() {
      const message = this.message.trim();
      if (message) this.$emit("send", message, sent => { if (sent) this.message = ""; });
    },
  },
  template: `
    <section class="fx-custom-lobby-chat-view" :aria-label="labels.chat">
      <div ref="messages" class="fx-custom-lobby-chat-messages" aria-live="polite">
        <p v-for="entry in messages" :key="entry.id"><span v-if="entry.senderName" class="fx-custom-lobby-chat-sender" :style="entry.senderColor ? { color: entry.senderColor } : null">{{ entry.senderName }}: </span><template v-if="entry.segments && entry.segments.length"><span v-for="(segment, index) in entry.segments" :key="index" :style="segment.color ? { color: segment.color } : null">{{ segment.text }}</span></template><template v-else>{{ entry.text }}</template></p>
        <span v-if="!messages.length" class="fx-custom-lobby-chat-empty">{{ labels.chatEmpty }}</span>
      </div>
      <span v-if="status" class="fx-custom-lobby-chat-status">{{ status }}</span>
      <span class="fx-custom-lobby-chat-command-hint">/diag · /help</span>
      <form class="fx-custom-lobby-chat-compose" @submit.stop.prevent="submit">
        <input v-model="message" type="text" :placeholder="labels.chatPlaceholder" :aria-label="labels.chatPlaceholder" @keydown.stop @keyup.stop @keypress.stop>
        <button type="submit">{{ labels.send }}</button>
      </form>
    </section>`,
  beforeUpdate() {
    const list = this.$refs.messages;
    this.stickToChatBottom = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 32;
  },
  updated() {
    const list = this.$refs.messages;
    if (list && this.stickToChatBottom) list.scrollTop = list.scrollHeight;
  },
});

PlayerList.components = { LobbyChat };

export const ClanOverview = defineComponent({
  props: { clan: String, readyCount: Number, memberCount: Number, members: Array, labels: Object },
  template: `
    <aside class="fx-custom-lobby-side-panel">
      <article class="fx-custom-lobby-card fx-custom-lobby-clan-card">
        <header class="fx-custom-lobby-clan-heading">
          <span class="fx-custom-lobby-card-icon" aria-hidden="true">♜</span>
          <div class="fx-custom-lobby-clan-title"><h2>{{ labels.clanTitle }}</h2><span v-if="clan" class="fx-custom-lobby-clan-tag">{{ clan }}</span></div>
          <div class="fx-custom-lobby-clan-ready" :aria-label="readyCount + ' / ' + memberCount + ' ' + labels.ready.toLowerCase()">
            <span class="fx-custom-lobby-clan-ready-value">{{ readyCount }}<span class="fx-custom-lobby-clan-ready-total"> / {{ memberCount }}</span></span>
            <span class="fx-custom-lobby-clan-ready-label">{{ labels.ready }}</span>
          </div>
        </header>
        <div class="fx-custom-lobby-clan-members"><span v-for="player in members" :key="player.id || player.name" class="fx-custom-lobby-clan-member"><i class="fx-custom-lobby-status-dot" :class="'is-' + player.readiness"></i>{{ player.name }}</span></div>
      </article>
    </aside>`,
});

