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
            height: WINDOW_DIMENSION.height,
            width: WINDOW_DIMENSION.width,
            webPreferences: {
                backgroundThrottling: false,
                preload: path.join(__dirname, "preload.js"),
            },
            autoHideMenuBar: true
        });

        const contextMenu = Menu.buildFromTemplate([
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
                    app.quit();
                }).bind(this)
            }
        ]);

        const tray = new Tray(nativeImage.createEmpty());
        tray.setToolTip("Linked Pad");
        tray.on("click", () => (this.window.isVisible() ? this.window.hide() : this.window.show()));
        tray.setContextMenu(contextMenu);




        this.window.loadFile(path.join(__dirname, "./view/index.html"));

        this.window.on('close', (e) => {
            if (Settings.getSettingValue('exit_to_tray') === true) {
                if (this.window.isVisible()) {
                    this.window.hide();
                    e.preventDefault();
                }
            } else {
                this.stop();
                app.quit();
            }


        });

    }

    private handleMainEvents(): void {
        this.ipc.handle(CHANNEL_NAME, (_, eventType: string, ...data: any[]) => {

            this.linkedPad.handleEvent(eventType, ...data)
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
        this.linkedPad.onExit();
    }




}