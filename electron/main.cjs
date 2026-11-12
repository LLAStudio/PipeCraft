const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const isMac = process.platform === "darwin";
const APP_ID = "dev.pipecraft.PipeCraft";
const DEFAULT_PORT = 47821;

let mainWindow = null;
let serverProcess = null;
let serverPort = Number(process.env.PIPECRAFT_DESKTOP_PORT || DEFAULT_PORT);
let serverLog = null;
let isQuitting = false;

function getServerDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

function readUserEnvironment() {
  const file = path.join(app.getPath("userData"), "pipecraft.env");
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

async function waitForServer(port) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await checkServer(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("The local PipeCraft server did not become ready in time.");
}

async function startServer() {
  const serverDirectory = getServerDirectory();
  const serverEntry = path.join(serverDirectory, "server.js");

  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `The desktop server bundle is missing at ${serverEntry}. Run "bun run desktop:build" before launching the desktop app.`,
    );
  }

  if (!(await isPortAvailable(serverPort))) {
    throw new Error(
      `Port ${serverPort} is already in use. Close the other PipeCraft instance or set PIPECRAFT_DESKTOP_PORT to a free port.`,
    );
  }

  const localUrl = `http://127.0.0.1:${serverPort}`;
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  serverLog = fs.createWriteStream(path.join(app.getPath("userData"), "server.log"), {
    flags: "a",
  });
  serverLog.write(`\n--- PipeCraft server start ${new Date().toISOString()} ---\n`);

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      ...readUserEnvironment(),
      AUTH_URL: localUrl,
      NEXTAUTH_URL: localUrl,
      AUTH_TRUST_HOST: "true",
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(serverPort),
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (chunk) => serverLog.write(chunk));
  serverProcess.stderr.on("data", (chunk) => serverLog.write(chunk));
  serverProcess.on("error", (error) => serverLog.write(`${error.stack ?? error}\n`));
  serverProcess.on("exit", (code, signal) => {
    serverLog.write(`\n--- PipeCraft server exited (code=${code}, signal=${signal}) ---\n`);
    if (!isQuitting) {
      dialog.showErrorBox(
        "PipeCraft stopped",
        "The local application server stopped unexpectedly. See the server log in the PipeCraft data folder for details.",
      );
      app.quit();
    }
  });

  await waitForServer(serverPort);
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
  serverProcess = null;
  if (serverLog) {
    serverLog.end();
    serverLog = null;
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
      sandbox: true,
    },
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
          click: () => void shell.openPath(app.getPath("userData")),
        },
        {
          label: "Open server log",
          click: () => {
            const logPath = path.join(app.getPath("userData"), "server.log");
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
    const message = error instanceof Error ? error.message : String(error);
    if (serverLog) {
      serverLog.write(`${message}\n`);
    }
    dialog.showErrorBox("PipeCraft could not start", message);
    app.quit();
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

  app.whenReady().then(launch);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
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
