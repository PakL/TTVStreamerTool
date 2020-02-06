import { BrowserWindow, ipcMain } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';

interface IPosition {
	x: number;
	y: number;
}

export class SplashWindow extends EventEmitter {

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
				nodeIntegration: true,
				webviewTag: false
			},
			show: false
		});
		
		ipcMain.on('splash-done', this.onSplashDone.bind(this));
		this.window.on('ready-to-show', this.onReadyToShow.bind(this));

		this.window.loadURL(url.format({
			pathname: path.join(__dirname, '../../../views/splash.html'),
			protocol: 'file:',
			slashes: true
		}));
	}

	private onReadyToShow() {
		if(this.window === null) return;
		this.window.show();
		this.window.moveTop();
	}

	private onSplashDone() {
		if(this.window !== null) {
			this.window.close();
			this.window = null
		}
		this.emit('done');
	}

}