const EventEmitter = require('events')
const http = require('http')
const {remote} = require('electron')
const {Menu, MenuItem, BrowserWindow} = remote

/**
 * This module manages the login flow
 * 
 * @class TTVLogin
 * @extends {EventEmitter}
 * @param {TTVTool} tool
 * @fires TTVLogin#complete
 */
class TTVLogin extends EventEmitter {

	constructor(tool) {
		super()

		this._tool = tool
		this._username = ''
		this._userid = ''
		this.logindialog = null
		this.loginbutton = null
		this.authwindow = null
		this.authresponseserver = null

		const self = this
		this._tool.once('load', () => {
			self.logindialog = document.querySelector('#logindialog')

			self._tool.cockpit.on('channelopen', () => {
				let mi = self._tool.ui.getMenuItemById('menu_changechannel')
				if(mi != null)
					mi.enabled = true
			})
			self._tool.cockpit.on('channelleft', () => {
				let mi = self._tool.ui.getMenuItemById('menu_changechannel')
				if(mi != null)
					mi.enabled = false
			})

			riot.mount(self.logindialog)

			self.loginbutton = document.querySelector('#starttwitchauth')
			self.loginbutton.onclick = () => { self.auth() }

			self.continueafterauth()
		})
	}

	/**
	 * Gives you the username of the logged in user. Is empty when not logged in.
	 * 
	 * @type {String}
	 * @readonly
	 */
	get username() {
		return this._username
	}

	/**
	 * Gives you the userid of the logged in user. Is empty when not logged in.
	 * 
	 * @type {String}
	 * @readonly
	 */
	get userid() {
		return this._userid
	}

	/**
	 * Gives you a new instance of the twitch menu
	 * 
	 * @type {MenuItem}
	 * @readonly
	 */
	get menu() {
		const self = this
		return new MenuItem({
			label: 'Twitch',
			submenu: Menu.buildFromTemplate([
				{
					label: this._tool.i18n.__('Change channel'),
					enabled: false,
					id: 'menu_changechannel',
					click() {
						self._tool.cockpit.leaveChannel()
					}
				},
				{
					type: 'separator'
				},
				{
					label: this._tool.i18n.__('Logout'),
					click() {
						window.localStorage.removeItem('tw_auth_token')
						window.location.reload()
					}
				}
			])
		})
	}

	/**
	 * Starts the authorization flow
	 */
	auth(partition) {
		const self = this
		this.loginbutton.innerText = this._tool.i18n.__('Please wait...')
		this.authresponseserver = http.createServer((req, resp) => {
			var response = "<!DOCTYPE html>\r\n<html><head><meta charset=\"utf-8\"><title>OAUTH RESPONSE</title></head><body>This should only be visible for a second...</body></html>"
			resp.writeHead(200, {'Content-Length': response.length, 'Content-Type': 'text/html; charset=utf-8'})
			resp.end(response)
		})
		this.authresponseserver.on('error', (err) => {
			self._tool.ui.showErrorMessage(err)
			if(self.authwindow != null) self.authwindow.close()
			self.authresponseserver.close()
			self.authresponseserver = null
		})
		this.authresponseserver.on('close', () => { self.authresponseserver = null })
		this.authresponseserver.on('listening', () => {
			self.loginbutton.innerText = self._tool.i18n.__('Login window should be opening...')
			let url = self._tool.twitchapi.getAuthImplicitGrantFlowUrl()
			let webpref = { nodeIntegration: true, webviewTag: false }
			if(typeof(partition) === 'string') webpref.partition = partition
			self.authwindow = new BrowserWindow({ width: 400, height: 500, show: false, icon: __dirname + '/../res/icon.ico', modal: true, autoHideMenuBar: true, webPreferences: webpref })
			self.authwindow.loadURL(url)
			self.authwindow.on('page-title-updated', (e, t) => { self.authtitlechange(e, t) })
			self.authwindow.show()
			self.authwindow.on('closed', () => {
				self.authwindow = null
				if(self.authresponseserver != null) {
					self.authresponseserver.close()
					self.authresponse({})
				}
			})
		})
		self.authresponseserver.listen(8086, 'localhost')
	}

	/**
	 * Is called when the title of the login window changes, so we know that it was completed
	 * 
	 * @private
	 * @param {Event} event Event of the title change
	 * @param {String} title New title of the window
	 */
	authtitlechange(event, title) {
		if(title == 'OAUTH RESPONSE') {
			let url = this.authwindow.webContents.getURL()

			this.authresponseserver.close()
			this.authwindow.close()

			let hashindex = url.lastIndexOf('#')
			if(hashindex > 0) {
				let hashstr = url.substring(hashindex+1)
				let hashargs = hashstr.split('&')
				let hash = {}
				for(let i = 0; i < hashargs.length; i++) {
					let kv = hashargs[i].split('=', 2)
					let k = kv[0]
					let v = decodeURIComponent(kv[1])
					hash[k] = v
				}
				this.authresponse(hash)
			}
		}
	}

	/**
	 * Checks for the right hash information and saves the token
	 * 
	 * @private
	 * @param {String} hash The hash of the url that was redirected to from the authorization flow
	 */
	authresponse(hash) {
		if(typeof(hash.access_token) != 'undefined' && typeof(hash.state) != 'undefined') {
			if(this._tool.twitchapi.verifyState(hash.state)) {
				this.loginbutton.innerText = this._tool.i18n.__('Logged in')
				this._tool.twitchapi.setAuthToken(hash.access_token)
				this._tool.twitchhelix.token = hash.access_token
				this._tool.pubsub.setAuthToken(hash.access_token)
				this.continueafterauth()
			} else {
				this.loginbutton.innerText = this._tool.i18n.__('Invalid token')
			}
		} else {
			this.loginbutton.innerText = this._tool.i18n.__('Canceled by user')
		}
	}

	/**
	 * Checks if user is logged in and fires complete event
	 * 
	 * @private
	 * @async
	 */
	async continueafterauth() {
		if(this._tool.twitchapi.isLoggedIn()) {
			this.logindialog.style.display = 'none'

			let usr = null
			try {
				usr = await this._tool.twitchapi.getUser()
			} catch(e) {
				this._tool.ui.showErrorMessage(e)
			}
			if(usr != null && usr.hasOwnProperty('_id')) {
				this._username = usr.name
				this._userid = usr._id
				/**
				 * Fires when user is sucessfully is logged in
				 * 
				 * @event TTVLogin#complete
				 */
				this.emit('complete')
			}
		} else {
			this.logindialog.style.display = 'table'
		}
	}

}

module.exports = TTVLogin