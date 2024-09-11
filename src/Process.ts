import { app, BrowserWindow, IpcMain, Menu, nativeImage, Tray } from "electron";
import * as path from "path";
import { LinkedPadProcess } from "./LinkedPadProcess";
import { Settings } from "./Settings";


const WINDOW_DIMENSION: { width: number, height: number } = { width: 1920, height: 1080 };
const CHANNEL_NAME: string = ':3';

export class Process {
    private readonly ipc: Electron.IpcMain;
    private window: BrowserWindow;
    private rendererReady: boolean = false;


    private linkedPad: LinkedPadProcess = new LinkedPadProcess(this.sendToRenderer.bind(this));


    constructor(ipcMain: IpcMain, args: string[]) {
        this.ipc = ipcMain;
    }

    public start(): void {
        Settings.init();

        this.createBrowserWindow();
        this.handleMainEvents()

        this.window.show();
    }




    private createBrowserWindow(): void {
        this.window = new BrowserWindow({
            show: false,
            height: Settings.getSettingValue('window_height'),
            width: Settings.getSettingValue('window_width'),
            x: Settings.getSettingValue('window_x'),
            y: Settings.getSettingValue('window_y'),

            webPreferences: {
                backgroundThrottling: false,
                preload: path.join(__dirname, "preload.js"),
            },
            icon: `${__dirname}/view/linkedpad_icon.png`,
            autoHideMenuBar: true,
        });

        if (Settings.getSettingValue('window_maximized') === true) {
            this.window.maximize();
        }

        const tray = new Tray(`${__dirname}/view/linkedpad_icon.png`);
        tray.setToolTip("Linked Pad");
        tray.on("click", () => (this.window.isVisible() ? this.window.hide() : this.window.show()));
        tray.setContextMenu(Menu.buildFromTemplate([
            {
                label: "Show",
                type: "normal",
                click: (() => {
                    this.window.show();
                }).bind(this)
            },
            {
                label: "Quit",
                type: "normal",
                click: (() => {
                    this.stop();
                    app.exit();
                }).bind(this)
            }
        ]));




        this.window.loadFile(path.join(__dirname, "./view/index.html"));

        this.window.on('close', (e) => {
            if (Settings.getSettingValue('exit_to_tray') === true) {
                if (this.window.isVisible()) {
                    this.window.hide();
                    e.preventDefault();
                }
            } else {
                this.stop();
                app.exit();
            }


        });

    }

    private handleMainEvents(): void {
        this.ipc.handle(CHANNEL_NAME, (_, eventType: string, ...data: any[]) => {

            return this.linkedPad.handleEvent(eventType, ...data)
        });

    }

    private sendToRenderer(eventType: string, ...data: any[]): void {
        if (this.rendererReady) {
            this.window.webContents.send(CHANNEL_NAME, eventType, ...data);
            return;
        }

        this.window.webContents.on('did-finish-load', () => {
            this.rendererReady = true;
            this.window?.webContents.send(CHANNEL_NAME, eventType, ...data);
        });
    }

    private stop(): void {
        // Save window dimensions
        const isWindowMaximized: boolean = this.window.isMaximized();
        const bounds: { width: number, height: number, x: number, y: number } = this.window.getBounds();


        Settings.setSettingValue('window_width', bounds.width);
        Settings.setSettingValue('window_height', bounds.height);
        Settings.setSettingValue('window_x', bounds.x);
        Settings.setSettingValue('window_y', bounds.y);
        Settings.setSettingValue('window_maximized', isWindowMaximized);


        console.log(Settings.getSettingMap())

        this.linkedPad.onExit();
    }




}