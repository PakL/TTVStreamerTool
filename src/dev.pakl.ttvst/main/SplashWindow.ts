import { BrowserWindow, ipcMain, app, WillNavigateEvent } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as originalFs from 'original-fs';
import winston from 'winston';
import got from 'got';
import { throws } from 'assert';

interface IPosition {
	x: number;
	y: number;
}

declare var logger: winston.Logger;

class SplashWindow extends EventEmitter {

	window: BrowserWindow;
	updateAvailable: boolean = false;

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
		
		this.window.once('ready-to-show', this.onReadyToShow.bind(this));
		this.window.webContents.on('will-navigate', this.onContentWillNavigate.bind(this));

		const self = this
		ipcMain.handleOnce('splash-loaded', async function() {
			self.checkForUpdates();
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

	private async checkForUpdates() {
		this.window.webContents.send('update-message', 'Checking for updates...');
		try {
			let body: string = await got('https://update.ttvst.app/v2/updatescript.ini', { timeout: 5000, encoding: 'utf8', resolveBodyOnly: true });

			let releasesBlock = false;
			let lastversion = '';
			let rows = body.split("\n");
			for(let i = 0; i < rows.length; i++) {
				let row = rows[i].trim();
				if(!releasesBlock && row.match(/^releases(\s+)?\{$/i)) {
					releasesBlock = true;
				} else if(releasesBlock) {
					if(row === '}') {
						releasesBlock = false;
					} else if(row.length > 0) {
						lastversion = row;
					}
				}
			}
			if(lastversion.length > 0 && app.getVersion() !== lastversion) {
				logger.info('New version available');
				this.updateAvailable = true;
			} else {
				logger.info('No new version available');
			}
		} catch(e) {}

		this.onSplashDone();
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