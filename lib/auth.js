"use strict"

const EventEmitter = require('events')
const http = require('http')
const {remote} = require('electron')
const {Menu, MenuItem, BrowserWindow} = remote

class TTVLogin extends EventEmitter {

	/**
	 * @param {TTVTool} tool
	 */
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
		this._tool.on('load', () => {
			self.logindialog = document.querySelector('#logindialog')
			self.loginbutton = document.querySelector('#starttwitchauth')

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
			self.continueafterauth()
		})
	}

	get username() {
		return this._username
	}

	get userid() {
		return this._userid
	}

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

	auth() {
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
		this.authresponseserver.listen(8086, () => {
			self.loginbutton.innerText = self._tool.i18n.__('Login window should be opening...')
			let url = self._tool.twitchapi.getAuthImplicitGrantFlowUrl()
			self.authwindow = new BrowserWindow({ width: 400, height: 500, show: false, 'node-integration': false, webPreferences: { sandbox: true } })
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
	}

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

	authresponse(hash) {
		if(typeof(hash.access_token) != 'undefined' && typeof(hash.state) != 'undefined') {
			if(this._tool.twitchapi.verifyState(hash.state)) {
				this.loginbutton.innerText = this._tool.i18n.__('Logged in')
				this._tool.twitchapi.setAuthToken(hash.access_token)
				this.continueafterauth()
			} else {
				this.loginbutton.innerText = this._tool.i18n.__('Invalid token')
			}
		} else {
			this.loginbutton.innerText = this._tool.i18n.__('Canceled by user')
		}
	}

	continueafterauth() {
		if(this._tool.twitchapi.isLoggedIn()) {
			this.logindialog.style.display = 'none'

			this._tool.twitchapi.getUser('', (res, err) => {
				if(res != null && res.hasOwnProperty('_id')) {
					this._username = res.name
					this._userid = res._id
					this.emit('complete')
					/*loadMoreFollows(true)
					twitchchat = new Chat(res.name, twitchapi.token)*/
				} else if(err != null) {
					this._tool.ui.showErrorMessage(err)
				}
			})
		}
	}

}

module.exports = TTVLogin