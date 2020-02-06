import * as path from 'path'
import * as electron from 'electron'
import * as fs from 'fs'

let _app : electron.App = null
let _screen : electron.Screen = null

interface IWindowStateOptions {
	defaultWidth: number;
	defaultHeight: number;
}

interface IWindowStatePosition {
	x: number;
	y: number;
}

class WindowState {

	width: number;
	height: number;
	x: number;
	y: number;
	isMaximized: boolean;
	isFullScreen: boolean;
	managedWindow: electron.BrowserWindow;
	filePath: string;

	constructor(options: IWindowStateOptions) {
		_app = electron.app || electron.remote.app
		_screen = electron.screen || electron.remote.screen

		let pScreen = _screen.getPrimaryDisplay().bounds

		this.width = options.defaultWidth || 800
		this.height = options.defaultHeight || 600
		this.x = pScreen.x + (Math.floor(pScreen.width / 2) - Math.floor(this.width / 2))
		this.y = pScreen.y + (Math.floor(pScreen.height / 2) - Math.floor(this.height / 2))
		this.isMaximized = false
		this.isFullScreen = false

		const self = this
		this._manageWindowCloseListener = () => { self.saveState() }
		this._manageWindowResizeListener = () => { self.refreshState() }
		this._manageWindowMoveListener = () => { self.refreshState() }
		this._manageWindowMaxmizeListener = () => { self.refreshState() }
		this._manageWindowUnmaximizeListener = () => { self.refreshState() }
		this.managedWindow = null

		this.filePath = path.join(_app.getPath('userData'), 'window-state.json')
		this.loadState()
	}

	_manageWindowCloseListener() {}
	_manageWindowResizeListener() {}
	_manageWindowMoveListener() {}
	_manageWindowMaxmizeListener() {}
	_manageWindowUnmaximizeListener() {}

	loadState() {
		try {
			let stateFile = fs.readFileSync(this.filePath, { encoding: 'utf8' })
			let state = JSON.parse(stateFile)

			this.x = (typeof(state.x) !== 'undefined' ? state.x : this.x)
			this.y = (typeof(state.y) !== 'undefined' ? state.y : this.y)
			this.width = (typeof(state.width) !== 'undefined' ? state.width : this.height)
			this.height = (typeof(state.height) !== 'undefined' ? state.height : this.height)
			this.isMaximized = state.isMaximized || this.isMaximized
			this.isFullScreen = state.isFullScreen || this.isFullScreen
		} catch(e){}
	}
	
	refreshState() {
		if(this.managedWindow === null) return
		let winBounds = this.managedWindow.getBounds()
		
		if(this.isMaximized !== this.managedWindow.isMaximized()) {
			this.isMaximized = this.managedWindow.isMaximized()
		}
		if(!this.isMaximized) {
			if(this.inView(winBounds)) {
				this.x = winBounds.x
				this.y = winBounds.y
				this.width = winBounds.width
				this.height = winBounds.height
			} else {
				console.log('Window not in view at ' + winBounds.x + ',' + winBounds.y + '|' + winBounds.width + ',' + winBounds.height)
			}
		}
	}

	saveState() {
		try {
			let state = JSON.stringify({
				x: this.x,
				y: this.y,
				width: this.width,
				height: this.height,
				isMaximized: this.isMaximized
			})
			fs.writeFileSync(this.filePath, state)
		} catch(e) {}
	}

	_overlap(l1: IWindowStatePosition, r1: IWindowStatePosition, l2: IWindowStatePosition, r2: IWindowStatePosition) {
		if(l1.x > r2.x || l2.x > r1.x)
			return false

		if(r1.y < l2.y || r2.y < l1.y)
			return false

		return true
	}

	inView(winbounds: electron.Rectangle) {
		let screens = _screen.getAllDisplays()
		for(let i = 0; i < screens.length; i++) {
			let b = screens[i].bounds
			let l1 = {x: winbounds.x, y: winbounds.y}
			let r1 = {x: winbounds.x+winbounds.width, y: winbounds.y+winbounds.height}
			let l2 = {x: b.x, y: b.y}
			let r2 = {x: b.x+b.width, y: b.y+b.height}
			if(this._overlap(l1, r1, l2, r2))
				return true
		}
		return false
	}

	_addListeners(window: electron.BrowserWindow) {
		window.on('close', this._manageWindowCloseListener)
		window.on('resize', this._manageWindowResizeListener)
		window.on('move', this._manageWindowMoveListener)
		window.on('maximize', this._manageWindowMaxmizeListener)
		window.on('unmaximize', this._manageWindowUnmaximizeListener)
	}

	manage(window: electron.BrowserWindow) {
		this.managedWindow = window

		this.managedWindow.setBounds({ x: this.x, y: this.y, width: this.width, height: this.height })
		if(this.managedWindow.isVisible()) {
			if(this.isMaximized) this.managedWindow.maximize()
			this._addListeners(this.managedWindow)
		} else {
			const self = this
			this.managedWindow.once('show', () => {
				if(self.isMaximized) self.managedWindow.maximize()
				self._addListeners(self.managedWindow)
			})
		}

	}



	unmanage() {
		if(this.managedWindow !== null) {
			this.managedWindow.removeListener('close', this._manageWindowCloseListener)
			this.managedWindow.removeListener('resize', this._manageWindowResizeListener)
			this.managedWindow.removeListener('move', this._manageWindowMoveListener)
			this.managedWindow.removeListener('maximize', this._manageWindowMaxmizeListener)
			this.managedWindow.removeListener('unmaximize', this._manageWindowUnmaximizeListener)
			this.managedWindow = null
		}
	}

}

export { WindowState }