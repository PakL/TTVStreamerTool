const {app, BrowserWindow, globalShortcut, autoUpdater, ipcMain} = require('electron')
const windowStateKeeper = require('electron-window-state');

const path = require('path')
const url = require('url')

let win
let splash

let doNotOpenMainWindow = false

app.setAppUserModelId('com.squirrel.ttvst.TTVStreamerTool')
if(!app.requestSingleInstanceLock()) {
	app.quit();
}
autoUpdater.setFeedURL('https://dl.pohlarsystem.de/ttvst/')

if(require('electron-squirrel-startup')) app.quit();
else {

	function createWindow () {
		autoUpdater.on('update-available', () => {
			doNotOpenMainWindow = true
		})

		splash = new BrowserWindow({width: 300, height: 450, frame: false, skipTaskbar: true, alwaysOnTop: true, webPreferences: { nodeIntegration: true, webviewTag: false }, show: false})
		splash.loadURL(url.format({
			pathname: path.join(__dirname, 'views', 'splash.html'),
			protocol: 'file:',
			slashes: true
		}))
		splash.on('ready-to-show', () => { splash.show() })

		ipcMain.on('splash-done', () => {
			if(doNotOpenMainWindow) {
				splash.close()
				return
			}

			let mainWindowState = windowStateKeeper({ defaultWidth: 800, defaultHeight: 600 })

			win = new BrowserWindow({
				x: mainWindowState.x,
				y: mainWindowState.y,
				width: mainWindowState.width,
				height: mainWindowState.height,
				minWidth: 800,
				minHeight: 600,
				autoHideMenuBar: true,
				icon: 'res/icon.ico',
				webPreferences: { nodeIntegration: true, webviewTag: true },
				show: false
			})
			win.loadURL(url.format({
				pathname: path.join(__dirname, 'views', 'metroindex.html'),
				protocol: 'file:',
				slashes: true
			}))
			win.on('ready-to-show', () => {
				try {
					splash.close()
					splash.webContents.send('main-win-ready')
				} catch(e) {}
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