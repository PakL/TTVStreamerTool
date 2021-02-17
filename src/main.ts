import { app, globalShortcut, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

require('app-module-path').addPath(path.join(__dirname, '..', 'node_modules'));

import winston from 'winston';

import MainWindow from './dev.pakl.ttvst/main/MainWindow';
import SplashWindow from './dev.pakl.ttvst/main/SplashWindow';
import * as SassLoader from './dev.pakl.ttvst/main/Util/SassLoader';

import TTVSTMain from './dev.pakl.ttvst/main/TTVSTMain';

let mainWin: MainWindow = null;
let splashWin: SplashWindow = null;

let TTVST: TTVSTMain = null;

const logFormat = winston.format.printf((log) => {
	let msg = `${log.timestamp} [${log.level}] ${log.message}`;
	if(typeof(log.stack) === 'string') {
		let rows = log.stack.split('\n');
		for(let i = 0; i < rows.length; i++) {
			rows[i] = rows[i].replace(/\r/g, '')
			msg += `\n${log.timestamp} [${log.level}] ${rows[i]}`
		}
	}
	return msg;
})

const errorlogFilename = 'error_' + new Date().getTime() + '.log';
const errorlogPathFile = path.join(app.getPath('logs'), errorlogFilename);
const errorTransport = new winston.transports.File({ level: 'error', dirname: app.getPath('logs'), filename: errorlogFilename });
const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({ level: (process.env.NODE_ENV === 'development' ? 'debug' : 'info') }),
		errorTransport
	],
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		logFormat
	),
	exceptionHandlers: [
		errorTransport
	]
});
Object.assign(global, { logger });


app.setAppUserModelId('dev.pakl.TTVStreamerTool');
if(!app.requestSingleInstanceLock()) {
	app.quit();
}

async function main() {
	app.on('browser-window-created', (e, window) => {
		window.setAutoHideMenuBar(true);
		if(process.env.NODE_ENV !== 'development') {
			window.setMenu(null);
		}
	});

	app.on('second-instance', () => {
		if(mainWin !== null) {
			if(mainWin.window.isMinimized()) {
				mainWin.window.restore();
			}
			mainWin.window.focus();
		}
	});

	app.on('window-all-closed', () => {
		logger.verbose('All windows were closed. Application is going to quit now.');

		try {
			logger.destroy()
			let logFile = path.join(errorTransport.dirname, errorTransport.filename);
			let logStat = fs.statSync(logFile);
			if(logStat.size <= 0) {
				fs.unlinkSync(logFile);
			}
		} catch(e) {}
		
		globalShortcut.unregisterAll();
		if(process.platform !== 'darwin') {
			app.quit();
		}
	});

	logger.verbose('Waiting for app to be ready...');
	await app.whenReady();
	

	mainWin = new MainWindow();
	let mainBounds = mainWin.getBounds();
	let spX = (mainBounds.x + ((mainBounds.width - 300) / 2));
	let spY = (mainBounds.y + ((mainBounds.height - 450) / 2));
	splashWin = new SplashWindow({ x: spX, y: spY });

	TTVST = new TTVSTMain(mainWin);
	Object.assign(global, { TTVST });
	TTVST.init();

	splashWin.once('done', () => {
		mainWin.once('show', () => {
			splashWin.close();
			splashWin = null;
			TTVST.addons.loadAddons();
		});

		let updateAvailable = splashWin.updateAvailable;
		if(updateAvailable) {
			ipcMain.on('app.ttvst.startupdater', () => {
				try {
					let u = spawn('resources/elevate.exe', ['Update.exe'], { detached: true });
					u.on('error', (e) => { logger.error(e); });
				} catch(e){
					logger.error(e);
				}
			});
			TTVST.startpage.broadcastStatus({ key: 'app.ttvst.update', icon: 'Starburst', status: 'good', title: 'TTVStreamertool Update', info: 'A new version of TTVStreamerTool is available!', buttons: [{ icon: 'Installation', action: 'app.ttvst.startupdater', title: 'Start Updater' }]});
		} else {
			TTVST.startpage.broadcastStatus({ key: 'app.ttvst.update', status: 'remove', info: 'No update available' });
		}
		mainWin.createAndLoad();
	})

	ipcMain.handle('render-sass', SassLoader.renderCSS);
	ipcMain.handle('get-app-version', async () => {
		return app.getVersion();
	});
	ipcMain.handle('get-error-log', async () => {
		for(let i = 0; i < logger.transports.length; i++) {
			if(logger.transports[i] instanceof winston.transports.File) {
				let filetransp = logger.transports[i] as winston.transports.FileTransportInstance;
				let logfile = path.join(filetransp.dirname, filetransp.filename);

				try {
					return fs.readFileSync(logfile, { encoding: 'utf8' });
				} catch(e) {
					return 'Failed to read error log';
				}
			}
		}
		return 'Failed to find error log';
	});
}
main();