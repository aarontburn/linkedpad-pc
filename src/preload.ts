const { ipcRenderer, contextBridge, } = require('electron')

const subscribers: any[] = []

contextBridge.exposeInMainWorld('ipc', {
	send: (target: string, eventType: string, ...data: any): Promise<any> =>
		ipcRenderer.invoke(target, eventType, ...data),

	on: (channel: string, func: (event: Electron.IpcRendererEvent, ...args: any[]) => void) =>
		ipcRenderer.on(channel, func)

});

