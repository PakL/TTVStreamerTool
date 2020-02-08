import { BrowserWindow, ipcMain, systemPreferences } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';

import { WindowState } from './WindowState';

class MainWindow extends EventEmitter {

	state: WindowState = null;
	window: BrowserWindow = null;

	isReadyToShow: boolean = false;
	showWhenReady: boolean = false;

	constructor() {
		super();
		this.state = new WindowState({ defaultWidth: 800, defaultHeight: 600 });
	}

	createAndLoad() {

		this.window = new BrowserWindow({
			x: this.state.x,
			y: this.state.y,
			width: this.state.width,
			height: this.state.height,
			minWidth: 800,
			minHeight: 600,
			autoHideMenuBar: true,
			icon: path.join(__dirname, '../../../res/img/icon.ico'),
			webPreferences: { nodeIntegration: true, webviewTag: true },
			show: false
		});

		this.window.on('ready-to-show', this.onReadyToShow.bind(this))
		this.window.on('show', this.onShow.bind(this));
		this.window.on('closed', this.onClosed.bind(this));
		
		ipcMain.on('request-accent-color', this.onRequestAccentColor.bind(this));

		this.window.loadURL(url.format({
			pathname: path.join(__dirname, '../../../views/index.html'),
			protocol: 'file:',
			slashes: true
		}));

		this.state.manage(this.window);
	}

	show() {
		if(this.isReadyToShow) {
			this.window.show();
		}
		this.showWhenReady = true;
	}

	getBounds(): Electron.Rectangle {
		if(this.window === null) {
			return this.state;
		}
		return this.window.getBounds();
	}

	private onReadyToShow() {
		if(this.window === null) return;
		this.isReadyToShow = true;
		if(this.showWhenReady) {
			this.window.show();
		}
	}

	private onShow() {
		if(this.window === null) return;
		this.window.webContents.openDevTools();
	}

	private onClosed() {
		if(this.window === null) return;
		this.window = null;
	}

	private onRequestAccentColor(_event: Electron.IpcMainEvent) {
		_event.returnValue = systemPreferences.getAccentColor().substr(0, 6);
	}

}

export = MainWindow;