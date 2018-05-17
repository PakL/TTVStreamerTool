const Electron = require('electron')
const {app, BrowserWindow, globalShortcut, autoUpdater} = Electron
//const EAU = require('electron-asar-updater');
const windowStateKeeper = require('electron-window-state');

const path = require('path')
const url = require('url')
const fs = require('fs')
const {exec} = require('child_process')

let win
let splash

let doNotOpenMainWindow = false

app.setAppUserModelId('com.squirrel.ttvst.TTVStreamerTool')
autoUpdater.setFeedURL('https://dl.pohlarsystem.de/ttvst/')

if(require('electron-squirrel-startup')) app.quit();
else {

	function createWindow () {
		autoUpdater.on('update-available', () => {
			doNotOpenMainWindow = true
		})

		splash = new BrowserWindow({width: 130, height: 145, frame: false, skipTaskbar: true, alwaysOnTop: true})
		splash.loadURL(url.format({
			pathname: path.join(__dirname, 'views', 'splash.html'),
			protocol: 'file:',
			slashes: true
		}))

		splash.on('close', () => {
			if(doNotOpenMainWindow) return

			let mainWindowState = windowStateKeeper({ defaultWidth: 800, defaultHeight: 600 })

			win = new BrowserWindow({
				x: mainWindowState.x,
				y: mainWindowState.y,
				width: mainWindowState.width,
				height: mainWindowState.height,
				minWidth: 800,
				minHeight: 600,
				autoHideMenuBar: true,
				icon: 'res/icon.ico'
			})
			win.loadURL(url.format({
				pathname: path.join(__dirname, 'views', 'metroindex.html'),
				protocol: 'file:',
				slashes: true
			}))
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