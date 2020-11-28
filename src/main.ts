import { app, globalShortcut, autoUpdater, ipcMain } from 'electron';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import electronSquirrelStartup from 'electron-squirrel-startup';

import MainWindow from './dev.pakl.ttvst/main/MainWindow';
import SplashWindow from './dev.pakl.ttvst/main/SplashWindow';
import * as SassLoader from './dev.pakl.ttvst/main/Util/SassLoader';

import TTVSTMain from './dev.pakl.ttvst/main/TTVSTMain';

let mainWin: MainWindow = null;
let splashWin: SplashWindow = null;

let doNotOpenMainWindow: boolean = false;

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

const errorTransport = new winston.transports.File({ level: 'error', dirname: app.getPath('logs'), filename: 'error_' + new Date().getTime() + '.log' })
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
autoUpdater.setFeedURL({ url: 'https://update.ttvst.app/' });

autoUpdater.on('update-available', () => {
	doNotOpenMainWindow = true
});

async function main() {
	if(electronSquirrelStartup) {
		app.quit();
		return;
	}
	
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

	if(doNotOpenMainWindow) {
		splashWin.once('done', () => {
			splashWin.close();
		})
		return;
	}

	TTVST = new TTVSTMain(mainWin);
	Object.assign(global, { TTVST });
	TTVST.init();

	splashWin.once('done', () => {
		mainWin.once('show', () => {
			splashWin.close();
			TTVST.addons.loadAddons();
		})
		mainWin.createAndLoad();
	})

	ipcMain.handle('render-sass', SassLoader.renderCSS);
	ipcMain.handle('get-app-version', async () => {
		return app.getVersion();
	});
}
main();