const Electron = require('electron')
const {app, BrowserWindow, globalShortcut} = Electron
const EAU = require('electron-asar-updater');

const path = require('path')
const url = require('url')

let win

function createWindow () {
	win = new BrowserWindow({width: 800, height: 600})

	EAU.init({ 'api': 'https://vs.paklweb.de/ttvst/update.php' })

	win.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))

	//win.webContents.openDevTools()

	win.on('closed', () => {
		win = null
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