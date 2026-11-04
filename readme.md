<p align="center">
  <a href="https://jamenai.github.io/FXclient/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="/assets/logo_text_dark.png">
      <source media="(prefers-color-scheme: light)" srcset="/assets/logo_text_light.png">
      <img src="/assets/logo_text_light.png" width="20%">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://discord.gg/Hzqm6NSRp"><img alt="Zulus FXClient Discord" src="https://img.shields.io/badge/Discord-Zulus%20FXClient-5865F2?logo=discord&logoColor=white"></a>
  <a href="https://github.com/jamenai/FXclient/actions/workflows/deploy_github_pages.yml"><img src="https://github.com/jamenai/FXclient/actions/workflows/deploy_github_pages.yml/badge.svg" alt="Build and Publish to GitHub Pages"></a>
  <a href="https://jamenai.github.io/FXclient/"><img src="https://github.com/jamenai/FXclient/actions/workflows/pages/pages-build-deployment/badge.svg" alt="pages-build-deployment"></a>
</p>

## Zulus FXClient
Zulus FXClient is an independently maintained fork of the original FX Client for Territorial.io. It keeps the core FX Client features and adds its own lobby, player-list, and in-game improvements.

**Use the latest Zulus FXClient here: https://jamenai.github.io/FXclient/**

### Zulus-specific features
1. A compact lobby layout with filters for readiness, followed players, and clan members
2. Player-list sorting by rank or followed status
3. Highlights for duplicate IP addresses and players from your clan
4. An estimated troop count for eliminating a territory, alongside density information
5. Settings to customize these lobby and in-game enhancements

### Core FX Client features
1. It's free and open source on Github
2. It's ad-free and removes the game's default ads
3. It makes game look cooler, by replacing default assets with new ones
4. Displays your troop density and maximum troops
5. Displays the density of players and bots
6. Adds a "Clan" tab to the leaderboard, allowing you to easily see your clanmates, along with a "Rivals" tab to see how your clan compares to others
7. Adds custom lobbies
8. Hovering tooltip: makes the territory map information (normally visible on right click) be visible constantly (on hover)
9. Adds a player list
10. In team games, clicking on a player's name in the leaderboard or the player list allows you to see who donated to them
11. Adds a win counter & an in-game tick counter
12. Makes replays more useful by auto-saving recent games and adding a seek bar for rewinding/fast-forwarding replays
13. Can be installed as a PWA (progressive web app) and works offline both as an installed app and in the browser

#### Zulus FXClient also includes a settings menu to:

14. Make fullscreen mode trigger automatically
15. Set a custom main menu background
16. Create custom attack percentage keybinds that are also usable on mobile (with optional on-screen buttons)
... and more!

## Building Locally

To build the client locally, install Node.js if you haven't already, clone the repo, then run:

```
npm install
npm run build
```

This will install the dependencies, download the game and build the client.

To build from an already downloaded copy of the game, use `npm run build-only`.

To preview the generated client over HTTP, you can start the optional preview server after building:

```
npm run serve
```

Then open http://localhost:4173. The preview server is optional; you can also open `build/index.html` directly with `file://`.

For a one-command build and preview, use:

```
npm start
```

The preview port can be changed on Windows PowerShell with:

```
$env:FXCLIENT_PORT=8080; npm run serve
```

## Community

For community discussion, join the Zulus FXClient Discord: https://discord.gg/Hzqm6NSRp
