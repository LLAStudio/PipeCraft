const { app, BrowserWindow, Menu, dialog, shell, session } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const isMac = process.platform === "darwin";
const APP_ID = "dev.pipecraft.PipeCraft";
const DEFAULT_PORT = 47821;
const MAX_PORT_ATTEMPTS = 20;
const MAX_RESTARTS = 2;

let mainWindow = null;
let serverProcess = null;
const configuredPort = Number(process.env.PIPECRAFT_DESKTOP_PORT || DEFAULT_PORT);
let serverPort =
  Number.isInteger(configuredPort) && configuredPort >= 1024 && configuredPort <= 65535
    ? configuredPort
    : DEFAULT_PORT;

// Permissions the renderer is allowed to request. Everything else (camera,
// microphone, notifications, geolocation, ...) is denied.
const ALLOWED_PERMISSIONS = new Set(["clipboard-sanitized-write"]);
let serverLog = null;
let isQuitting = false;
let restartCount = 0;
let restartTimer = null;

function getServerDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
}

function getDataDirectory() {
  return app.getPath("userData");
}

function getEnvFilePath() {
  return path.join(getDataDirectory(), "pipecraft.env");
}

function getLogFilePath() {
  return path.join(getDataDirectory(), "server.log");
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const candidate = startPort + offset;
    if (candidate > 65535) break;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(
    `No free port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}. Close other PipeCraft instances or set PIPECRAFT_DESKTOP_PORT to a free port.`,
  );
}

function readUserEnvironment() {
  const file = getEnvFilePath();
  const values = {};
  if (!fs.existsSync(file)) return values;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) values[key] = value;
  }

  return values;
}

function generateSecret(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Creates the user configuration file on first launch and makes sure the two
 * required secrets exist. Without them NextAuth fails every session request and
 * token encryption throws, which used to leave the app in a broken state.
 */
function ensureUserEnvironment() {
  const file = getEnvFilePath();
  fs.mkdirSync(getDataDirectory(), { recursive: true });

  if (!fs.existsSync(file)) {
    const content = [
      "# PipeCraft desktop configuration",
      "#",
      "# Generated secrets are created on first launch. Keep this file private.",
      `AUTH_SECRET=${crypto.randomBytes(32).toString("base64url")}`,
      `ENCRYPTION_MASTER_KEY=${generateSecret(32)}`,
      "",
      "# Optional: PostgreSQL connection string used for projects, templates and accounts.",
      "# DATABASE_URL=postgresql://user:password@localhost:5432/pipecraft",
      "",
      "# Optional: GitHub OAuth app credentials used to sign in with GitHub.",
      "# GITHUB_CLIENT_ID=",
      "# GITHUB_CLIENT_SECRET=",
      "",
      "# Optional: read-only token used to query public GitHub metadata.",
      "# GITHUB_PUBLIC_TOKEN=",
      "",
    ].join("\n");
    fs.writeFileSync(file, content, { mode: 0o600 });
    return;
  }

  const current = fs.readFileSync(file, "utf8");
  const additions = [];
  if (!/^\s*AUTH_SECRET\s*=/m.test(current)) {
    additions.push(`AUTH_SECRET=${crypto.randomBytes(32).toString("base64url")}`);
  }
  if (!/^\s*ENCRYPTION_MASTER_KEY\s*=/m.test(current)) {
    additions.push(`ENCRYPTION_MASTER_KEY=${generateSecret(32)}`);
  }
  if (additions.length > 0) {
    fs.appendFileSync(
      file,
      `\n# Added automatically by PipeCraft on ${new Date().toISOString()}\n${additions.join("\n")}\n`,
    );
  }

  // Secrets live in this file; keep it readable by the current user only.
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Best effort on platforms without POSIX permissions.
  }
}

function checkServer(port) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: 1500 },
      (response) => {
        response.resume();
        resolve(typeof response.statusCode === "number" && response.statusCode < 500);
      },
    );
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForServer(port, abortSignal) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (abortSignal.reason) throw abortSignal.reason;
    if (await checkServer(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(
    `The local PipeCraft server did not answer on port ${port} within 45 seconds.`,
  );
}

function readLogTail(maxLines = 25) {
  try {
    const file = getLogFilePath();
    if (!fs.existsSync(file)) return "";
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    return lines.slice(-maxLines).join("\n").trim();
  } catch {
    return "";
  }
}

function showFailure(message, detail) {
  const logPath = getLogFilePath();
  const hasLog = fs.existsSync(logPath);
  const buttons = hasLog
    ? ["Open server log", "Open data folder", "Close"]
    : ["Open data folder", "Close"];

  const choice = dialog.showMessageBoxSync({
    type: "error",
    title: "PipeCraft stopped",
    message,
    detail: `${detail}\n\nLog file: ${logPath}`,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  });

  if (hasLog && choice === 0) void shell.openPath(logPath);
  const folderIndex = buttons.length - 2;
  if (choice === folderIndex) void shell.openPath(getDataDirectory());
}

function scheduleRestart(reason) {
  if (isQuitting || restartTimer) return;
  if (restartCount >= MAX_RESTARTS) {
    const tail = readLogTail();
    showFailure(
      "The local application server keeps stopping.",
      [
        reason,
        tail ? `Last lines of the server log:\n\n${tail}` : "The server log is empty.",
      ].join("\n\n"),
    );
    isQuitting = true;
    app.quit();
    return;
  }

  restartCount += 1;
  const delay = 1200 * restartCount;
  serverLog?.write(
    `\n--- Restarting the server (attempt ${restartCount}/${MAX_RESTARTS}) in ${delay} ms ---\n`,
  );

  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (isQuitting) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      mainWindow = null;
    }
    launch().catch((error) => {
      scheduleRestart(error instanceof Error ? error.message : String(error));
    });
  }, delay);
}

async function startServer() {
  const serverDirectory = getServerDirectory();
  const serverEntry = path.join(serverDirectory, "server.js");

  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `The desktop server bundle is missing at ${serverEntry}. Reinstall PipeCraft, or run "bun run desktop:build" before launching from source.`,
    );
  }

  ensureUserEnvironment();
  serverPort = await findAvailablePort(serverPort);
  const localUrl = `http://127.0.0.1:${serverPort}`;

  fs.mkdirSync(getDataDirectory(), { recursive: true });
  serverLog = fs.createWriteStream(getLogFilePath(), { flags: "a", mode: 0o600 });
  try {
    fs.chmodSync(getLogFilePath(), 0o600);
  } catch {
    // Best effort on platforms without POSIX permissions.
  }
  serverLog.write(
    `\n--- PipeCraft server start ${new Date().toISOString()} (port ${serverPort}) ---\n`,
  );

  const userEnvironment = readUserEnvironment();

  const abortController = new AbortController();
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      ...userEnvironment,
      AUTH_URL: localUrl,
      NEXTAUTH_URL: localUrl,
      AUTH_TRUST_HOST: "true",
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(serverPort),
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PIPECRAFT_DATA_DIR: getDataDirectory(),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (chunk) => serverLog?.write(chunk));
  serverProcess.stderr.on("data", (chunk) => serverLog?.write(chunk));
  serverProcess.on("error", (error) => {
    serverLog?.write(`${error.stack ?? error}\n`);
    abortController.abort(error);
  });
  serverProcess.on("exit", (code, signal) => {
    serverLog?.write(`\n--- PipeCraft server exited (code=${code}, signal=${signal}) ---\n`);
    if (isQuitting) return;
    const reason = `The local application server exited unexpectedly (code=${code ?? "unknown"}, signal=${signal ?? "none"}).`;
    abortController.abort(new Error(reason));
    scheduleRestart(reason);
  });

  await waitForServer(serverPort, abortController.signal);
}

function stopServer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
  serverProcess = null;
  if (serverLog) {
    serverLog.end();
    serverLog = null;
  }
}

function isLocalServerUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname === "127.0.0.1" &&
      parsed.port === String(serverPort)
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#0B0D08",
    title: "PipeCraft",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      safeDialogs: true,
    },
  });

  // Only the local PipeCraft server may ever be loaded in the app window. Any
  // other navigation attempt opens in the user's browser instead, so a stray
  // link (or injected markup) cannot take over the privileged window.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isLocalServerUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });

  // The app does not embed <webview>; refuse any attempt to attach one.
  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    if (isQuitting) return;
    dialog.showErrorBox(
      "Could not open PipeCraft",
      `The application window could not load (${errorCode}: ${errorDescription}).`,
    );
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : [{ role: "fileMenu" }]),
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [
        {
          label: "PipeCraft on GitHub",
          click: () => void shell.openExternal("https://github.com/lemonlimeacid/PipeCraft"),
        },
        {
          label: "Open configuration folder",
          click: () => void shell.openPath(getDataDirectory()),
        },
        {
          label: "Open configuration file",
          click: () => void shell.openPath(getEnvFilePath()),
        },
        {
          label: "Open server log",
          click: () => {
            const logPath = getLogFilePath();
            if (fs.existsSync(logPath)) void shell.openPath(logPath);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function launch() {
  try {
    await startServer();
    buildMenu();
    createWindow();
  } catch (error) {
    if (isQuitting) return;
    const message = error instanceof Error ? error.message : String(error);
    serverLog?.write(`${message}\n`);
    scheduleRestart(message);
    throw error;
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.setName("PipeCraft");
  app.setAppUserModelId(APP_ID);
  app.setAboutPanelOptions({
    applicationName: "PipeCraft",
    applicationVersion: app.getVersion(),
    copyright: "PipeCraft — visual CI/CD pipeline editor",
  });

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(ALLOWED_PERMISSIONS.has(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_contents, permission) =>
      ALLOWED_PERMISSIONS.has(permission),
    );

    // Guard every webContents, including ones created by future features.
    app.on("web-contents-created", (_event, contents) => {
      contents.on("will-navigate", (event, url) => {
        if (isLocalServerUrl(url)) return;
        event.preventDefault();
      });
      contents.on("will-attach-webview", (event) => {
        event.preventDefault();
      });
    });

    launch().catch(() => {
      // Failures are reported and retried by scheduleRestart(); avoid an
      // unhandled rejection that would close the app with no explanation.
    });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverProcess) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => {
    if (!isMac) app.quit();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    stopServer();
  });
}
