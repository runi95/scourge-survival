import { execFile, execSync, spawn } from "child_process";
import { logger, compileMap, ProjectConfigurationLoader } from "./utils";
import * as fs from "fs-extra";
import * as path from "path";

// Warcraft III has to be started by Battle.net: launched any other way it runs
// in its own container, cannot reach the Battle.net Agent, and never gets past
// a login it can't complete. Battle.net will not forward arguments either -- it
// only passes the -loadfile stored in its own launch settings, which it reads
// once at startup. So the map is delivered by pointing that fixed path at a
// symlink we repoint at every build, and remove again afterwards.
const GAME_START_TIMEOUT_MS = 120000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function readCmdline(pid: string): string {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ");
  } catch {
    return ""; // the process exited while we were looking at it
  }
}

/**
 * Wine reports the Windows command line, so the game identifies itself by its
 * _retail_ path. Battle.net's launcher stub lives outside _retail_ and so is
 * never mistaken for the game.
 */
function findGamePids(): string[] {
  return fs
    .readdirSync("/proc")
    .filter((entry) => /^\d+$/.test(entry))
    .filter((pid) => {
      const cmdline = readCmdline(pid);
      return cmdline.includes("_retail_") && cmdline.includes("Warcraft III.exe");
    });
}

function linkMap(symlinkPath: string, mapPath: string): void {
  fs.mkdirsSync(path.dirname(symlinkPath));
  try {
    fs.unlinkSync(symlinkPath);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
  fs.symlinkSync(mapPath, symlinkPath);
  logger.info(`Linked "${symlinkPath}" -> "${mapPath}"`);
}

function unlinkMap(symlinkPath: string, mapPath: string): void {
  try {
    if (fs.readlinkSync(symlinkPath) !== mapPath) {
      logger.warn(`Leaving "${symlinkPath}", it no longer points at this build`);
      return;
    }
    fs.unlinkSync(symlinkPath);
    logger.info(`Removed "${symlinkPath}"`);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
}

async function waitForGame(ignorePids: string[]): Promise<string | undefined> {
  const deadline = Date.now() + GAME_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const pid = findGamePids().find((candidate) => !ignorePids.includes(candidate));
    if (pid !== undefined) {
      logger.info(`Warcraft III started (pid ${pid})`);
      return pid;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return undefined;
}

/**
 * The map is read long after the window appears -- the login queue comes first --
 * and the startup scan opening every map in the folder is not the real load. So
 * rather than guess at a delay, the link stays for the whole session and a
 * detached watcher removes it once the game exits, letting this command return.
 */
function removeLinkWhenGameExits(
  pid: string,
  symlinkPath: string,
  mapPath: string
): void {
  const script =
    'while [ -e "/proc/$1" ]; do sleep 2; done; ' +
    '[ "$(readlink -- "$2")" = "$3" ] && rm -f -- "$2"';
  const watcher = spawn(
    "bash",
    ["-c", script, "wc3-link-cleanup", pid, symlinkPath, mapPath],
    { detached: true, stdio: "ignore" }
  );
  watcher.unref();
}

async function launchThroughBattleNet(
  config: ProjectConfigurationLoader,
  mapPath: string,
  env: NodeJS.ProcessEnv
): Promise<void> {
  const symlinkPath = config.mapSymlink as string;
  linkMap(symlinkPath, mapPath);

  // Only remove the link here if the game never took it -- otherwise it has to
  // outlive this command.
  let handedOver = false;
  try {
    const running = process.platform === "linux" ? findGamePids() : [];

    logger.info("Asking Battle.net to launch Warcraft III...");
    // An argument array, not a shell string: "--exec=launch W3" is a single
    // argument and must not be split on its space.
    const launcher = spawn(
      config.winePath as string,
      [config.gameExecutable as string, ...config.launchArgs],
      { cwd: config.launchCwd, env, stdio: "inherit", detached: true }
    );
    launcher.on("error", (err) =>
      logger.error(`Failed to run "${config.winePath}": ${err.message}`)
    );
    // The launcher only signals the running Battle.net client; the game is not
    // its child, so there is nothing useful to wait on here.
    launcher.unref();

    if (process.platform !== "linux") {
      handedOver = true;
      logger.warn(`Remove "${symlinkPath}" yourself once you are done testing`);
      return;
    }

    const pid = await waitForGame(running);
    if (pid === undefined) {
      logger.warn(
        "Warcraft III did not start. Is Battle.net running and logged in, and are its launch arguments set?"
      );
      return;
    }

    handedOver = true;
    removeLinkWhenGameExits(pid, symlinkPath, mapPath);
    logger.info(`Link will be removed when Warcraft III (pid ${pid}) exits`);
  } finally {
    if (!handedOver) unlinkMap(symlinkPath, mapPath);
  }
}

async function main(): Promise<void> {
  const config = ProjectConfigurationLoader.load();
  if (!config.mapPath) {
    throw new Error("Unable to compile map without the 'mapPath' configured");
  }

  compileMap(config.mapPath, config.outDir, config.minifyScript, config.saveAsFolder);

  const filename = path.resolve(`${config.outDir}/${path.basename(config.mapPath)}`);

  if (config.gameExecutable === undefined) {
    throw new Error("Unable to start map without any 'gameExecutable' configured");
  }

  const env = { ...process.env, ...config.launchEnv };
  if (config.winePrefix) env.WINEPREFIX = config.winePrefix;

  if (config.mapSymlink) {
    await launchThroughBattleNet(config, filename, env);
    return;
  }

  logger.info(`Launching map "${filename.replace(/\\/g, "/")}"...`);

  if (config.winePath) {
    const wineFilename = `"Z:${filename}"`;
    // stdio is inherited so umu/proton errors reach the terminal; with 'ignore'
    // a failed or hanging launch looks identical to a successful one.
    execSync(`${config.winePath} "${config.gameExecutable}" ${["-loadfile", wineFilename, ...config.launchArgs].join(' ')}`, { stdio: 'inherit', env });
  } else {
    execFile(config.gameExecutable, ["-loadfile", filename, ...config.launchArgs], { env }, (err: any) => {
      if (err) {
        logger.error(`Failed to launch "${config.gameExecutable}" (${err.code ?? err.message}). Make sure gameExecutable is configured properly in config.json.`);
      }
    });
  }
}

main().catch((err) => {
  logger.error(err.toString());
  process.exit(1);
});
