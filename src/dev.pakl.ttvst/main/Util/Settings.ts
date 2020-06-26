import { app, ipcMain } from 'electron';
import TTVSTMain from '../TTVSTMain';

declare var TTVST: TTVSTMain;

ipcMain.on('app.getLocale', (event: Electron.IpcMainEvent) => {
	event.returnValue = app.getLocale();
});

export function getBoolean(name: string, defaultValue: boolean): Promise<boolean> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		ipcMain.once('Settings.gotBoolean.' + name, (event, value: boolean) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getBoolean', name, defaultValue);
	});
}

export function getString(name: string, defaultValue: string): Promise<string> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		ipcMain.once('Settings.gotString.' + name, (event, value: string) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getString', name, defaultValue);
	});
}

export function getJSON(name: string, defaultValue: any): Promise<any> {
	if(typeof(TTVST) === 'undefined' || TTVST.mainWindow === null || TTVST.mainWindow.window) return Promise.resolve(defaultValue);
	return new Promise((resolve) => {
		ipcMain.once('Settings.gotJSON.' + name, (event, value: any) => {
			resolve(value);
		});
		TTVST.mainWindow.ipcSend('Settings.getJSON', name, defaultValue);
	});
}