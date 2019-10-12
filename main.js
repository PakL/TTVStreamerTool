const {app, BrowserWindow, globalShortcut, autoUpdater, ipcMain} = require('electron')
const WindowState = require('./lib/window-state');

const path = require('path')
const url = require('url')

let win
let splash

let doNotOpenMainWindow = false

app.setAppUserModelId('dev.pakl.TTVStreamerTool')
if(!app.requestSingleInstanceLock()) {
	app.quit();
}
autoUpdater.setFeedURL('https://update.ttvst.app/')

if(require('electron-squirrel-startup')) app.quit();
else {
	app.on('browser-window-created',function(e,window) {
		window.setMenu(null);
	});

	function createWindow () {
		autoUpdater.on('update-available', () => {
			doNotOpenMainWindow = true
		})

		let mainWindowState = new WindowState({ defaultWidth: 800, defaultHeight: 600 })

		let spX = (mainWindowState.x + ((mainWindowState.width - 300) / 2))
		let spY = (mainWindowState.y + ((mainWindowState.height - 450) / 2))
		splash = new BrowserWindow({x: spX, y: spY, width: 300, height: 450, frame: false, skipTaskbar: true, alwaysOnTop: true, webPreferences: { nodeIntegration: true, webviewTag: false }, show: false})
		splash.loadURL(url.format({
			pathname: path.join(__dirname, 'views', 'splash.html'),
			protocol: 'file:',
			slashes: true
		}))
		splash.on('ready-to-show', () => {
			if(splash !== null)
				splash.show()
		})

		ipcMain.on('splash-done', () => {
			if(doNotOpenMainWindow) {
				splash.close()
				return
			}


			win = new BrowserWindow({
				x: mainWindowState.x,
				y: mainWindowState.y,
				width: mainWindowState.width,
				height: mainWindowState.height,
				minWidth: 800,
				minHeight: 600,
				autoHideMenuBar: true,
				icon: path.join(__dirname, 'res/img/icon.ico'),
				webPreferences: { nodeIntegration: true, webviewTag: true },
				show: false
			})
			win.loadURL(url.format({
				pathname: path.join(__dirname, 'views', 'metroindex.html'),
				protocol: 'file:',
				slashes: true
			}))
			win.once('show', () => {
				if(splash !== null)
					splash.close()
			})
			win.on('ready-to-show', () => {
				win.show()
			})
			win.on('closed', () => {
				win = null
			})
			mainWindowState.manage(win)
		})

		splash.on('closed', () => {
			splash = null
		})
	}

	app.on('ready', createWindow)

	app.on('second-instance', (event, commandLine, workingDirectory) => {
		if (win) {
			if(win.isMinimized()) win.restore()
			win.focus()
		}
	})

	app.on('window-all-closed', () => {
		globalShortcut.unregisterAll()
		if (process.platform !== 'darwin') {
			app.quit()
		}
	})

	app.on('activate', () => {
		if (win === null) {
			createWindow()
		}
	})

}