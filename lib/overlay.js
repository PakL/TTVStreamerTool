"use strict"

const ws = require('../node_modules/nodejs-websocket')
const fs = require('fs')
const url = require('url')
const http = require('http')
const {remote} = require('electron')
const {globalShortcut} = remote

const UIPage = require('../mod/uipage')

/**
 * This module creates a http host for OBS/Xsplit overlays. Has an UI for setting hotkeys and controling 
 * 
 * @class Overlays
 * @extends {UIPage}
 * @param {ToolUI} toolui
 * @fires Overlays#hotkeys-unregistered
 * @fires Overlays#command
 */
class Overlays extends UIPage {

	constructor(toolui) {
		super('Overlays')
		this._ui = toolui
		const self = this

		this._visible = false

		/**
		 * The port for the WebSocket server. Connect to this port to listen for events.
		 * @member {Number}
		 */
		this.wsport = 8091
		/**
		 * The port for the overlay http server.
		 * @member {Number}
		 */
		this.overlayport = 8090
		this.overlayres = 'res/overlays/'
		this.repeatForNewClients = []

		/**
		 * Array of file endings that are being served. You can add your own, if you want.
		 * @member {Array<String>}
		 */
		this.allowedFiles = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.wav', '.mp3']

		/**
		 * The websocket server
		 * @member {nodejs-websocket.Server}
		 */
		this.wsserver = ws.createServer((conn) => { self.wsNewConnection(conn) }).listen(this.wsport)
		this.wsserver.on('error', (e) => { console.error(e) })
		console.log('[Overlay] Websocket server listening on ' + this.wsport)
		/**
		 * The http server
		 * @member {http.Server}
		 */
		this.overlayserver = http.createServer((req, resp) => { self.httpRequest(req, resp) }).listen(this.overlayport)
		console.log('[Overlay] HTTP server listening on ' + this.overlayport)

		
		this._appendOnLoad = []

		this.overlaySettingsPlaylistElement = null
		this.overlaySettingsVolumeElement = null
		this.overlaySettingsVolumeControlElement = null

		this.overlaySettingsOpen = false

		/** Music overlay settings */
		this.appendSetting('', this._ui.i18n.__('Overlay URL'), 'text', {attrid: 'music_overlay_url', set: 'music', setLabel: this._ui.i18n.__('Music Overlay'), readonly: true, default: 'http://localhost:' + self.overlayport + '/music.html', 'description': this._ui.i18n.__('Add #black to the end of the URL to get black text with white borders instead of white text with black borders.')})
		this.appendSetting('', this._ui.i18n.__('Black font'), 'checkbox', {set: 'music', readonly: true, default: 'http://localhost:' + self.overlayport + '/music.html', onchange: (e) => {
			if(e.target.checked) {
				document.querySelector('#music_overlay_url').value = 'http://localhost:' + self.overlayport + '/music.html#black'
			} else {
				document.querySelector('#music_overlay_url').value = 'http://localhost:' + self.overlayport + '/music.html'
			}
		}})
		this.appendSetting('', this._ui.i18n.__('Overlay volume control URL'), 'text', {attrid: 'music_volume_url', set: 'music', readonly: true, default: 'http://localhost:' + self.overlayport + '/send?music_volume=' + this.tool.settings.getString('overlay_music_volume', '50'), 'description': this._ui.i18n.__('This is a completely transparent overlay you can use in different OBS scenes to control the volume on scene changes. Change the number at the end to anything between 0 (mute) to 100 (way to loud).')})
		this.appendSetting('', this._ui.i18n.__('Overlay volume control command'), 'text', {attrid: 'music_volume_cmd', set: 'music', readonly: true, default: 'music_volume=' + this.tool.settings.getString('overlay_music_volume', '50'), 'description': this._ui.i18n.__('Use this command in an hotkey to change volume. Change the number at the end to anything between 0 (mute) to 100 (way to loud).')})
		this.appendSetting('', this._ui.i18n.__('Overlay skip track command'), 'text', {attrid: 'music_skip_track_cmd', set: 'music', readonly: true, default: 'music_skip_track', 'description': this._ui.i18n.__('Use this command in an hotkey to skip to the next track.')})
		this.appendSetting('', this._ui.i18n.__('Skip now'), 'button', {set: 'music', onclick: () => {
			self.broadcastWsMessage('music_skip_track')
		}})

		this.appendSetting('', '', 'separator', {set: 'music'})

		this.appendSetting('overlay_music_playlist', this._ui.i18n.__('Youtube playlist id: (has to be public)'), 'text', {set: 'music', default: 'PLRBp0Fe2Gpglq-J-Hv0p-y0wk3lQk570u', onchange: () => {
			self.broadcastWsMessage('music_playlist=' + self.overlayMusicPlaylist)
		}})

		this.appendSetting('overlay_music_volume', this._ui.i18n.__('Default volume'), 'range', {set: 'music', default: 50, min: 0, max: 100, step: 5})
		this.appendSetting('', this._ui.i18n.__('Live volume control'), 'range', {attrid: 'music_live_control', set: 'music', default: parseFloat(this.tool.settings.getString('overlay_music_volume', '50')), min: 0, max: 100, onchange: (e) => {
			self.broadcastWsMessage('live_music_volume=' + e.target.value)
			document.querySelector('#music_volume_url').value = 'http://localhost:' + self.overlayport + '/send?music_volume=' + e.target.value
			document.querySelector('#music_volume_cmd').value = 'music_volume=' + e.target.value
		}})

		/** Timer overlay settings */
		this.appendSetting('', this._ui.i18n.__('Overlay URL'), 'text', {attrid: 'timer_overlay_url', set: 'timer', setLabel: this._ui.i18n.__('Countdown Overlay'), readonly: true, default: 'http://localhost:' + self.overlayport + '/countdown.html', 'description': this._ui.i18n.__('Add #black to the end of the URL to get black text with white borders instead of white text with black borders.')})
		this.appendSetting('', this._ui.i18n.__('Black font'), 'checkbox', {set: 'timer', readonly: true, default: 'http://localhost:' + self.overlayport + '/countdown.html', onchange: (e) => {
			if(e.target.checked) {
				document.querySelector('#timer_overlay_url').value = 'http://localhost:' + self.overlayport + '/countdown.html#black'
			} else {
				document.querySelector('#timer_overlay_url').value = 'http://localhost:' + self.overlayport + '/countdown.html'
			}
		}})
		this.appendSetting('', this._ui.i18n.__('Overlay add time command'), 'text', {attrid: 'timer_add_cmd', set: 'timer', readonly: true, default: 'timer_add=5m', 'description': this._ui.i18n.__('Use this command in an hotkey to add time the countdown overlay. You can add time in this format: ##h##m##s; ##h adds hours, ##m adds minutes, ##s adds seconds. Every part is optional. Example: timer_add=1h30m0s or timer_add=90m')})
		this.appendSetting('', this._ui.i18n.__('Overlay set time target command'), 'text', {attrid: 'timer_set_cmd', set: 'timer', readonly: true, default: 'timer_set=12:00', 'description': this._ui.i18n.__('Use this command in an hotkey to let the countdown count down to a specific point in time. Format: YYYY-MM-DD hh:mm:ss; Hours must be in the 24 hour format, date and seconds are optional. If the given date is in the past nothing will happen. Example: timer_set=2018-09-08 13:00:00 or timer_set=15:00')})


		this.tool.on('load', () => {
			let hotkeySet = document.querySelector('#overlay_hotkeys_set')
			riot.mount(hotkeySet, 'settingsset', {title: self._ui.i18n.__('Overlay hotkeys'), 'settings': []})
			let hotkeySetSet = document.querySelector('#overlay_hotkeys_set > fieldset')

			let hotkeys = document.createElement('overlayhotkeys')
			hotkeys.setAttribute('id', 'overlay_hotkeys')
			hotkeySetSet.appendChild(hotkeys)

			while(self._appendOnLoad.length > 0) {
				let s = self._appendOnLoad.shift()
				self.appendSetting(s.setting, s.label, s.type, s.options)
			}

			riot.mount(hotkeys, {'localstorage': window.localStorage})
		})
		this.tool.on('exit', () => {
			self.wsserver.close()
			console.log('[Overlay] Websocket server closing')
			self.overlayserver.close()
			console.log('[Overlay] HTTP server closing')
		})
	}

	/**
	 * Gives you the localized name of the page
	 * 
	 * @type {String}
	 * @override
	 * @readonly
	 */
	get localizedName() {
		return this.tool.i18n.__('Overlay settings')
	}

	get icon() {
		return '🖼️'
	}

	/**
	 * Shortcut to the tool
	 * 
	 * @type {TTVTool}
	 * @readonly
	 * @private
	 */
	get tool() {
		return this._ui.tool
	}

	/**
	 * Manages new websocket connections
	 * 
	 * @param {ws.Client} conn 
	 * @private
	 */
	wsNewConnection(conn) {
		const self = this
		console.log('[Overlay] New websocket connection')

		//this.wsConnections.push(conn)
		conn.on('text', function (str) {
			console.log('[Overlay][Websocket] > ' + str)
			if(str.startsWith('music_volume_update=')) {
				document.querySelector('#music_live_control').value = str.substr(20)
			}
			if(str.startsWith('please_repeat')) {
				let repeats = []
				self.repeatForNewClients.forEach((val) => {
					if(new Date().getTime() - 1000 <= val.time) {
						repeats.push(val)
						console.log('[Overlay][Websocket] Repeating for new client: < ' + val.msg)
						conn.sendText(val.msg)
					}
				})
				self.repeatForNewClients = repeats
			}
		})
		conn.on('close', function (code, reason) {
			console.log('[Overlay] Websocket connection closed')
			//self.wsConnections.splice(self.wsConnections.indexOf(conn), 1)
		})
	}

	/**
	 * Broadcasts a message to all WebSocket connections
	 * 
	 * @param {String} message Message you want to send
	 */
	broadcastWsMessage(message) {
		if(typeof(message) != 'string') return
		this.repeatForNewClients.push({msg: message, time: new Date().getTime()})
		for(let i = 0; i < this.wsserver.connections.length; i++) {
			this.wsserver.connections[i].sendText(message)
		}
		if(this.wsserver.connections.length > 0)
			console.log('[Overlay][Websocket] < ' + message)

		/**
		 * Fires when a command is fired (wether or not a overlay has received it)
		 * @event Overlays#command
		 * @param {String} command The command or message string that was sent
		 */
		this.emit('command', message)
	}

	/**
	 * Manages http requests
	 * 
	 * @private
	 * @param {http.IncomingMessage} req
	 * @param {http.ServerResponse} resp 
	 */
	httpRequest(req, resp){
		const self = this
		console.log('[Overlay][HTTP] > ' + req.method + ' ' + req.url)
		let u = url.parse(req.url)
		let filename = u.pathname
		if(filename.length > 0) filename = filename.substr(1)
		let i = filename.lastIndexOf(".")
		let allowed = (this.allowedFiles.indexOf(filename.substr(i).toLowerCase()) >= 0)
		let access = false
		let rp = this.overlayres
		try {
			fs.accessSync(rp + filename)
			access = true
		} catch(e) {}
		if(!access) {
			try {
				fs.accessSync('addons/')
				let addons = fs.readdirSync('addons/')
				for(let i = 0; i < addons.length; i++) {
					try {
						fs.accessSync('addons/' + addons[i] + '/' + rp + filename)
						rp = 'addons/' + addons[i] + '/' + rp
						access = true
						break
					} catch(e) {}
				}
			} catch(e) {}
		}
		if(!access) {
			try {
				fs.accessSync('resources/')
				let asars = fs.readdirSync('resources/')
				for(let i = 0; i < asars.length; i++) {
					let n = asars[i].toLowerCase()
					if(n.substr(n.lastIndexOf('.')) == '.asar') {
						try {
							fs.accessSync('resources/' + asars[i] + '/' + rp + filename)
							rp = 'resources/' + asars[i] + '/' + rp
							access = true
							break
						} catch(e) {}
					}
				}
			} catch(e) {}
		}
		if(u.pathname == '/' || u.pathname.substr(u.pathname.lastIndexOf('.')) == '.html') {
			if(u.pathname.substr(0, 1) == "/") u.pathname = u.pathname.substr(1)
			let name = u.pathname.substring(0, u.pathname.lastIndexOf('.'))
			if(name == 'index') {
				console.log('[Overlay][HTTP] < 400, Content-Length: 0')
				resp.writeHead(400, {'Content-Length': 0})
				resp.end()
			} else {
				try {
					fs.accessSync(rp + name + '.html')
					let doc = fs.readFileSync(rp + name + '.html', { 'encoding': 'utf8' })
					doc = doc.replace(/\{__WS_PORT__\}/, this.wsport)
					doc = doc.replace(/\{__MUSIC_PLAYLIST__\}/, this.overlayMusicPlaylist)
					doc = doc.replace(/\{__MUSIC_VOLUME__\}/, this.overlayMusicVolume)

					console.log('[Overlay][HTTP] < 200, Content-Length: '+Buffer.byteLength(doc, 'utf8'))
					resp.writeHead(200, {'Content-Length': Buffer.byteLength(doc, 'utf8')})
					resp.end(doc)
				} catch(e) {
					console.log('[Overlay][HTTP] < 404, Content-Length: 0')
					resp.writeHead(404, {'Content-Length': 0})
					resp.end()
				}
			}
		} else if(filename == 'send') {
			this.broadcastWsMessage(u.query)

			console.log('[Overlay][HTTP] < 200, Content-Length: 0')
			resp.writeHead(200, {'Content-Length': 0})
			resp.end('')
		} else if(i > 0 && access && allowed) {
			let doc = ''
			if(filename.substr(i).toLowerCase() == '.js') {
				doc = fs.readFileSync(rp + filename, { 'encoding': 'utf8' })
				doc = doc.replace(/\{__WS_PORT__\}/, this.wsport)
			} else {
				doc = fs.readFileSync(rp + filename)
			}
			console.log('[Overlay][HTTP] < 200, Content-Length: '+doc.length)
			resp.writeHead(200, {'Content-Length': doc.length})
			resp.end(doc)
		} else if(!access) {
			console.log('[Overlay][HTTP] < 404, Content-Length: 0')
			resp.writeHead(404, {'Content-Length': 0})
			resp.end()
		} else {
			console.log('[Overlay][HTTP] < 400, Content-Length: 0')
			resp.writeHead(400, {'Content-Length': 0})
			resp.end()
		}
	}

	get overlayMusicPlaylist() {
		return this.tool.settings.getString("overlay_music_playlist");
	}

	get overlayMusicVolume() {
		return parseInt(this.tool.settings.getString("overlay_music_volume"));
	}

	/**
	 * Disable all registered Hotkeys
	 */
	disableOverlayHotkeys() {
		globalShortcut.unregisterAll()
		/**
		 * Fires when hotkeys were unregistered
		 * @event Overlays#hotkeys-unregistered
		 */
		this.emit('hotkeys-unregistered')
		console.log('[Overlay] All hotkeys disabled')
	}

	/**
	 * Saves all hotkeys from the form
	 * 
	 * @private
	 */
	renewOverlayHotkeys() {
		const self = this
		this.disableOverlayHotkeys()

		let hotkeys = document.querySelector('#overlay_hotkeys').querySelectorAll('hotkey')
		let hotkeyStorage = []
		for(let i = 0; i < hotkeys.length; i++) {
			let accelerator = hotkeys[i].querySelector('.hotkeyaccelerator').value
			let command = hotkeys[i].querySelector('.hotkeycommand').value

			if(accelerator.length > 0 && command.length > 0) {
				globalShortcut.register(accelerator, () => { self.broadcastWsMessage(command) })
				hotkeyStorage.push({accelerator: accelerator, cmd: command})
			}
		}
		console.log('[Overlay] Registered ' + hotkeys.length + ' hotkeys')
		this.tool.settings.setJSON('overlay_hotkeys', hotkeyStorage)
	}

	/**
	 * Open the cockpit page
	 * 
	 * @override
	 */
	open() {
		this._visible = true
		document.querySelector('#content_overlays').style.display = 'block'
	}

	/**
	 * Closes the cockpit page
	 * 
	 * @override
	 */
	close() {
		this._visible = false
		document.querySelector('#content_overlays').style.display = 'none'
	}


	/**
	 * 
	 * @param {String} setting 
	 * @param {String} label 
	 * @param {String} type 
	 * @param {Object} options 
	 */
	appendSetting(setting, label, type, options) {
		const self = this

		type = type.toLowerCase()
		if(['text', 'checkbox', 'select', 'password', 'separator', 'button', 'range', 'number', 'date', 'time'].indexOf(type) < 0) return
		//if((setting.length <= 0 || label.length <= 0) && type != 'separator') return


		let options_default = {
			set: 'unsorted',
			setLabel: '',
			description: '',
			selection: {},
			onchange: null,
			onclick: null,
			default: null
		}
		if(typeof(options) == 'object') {
			options = Object.assign(options_default, options)
		} else {
			options = options_default
		}
		
		options.type = type
		options.setting = setting
		options.label = label

		let content_settings = document.querySelector('#content_overlays')
		if(content_settings === null) {
			this._appendOnLoad.push({setting: setting, label: label, type: type, options: options})
			return
		}

		// Getting the fieldset the option belongs to or creates a new one if it doesn't exist
		let settings_set = document.querySelector('#osettings_set_' + options.set)
		if(settings_set === null) {
			let fieldsetElement = document.createElement('settingsset')
			fieldsetElement.id = 'osettings_set_' + options.set
			content_settings.appendChild(fieldsetElement)
			riot.mount(fieldsetElement, 'settingsset', {'title': options.setLabel, 'settings': []})
			settings_set = fieldsetElement
		}

		settings_set._tag.addSetting(options)
	}

}

module.exports = Overlays