import { app, ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';

declare var TTVST: TTVSTMain;

ipcMain.on('app.getLocale', (event: Electron.IpcMainEvent) => {
	event.returnValue = app.getLocale();
});

const createRequestId = () => {
	let hrtime = process.hrtime();
	return hrtime[0].toString(16) + '-' + hrtime[1].toString(16);
}

export function getBoolean(name: string, defaultValue: boolean, session: boolean = false): Promise<boolean> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.gotBoolean.${name}.${rid}`, (event, value: boolean) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getBoolean', rid, name, defaultValue, session);
	});
}

export function setBoolean(name: string, value: boolean, session: boolean = false): Promise<boolean> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(value);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.sotBoolean.${name}.${rid}`, (event, value: boolean) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.setBoolean', rid, name, value, session);
	});
}

export function getString(name: string, defaultValue: string, session: boolean = false): Promise<string> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.gotString.${name}.${rid}`, (event, value: string) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getString', rid, name, defaultValue, session);
	});
}

export function setString(name: string, value: string, session: boolean = false): Promise<string> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(value);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.sotString.${name}.${rid}`, (event, value: string) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.setString', rid, name, value, session);
	});
}

export function getJSON(name: string, defaultValue: any, session: boolean = false): Promise<any> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.gotJSON.${name}.${rid}`, (event, value: any) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getJSON', rid, name, defaultValue, session);
	});
}

export function setJSON(name: string, value: any, session: boolean = false): Promise<any> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window === null) return Promise.resolve(value);
	return new Promise((resolve) => {
		let rid = createRequestId();
		ipcMain.once(`Settings.sotJSON.${name}.${rid}`, (event, value: any) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.setJSON', rid, name, value, session);
	});
}