const Electron = require('electron')
const {app, BrowserWindow, globalShortcut, autoUpdater} = Electron
//const EAU = require('electron-asar-updater');

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
		/*win = new BrowserWindow({width: 800, height: 600})

		//EAU.init({ 'api': 'https://vs.paklweb.de/ttvst/update.php' })

		win.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true
		}))*/
		autoUpdater.on('update-available', () => {
			doNotOpenMainWindow = true
		})

		splash = new BrowserWindow({width: 130, height: 145, frame: false, skipTaskbar: true, alwaysOnTop: true})
		splash.loadURL(url.format({
			pathname: path.join(__dirname, 'splash.html'),
			protocol: 'file:',
			slashes: true
		}))

		//win.webContents.openDevTools()
		splash.on('close', () => {
			if(doNotOpenMainWindow) return

			win = new BrowserWindow({width: 800, height: 600})
			win.loadURL(url.format({
				pathname: path.join(__dirname, 'index.html'),
				protocol: 'file:',
				slashes: true
			}))
			win.on('closed', () => {
				win = null
			})
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