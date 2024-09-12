import { app, BrowserWindow, Menu } from "electron";
import { Process } from "./Process";

const ipcMain: Electron.IpcMain = require('electron').ipcMain;
const main: Process = new Process(ipcMain, process.argv);


if (!process.argv.includes('--dev')) {
	Menu.setApplicationMenu(null);
}


app.whenReady().then(() => {
	main.start();
	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) main.start();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

