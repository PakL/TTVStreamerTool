import { BrowserWindow, ipcMain, app, autoUpdater, WillNavigateEvent } from 'electron';
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
				nodeIntegration: true,
				webviewTag: false
			},
			show: false
		});
		
		ipcMain.on('splash-done', this.onSplashDone.bind(this));
		this.window.on('ready-to-show', this.onReadyToShow.bind(this));
		this.window.webContents.on('will-navigate', this.onContentWillNavigate.bind(this));

		this.onUpdaterError = this.onUpdaterError.bind(this);
		this.onUpdaterUpdateAvailable = this.onUpdaterUpdateAvailable.bind(this);
		this.onUpdaterUpdateNotAvailable = this.onUpdaterUpdateNotAvailable.bind(this);
		this.onUpdaterDownloaded = this.onUpdaterDownloaded.bind(this);

		const self = this
		ipcMain.handle('splash-loaded', async function() {
			try {
				await self.moveOldAddons();
			} catch(e) {
				logger.error(e);
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
		logger.verbose('Showing splash screen window');
		this.window.show();
		this.window.moveTop();
	}

	private onContentWillNavigate(event: WillNavigateEvent, url: string) {
		// Prevent any and all navigation outside. This is very important!
		event.preventDefault();
	}

	private onSplashDone() {
		autoUpdater.removeListener('error', this.onUpdaterError);
		autoUpdater.removeListener('update-available', this.onUpdaterUpdateAvailable);
		autoUpdater.removeListener('update-not-available', this.onUpdaterUpdateNotAvailable);
		autoUpdater.removeListener('update-downloaded', this.onUpdaterDownloaded);

		this.emit('done');
	}

	close() {
		if(this.window !== null) {
			this.window.close();
			this.window = null
		}
	}

	private onUpdaterError(e: Error) {
		if(e.message == 'Can not find Squirrel') {
			process.env.NODE_ENV = 'development';
			logger.info('No squirrel found. Going into development mode.');
		} else {
			logger.error(e);
		}
		this.window.webContents.send('update-message', 'There was an error 🙁');
		this.onSplashDone();
	}
	private onUpdaterUpdateAvailable() {
		logger.info('Loading update...');
		this.window.webContents.send('update-message', 'Loading update... ' + ['🍕','🍟','🥨','🍙','🍪','🍦','🍌','🥦','🥕'][Math.floor(Math.random()*9)]);
	}
	private onUpdaterUpdateNotAvailable() {
		process.env.NODE_ENV = 'production';
		this.window.webContents.send('update-message', 'No update! 😎');
		this.onSplashDone();
	}
	private onUpdaterDownloaded() {
		logger.info('Quitting to install update');
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
			logger.info('Checking for old addons...');
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
											let pathSource = path.join(appfolder, 'resources', resource)
											let pathDest = path.join(thisExecDir, 'resources', resource)
											logger.verbose(`Found old addon at '${pathSource}'. Moving it to '${pathDest}'.`);
											originalFs.renameSync(pathSource, pathDest);
										}
									} catch(er) {
										logger.error(er);
									}
								}
							})
						}
					} catch(e) {
						logger.error(e);
					}
				});
	
				res();
			});
		});
	}

}

export = SplashWindow;