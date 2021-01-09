import { BrowserWindow, ipcMain, app, WillNavigateEvent } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as originalFs from 'original-fs';
import winston from 'winston';

interface IPosition {
	x: number;
	y: number;
}

declare var logger: winston.Logger;

class SplashWindow extends EventEmitter {

	window: BrowserWindow;

	constructor(position: IPosition) {
		super();

		this.window = new BrowserWindow({
			x: position.x,
			y: position.y,
			width: 300,
			height: 450,
			frame: false,
			resizable: false,
			skipTaskbar: true,
			webPreferences: {
				nodeIntegration: true, contextIsolation: false,
				webviewTag: false, worldSafeExecuteJavaScript: true, enableRemoteModule: false
			},
			show: false
		});
		
		ipcMain.on('splash-done', this.onSplashDone.bind(this));
		this.window.on('ready-to-show', this.onReadyToShow.bind(this));
		this.window.webContents.on('will-navigate', this.onContentWillNavigate.bind(this));

		const self = this
		ipcMain.handle('splash-loaded', async function() {
			self.onSplashDone();
		});

		this.window.loadURL(url.format({
			pathname: path.join(__dirname, '../../../views/splash.html'),
			protocol: 'file:',
			slashes: true
		}));
	}

	private onReadyToShow() {
		if(this.window === null) return;
		logger.verbose('Showing splash screen window');
		this.window.show();
		this.window.moveTop();
	}

	private onContentWillNavigate(event: WillNavigateEvent, url: string) {
		// Prevent any and all navigation outside. This is very important!
		event.preventDefault();
	}

	private onSplashDone() {
		this.window.webContents.send('update-message', 'Loading application...');
		this.emit('done');
	}

	close() {
		if(this.window !== null) {
			this.window.close();
			this.window = null
		}
	}

}

export = SplashWindow;