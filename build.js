// @ts-check
import beautifier from 'js-beautify';
const { js: beautify } = beautifier;
import UglifyJS from 'uglify-js';
import fs from 'fs';
import webpack from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';
import ModUtils, { minifyCode } from './modUtils.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const buildPath = path.join(projectRoot, 'build');
const stagingPath = path.join(projectRoot, `.build-staging-${process.pid}`);
const backupPath = path.join(projectRoot, `.build-backup-${process.pid}`);
const artefactsPath = path.join(stagingPath, 'build_artefacts.js');

{ // color debug output in gray
  const old_debug = console.debug
  console.debug = (...args) => old_debug("\x1b[90m", ...args, "\x1b[0m")
}

function prepareStagingDirectory() {
	fs.rmSync(stagingPath, { recursive: true, force: true });
	if (!fs.existsSync(buildPath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, buildPath);
	else fs.rmSync(backupPath, { recursive: true, force: true });
	fs.mkdirSync(stagingPath, { recursive: true });
	fs.cpSync(path.join(projectRoot, 'static'), stagingPath, { recursive: true });
	fs.cpSync(path.join(projectRoot, 'assets'), path.join(stagingPath, 'assets'), { recursive: true });
	const buildTimestamp = Date.now().toString();
	const indexPath = path.join(stagingPath, 'index.html');
	const serviceWorkerPath = path.join(stagingPath, 'sw2.js');
	fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace(/buildTimestamp/g, buildTimestamp));
	fs.writeFileSync(serviceWorkerPath, fs.readFileSync(serviceWorkerPath, 'utf8').replace('buildTimestamp', buildTimestamp));
	return buildTimestamp;
}

function publishStagingDirectory() {
	let movedExistingBuild = false;
	try {
		if (fs.existsSync(buildPath)) {
			fs.renameSync(buildPath, backupPath);
			movedExistingBuild = true;
		}
		fs.renameSync(stagingPath, buildPath);
	} catch (error) {
		if (movedExistingBuild && !fs.existsSync(buildPath) && fs.existsSync(backupPath))
			fs.renameSync(backupPath, buildPath);
		throw error;
	}
	if (movedExistingBuild) fs.rmSync(backupPath, { recursive: true, force: true });
}

const buildClientCode = () => /** @type {Promise<void>} */(new Promise((resolve, reject) => {
	console.log("Building client code...");
	webpack({
		mode: 'production',
		entry: { fxClient: "./src/main.js" },
		output: {
			path: stagingPath,
			filename: 'fx.bundle.js',
		},
	}, (err, stats) => {
		if (err) {
			if (err.details) console.error(err.details);
			return reject(err);
		}
		const info = stats?.toJson();
		if (stats?.hasWarnings()) console.warn(info?.warnings);
		if (stats?.hasErrors()) {
			console.error(info?.errors);
			return reject("Webpack compilation error");
		}
		fs.writeFileSync(
			path.join(stagingPath, 'fx.bundle.js'),
			Buffer.concat([fs.readFileSync(artefactsPath), fs.readFileSync(path.join(stagingPath, 'fx.bundle.js'))])
		);
		resolve();
	});
}));

async function patchGameCode(buildTimestamp) {

	let script = fs.readFileSync('./game/latest.js', { encoding: 'utf8' }).trim();
	console.debug("Script start: ", script.slice(0, 250))
	console.debug("Script end: ", script.slice(-250))

	const exposeVarsToGlobalScope = true;
	// need to first remove the iife wrapper so the top-level functions aren't inlined
	if (exposeVarsToGlobalScope && script.startsWith("\"use strict\";    (function () {") && script.endsWith("})();"))
		script = script.slice("\"use strict\";    (function () {".length, -"})();".length);
	if (exposeVarsToGlobalScope && script.startsWith("(function () {") && script.endsWith("})();"))
		script = script.slice("(function () {".length, -"})();".length);

	// uncompress strings
	// this will break if the sequence `"];` appears in one of the strings
	const stringArrayRaw = script.match(/var S=(\[.+?"\]);/)?.[1];
	if (stringArrayRaw === undefined) throw new Error("cannot find the string array");
	const stringArray = JSON.parse(stringArrayRaw);
	script = script.replace(/\bS\[(\d+)\]/g, (_match, index) => `"${stringArray[index]}"`);

	const modUtils = new ModUtils(minifyCode(script));

	/** @type {{ code: string, addToDictionary: string[] }[]} */
	const codeSegments = [{
		code: `player = aQ.eF(eR);
			if (game.gIsReplay) { game.playerId = player; }
			str = __L(/* Player: {0} */ [b0.context.truncateAndFillText(playerData.rawPlayerNames[player], b0.qZ.sN(0, 10), 150)]) + "   ";
			str += __L(/* Strength: {10} */ [b0.rY.formatNumber(playerData.playerBalances[player])]) + "   ";
			str += __L(/* Territory: {10} */ [b0.rY.formatNumber(playerData.playerTerritories[player])]) + "   ";
		`, addToDictionary: ["game", "gIsReplay", "playerData", "rawPlayerNames", "playerBalances", "playerTerritories"]
	}, {
		code: `this.a = Math.floor(0.066 * b.c);
			d = b.d - 4 * uiSizes.gap - this.a;`,
		addToDictionary: ["uiSizes", "gap"]
	}, {
		code: `var dt=MenuManager.getState();if(dt===6){if(d===4211){/*...*/}}`,
		addToDictionary: ["MenuManager", "getState"]
	}, {
		code: `if (game.a && sidebar.getTime() < 350) {/*...*/}`,
		addToDictionary: ["game", "sidebar", "getTime"]
	}, {
		code: `this.gIsTeamGame = this.gGameType < 7 || this.gGameType === 9;`,
		addToDictionary: ["gIsTeamGame", "gGameType"]
	}, {
		code: `strs[0]=__L();strs[1]=game.gIsSingleplayer?__L():__L();`,
		addToDictionary: ["strs", "gIsSingleplayer"]
	}];
	codeSegments.forEach(({ code, addToDictionary }) => {
		modUtils.matchCode(code, { addToDictionary })
	});

	const { default: applyPatches } = await import('./patches/main.js');
	console.log("Applying patches...");
	applyPatches(modUtils);

	// for versions ^1.99.5.2
	const minificationResult = UglifyJS.minify(modUtils.script, {
		"compress": { "arrows": false },
		"mangle": false
	});
	if (minificationResult.error) {
		console.log("error while passing through UglifyJS, replaceCode replacements might have caused errors");
		throw minificationResult.error;
	}
	if (minificationResult.warnings) console.log(minificationResult.warnings);
	modUtils.script = minificationResult.code;

	const {
		matchDictionaryExpression,
		generateRegularExpression
	} = modUtils;
	const dictionary = modUtils.dictionary;

	[
		/=function\((\w+),(\w+),\w+\){\1===(?<game>\w+)\.(?<playerId>\w+)\?\w+\(175," "\+\w+\(\d+,\[(?<playerData>\w+)\.(?<playerNames>\w+)\[\2\]\]\)\+": ",1001,\2,\w+\(/g,
		/function \w+\(\)\{if\(2===(?<game>\w+)\.(?<gameState>\w+)\)return 1;\w+\.\w+\(\),\1\.\2=2,\1\.\w+=\1.\w+\}/g,
		/(function \w+\((\w+),(?<fontSize>\w+),(?<x>\w+),(?<y>\w+),(?<canvas>\w+)\){)(\6\.fillText\((?<playerData>\w+)\.(?<playerNames>\w+)\[\2\],\4,\5\)),(\2<(?<game>\w+)\.(?<gHumans>\w+)&&2!==\8\.(?<playerStates>\w+)\[[^}]+)}/g,
		/\w+\.font=(?<fontGeneratorFunction>\w+\.\w+\.\w+)\(1,\.39\*this\.\w+\),/g
	].forEach(matchDictionaryExpression);

	const rawCodeSegments = [
		"1===a.b?this.@gLobbyMaxJoin=this.@gHumans:this.gLobbyMaxJoin=this.@data.@playerCount,this.tZ=this.gLobbyMaxJoin,this.@gBots=this.gLobbyMaxJoin-this.gHumans,this.sg=0,",
		"?(this.gB=Math.floor(.066*aK.fw),g5=aK.g5-4*@uiSizes.@gap-this.gB):",
		`for(a0L=new Array(@game.@gMaxPlayers),a0A.font=a07,@i=game.gMaxPlayers-1;0<=i;i--)a0L[i]=i+1+".",@playerData.@playerNames[i]=aY.qW.tm(playerData.@rawPlayerNames[i],a07,a0W),a0K[i]=Math.floor(a0A.measureText(playerData.playerNames[i]).width);`,
	]

	rawCodeSegments.forEach(code => {
		const { expression } = generateRegularExpression(code, true);
		//console.log(expression);
		matchDictionaryExpression(expression);
	});

	modUtils.executePostMinifyHandlers();
	script = modUtils.script;

	// the dictionary should maybe get embedded into one of the files in the bundle
	fs.writeFileSync(
		artefactsPath,
		`const buildTimestamp = "${buildTimestamp}"; const dictionary = ${JSON.stringify(dictionary)};\n`
	);

	console.log("Formatting code...");

	script = beautify(script, {
		"indent_size": 1,
		"indent_char": "\t",
		"max_preserve_newlines": 5,
		"preserve_newlines": true,
		"keep_array_indentation": false,
		"break_chained_methods": false,
		"indent_scripts": "normal",
		"brace_style": "collapse",
		//"brace_style": "expand",
		"space_before_conditional": true,
		"unescape_strings": false,
		"jslint_happy": false,
		"end_with_newline": false,
		"wrap_line_length": 250,
		"indent_inner_html": false,
		"comma_first": false,
		"e4x": false,
		"indent_empty_lines": false
	});

	fs.writeFileSync(path.join(stagingPath, 'game.js'), script);
	console.log("Wrote staged game.js");
}

try {
	const buildTimestamp = prepareStagingDirectory();
	if (process.argv.includes('--skip-patching')) {
		const existingArtefacts = path.join(buildPath, 'build_artefacts.js');
		const existingGameScript = path.join(buildPath, 'game.js');
		if (!fs.existsSync(existingArtefacts))
			throw new Error('Cannot build client only: no previous build_artefacts.js found. Run the full build first.');
		if (!fs.existsSync(existingGameScript))
			throw new Error('Cannot build client only: no previous patched game.js found. Run the full build first.');
		fs.copyFileSync(existingArtefacts, artefactsPath);
		fs.copyFileSync(existingGameScript, path.join(stagingPath, 'game.js'));
	}
	if (!process.argv.includes('--skip-patching')) await patchGameCode(buildTimestamp);
	if (!process.argv.includes('--patch-only')) await buildClientCode();
	publishStagingDirectory();
	console.log("Build done");
} catch (error) {
	fs.rmSync(stagingPath, { recursive: true, force: true });
	throw error;
}
