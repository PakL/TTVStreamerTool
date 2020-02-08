import { BrowserWindow, ipcMain, app, autoUpdater } from 'electron';
import { EventEmitter } from 'events';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as originalFs from 'original-fs';

interface IPosition {
	x: number;
	y: number;
}

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
				nodeIntegration: true,
				webviewTag: false
			},
			show: false
		});
		
		ipcMain.on('splash-done', this.onSplashDone.bind(this));
		this.window.on('ready-to-show', this.onReadyToShow.bind(this));

		this.onUpdaterError = this.onUpdaterError.bind(this);
		this.onUpdaterUpdateAvailable = this.onUpdaterUpdateAvailable.bind(this);
		this.onUpdaterUpdateNotAvailable = this.onUpdaterUpdateNotAvailable.bind(this);
		this.onUpdaterDownloaded = this.onUpdaterDownloaded.bind(this);

		const self = this
		ipcMain.handle('splash-loaded', async function() {
			try {
				await self.moveOldAddons();
			} catch(e) {
				console.error(e);
			}
			self.startUpdate();
		});

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

		autoUpdater.removeListener('error', this.onUpdaterError);
		autoUpdater.removeListener('update-available', this.onUpdaterUpdateAvailable);
		autoUpdater.removeListener('update-not-available', this.onUpdaterUpdateNotAvailable);
		autoUpdater.removeListener('update-downloaded', this.onUpdaterDownloaded);

		this.emit('done');
	}

	private onUpdaterError(e: Error) {
		console.error(e);
		this.window.webContents.send('update-message', 'There was an error 🙁');
		this.onSplashDone();
	}
	private onUpdaterUpdateAvailable() {
		this.window.webContents.send('update-message', 'Loading update... ' + ['🍕','🍟','🥨','🍙','🍪','🍦','🍌','🥦','🥕'][Math.floor(Math.random()*9)]);
	}
	private onUpdaterUpdateNotAvailable() {
		this.window.webContents.send('update-message', 'No update! 😎');
		this.onSplashDone();
	}
	private onUpdaterDownloaded() {
		this.window.webContents.send('update-message', 'Installing update now... 🤩');
		autoUpdater.quitAndInstall();
	}

	private startUpdate() {
		autoUpdater.once('error', this.onUpdaterError);
		autoUpdater.once('update-available', this.onUpdaterUpdateAvailable);
		autoUpdater.once('update-not-available', this.onUpdaterUpdateNotAvailable);
		autoUpdater.once('update-downloaded', this.onUpdaterDownloaded);

		if(process.argv.indexOf('--squirrel-firstrun') >= 0) {
			this.onSplashDone();
		} else {
			this.window.webContents.send('update-message', 'Checking for update... 🔎');
			autoUpdater.checkForUpdates();
		}
	}

	private moveOldAddons() {
		let thisExecDir = path.dirname(process.execPath)
		let appsDir = path.resolve(thisExecDir, '../')

		const self = this
		return new Promise((res, rej) => {
			self.window.webContents.send('update-message', 'Checking for old addons...');
			fs.readdir(appsDir, (err, files) => {
				if(err) {
					rej(err);
					return;
				}
	
				files.forEach((file) => {
					if(!file.startsWith('app-') || file == 'app-' + app.getVersion()) {
						return;
					}
					try {
						let appfolder = path.join(appsDir, file);
						let stats = fs.lstatSync(appfolder);
						if(stats.isDirectory()) {
							fs.accessSync(path.join(appfolder, 'resources'));
							let appResources = fs.readdirSync(path.join(appfolder, 'resources'));
							appResources.forEach((resource) => {
								if(resource.toLowerCase().endsWith('.asar') && ['app.asar', 'default_app.asar', 'electron.asar'].indexOf(resource.toLowerCase()) < 0) {
									try {
										if(!originalFs.existsSync(path.join(thisExecDir, 'resources', resource))) {
											originalFs.renameSync(
												path.join(appfolder, 'resources', resource),
												path.join(thisExecDir, 'resources', resource)
											);
										}
									} catch(er) {}
								}
							})
						}
					} catch(e) {
						console.error(e);
					}
				});
	
				res();
			});
		});
	}

}

export = SplashWindow;