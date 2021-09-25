import { BrowserWindow, ipcMain, systemPreferences, dialog, IpcMainEvent, WillNavigateEvent, webContents } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';

import { WindowState } from './Util/WindowState';
import winston from 'winston';

declare var logger: winston.Logger;

class MainWindow extends EventEmitter {

	state: WindowState = null;
	window: BrowserWindow = null;

	constructor() {
		super();
		this.state = new WindowState({ defaultWidth: 1024, defaultHeight: 768 });
	}

	createAndLoad() {
		if(this.window !== null) {
			logger.verbose('Destroying old main window');
			this.window.destroy();
		}

		logger.verbose('Creating main window');
		this.window = new BrowserWindow({
			x: this.state.x,
			y: this.state.y,
			width: this.state.width,
			height: this.state.height,
			minWidth: 1024,
			minHeight: 768,
			autoHideMenuBar: true,
			icon: path.join(__dirname, '../../../res/img/icon.ico'),
			webPreferences: {
				nodeIntegration: true, contextIsolation: false,
				webviewTag: true
			},
			show: false
		});

		this.window.once('ready-to-show', this.onReadyToShow.bind(this))
		this.window.on('show', this.onShow.bind(this));
		this.window.on('closed', this.onClosed.bind(this));

		this.window.webContents.on('will-navigate', this.onContentWillNavigate.bind(this));
		
		ipcMain.on('request-accent-color', this.onRequestAccentColor.bind(this));
		ipcMain.on('request-node-env', this.onRequestNodeEnv.bind(this));

		ipcMain.handle('dialog.showOpenDialog', this.onShowOpenDialog.bind(this));
		ipcMain.handle('dialog.showSaveDialog', this.onShowSaveDialog.bind(this));
		ipcMain.handle('webview.preventnavigation', this.onPreventWebviewNavigation.bind(this));

		this.window.loadURL(url.format({
			pathname: path.join(__dirname, '../../../views/index.html'),
			protocol: 'file:',
			slashes: true
		}));

		this.state.manage(this.window);
	}

	getBounds(): Electron.Rectangle {
		if(this.window === null) {
			return this.state;
		}
		return this.window.getBounds();
	}

	ipcSend(channel: string, ...args: any[]) {
		if(this.window === null) return;
		this.window.webContents.send(channel, ...args);
	}

	private onReadyToShow() {
		if(this.window === null) return;
		logger.verbose('Opening main window');
		this.window.show();
	}

	private onShow() {
		if(this.window === null) return;
		if(process.env.NODE_ENV === 'development') {
			this.window.webContents.openDevTools();
		}
		this.emit('show');
	}

	private onClosed() {
		if(this.window === null) return;
		this.window = null;
	}

	private onRequestAccentColor(_event: IpcMainEvent) {
		_event.returnValue = systemPreferences.getAccentColor().substr(0, 6);
	}

	private onRequestNodeEnv(_event: IpcMainEvent) {
		_event.returnValue = process.env.NODE_ENV;
	}

	private async onShowOpenDialog(event: IpcMainEvent, options: Electron.OpenDialogOptions): Promise<string[]|false> {
		if(this.window == null) return false;
		try {
			let result = await dialog.showOpenDialog(this.window, options);
			if(result.canceled) return false;
			return result.filePaths;
		} catch(e) {
			logger.error(e);
			return false;
		}
	}

	private async onShowSaveDialog(event: IpcMainEvent, options: Electron.SaveDialogOptions): Promise<string|false> {
		if(this.window == null) return false;
		try {
			let result = await dialog.showSaveDialog(this.window, options);
			if(result.canceled) return false;
			return result.filePath;
		} catch(e) {
			logger.error(e);
			return false;
		}
	}

	private async onPreventWebviewNavigation(event: IpcMainEvent, webcontentid: number): Promise<void> {
		try {
			let wc = webContents.fromId(webcontentid);
			if(wc !== null) {
				wc.on('will-navigate', this.onContentWillNavigate);
			}	
		} catch(e){}
	}

	private onContentWillNavigate(event: WillNavigateEvent, url: string) {
		// Prevent any and all navigation outside. This is very important!
		event.preventDefault();
	}

}

export = MainWindow;