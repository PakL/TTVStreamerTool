import { app, globalShortcut, autoUpdater, ipcMain } from 'electron';
import electronSquirrelStartup from 'electron-squirrel-startup';

import MainWindow from './dev.pakl.ttvst/main/MainWindow';
import SplashWindow from './dev.pakl.ttvst/main/SplashWindow';
import * as SassLoader from './dev.pakl.ttvst/main/SassLoader';

let mainWin: MainWindow = null;
let splashWin: SplashWindow = null;

let doNotOpenMainWindow: boolean = false;

app.allowRendererProcessReuse = false;
app.setAppUserModelId('dev.pakl.TTVStreamerTool');
if(!app.requestSingleInstanceLock()) {
	app.quit();
}
autoUpdater.setFeedURL({ url: 'https://update.ttvst.app/' });

async function main() {
	if(electronSquirrelStartup) {
		app.quit();
		return;
	}
	
	app.on('browser-window-created', (e, window) => {
		window.setMenu(null);
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
		globalShortcut.unregisterAll();
		if(process.platform !== 'darwin') {
			app.quit();
		}
	});

	await app.whenReady();
	
	autoUpdater.on('update-available', () => {
		doNotOpenMainWindow = true
	});

	mainWin = new MainWindow();
	let mainBounds = mainWin.getBounds();
	let spX = (mainBounds.x + ((mainBounds.width - 300) / 2));
	let spY = (mainBounds.y + ((mainBounds.height - 450) / 2));
	splashWin = new SplashWindow({ x: spX, y: spY });

	if(doNotOpenMainWindow) {
		return;
	}

	mainWin.createAndLoad();
	splashWin.on('done', () => {
		mainWin.show();
	})

	ipcMain.handle('render-sass', SassLoader.renderCSS);
}
main();