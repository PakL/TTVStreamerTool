"use strict"

const ws = require('../node_modules/nodejs-websocket')
const fs = require('fs')
const url = require('url')
const http = require('http')
const {remote} = require('electron')
const {globalShortcut} = remote

const UIPage = require('../mod/uipage')

class Overlays extends UIPage {

	constructor(toolui) {
		super('Overlays')
		this._ui = toolui
		const self = this

		this._visible = false

		this.wsport = 8091
		this.overlayport = 8090
		this.overlayres = 'res/overlays/'
		this.wsConnections = []

		this.allowedFiles = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.wav', '.mp3']

		this.wsserver = ws.createServer((conn) => { self.wsNewConnection(conn) }).listen(this.wsport)
		this.overlayserver = http.createServer((req, resp) => { self.httpRequest(req, resp) }).listen(this.overlayport)


		this.overlaySettingsPlaylistElement = null
		this.overlaySettingsVolumeElement = null
		this.overlaySettingsVolumeControlElement = null

		this.overlaySettingsOpen = false
		this.overlayMusicPlaylist = this.tool.settings.getString('overlay_music_playlist', 'PLRBp0Fe2Gpgm57nFVNM7qYZ9u64U9Q')
		this.overlayMusicVolume = parseInt(this.tool.settings.getString('overlay_music_volume', '50'))

		this.tool.on('load', () => {
			self.overlaySettingsPlaylistElement = document.querySelector('#overlay_music_playlistid')
			self.overlaySettingsVolumeElement = document.querySelector('#overlay_music_volume');
			self.overlaySettingsVolumeControlElement = document.querySelector('#overlay_music_volume_control');

			self.overlaySettingsPlaylistElement.value = self.overlayMusicPlaylist
			self.overlaySettingsPlaylistElement.addEventListener('keyup', (e) => {
				self.overlayMusicPlaylist = overlaySettingsPlaylistElement.value
				if(e.which == 13) {
					self.tool.settings.setString('overlay_music_playlist', self.overlayMusicPlaylist)
					self.broadcastWsMessage('music_playlist=' + self.overlayMusicPlaylist)
				}
			})
			self.overlaySettingsVolumeElement.value = self.overlayMusicVolume
			self.overlaySettingsVolumeElement.addEventListener('change', (e) => {
				self.tool.settings.setString('overlay_music_volume', self.overlaySettingsVolumeElement.value)
			})
			self.overlaySettingsVolumeControlElement.value = self.overlayMusicVolume
			self.overlaySettingsVolumeControlElement.addEventListener('change', (e) => {
				self.broadcastWsMessage('live_music_volume=' + self.overlaySettingsVolumeControlElement.value)
			})

			document.querySelector('#overlay_music_url').value = 'http://localhost:' + self.overlayport + '/music.html'
			document.querySelector('#overlay_music_volume_control_url').value = 'http://localhost:' + self.overlayport + '/send?music_volume=50'

			
			riot.mount(document.querySelector('#overlay_hotkeys'), {'localstorage': window.localStorage})
		})
		this.tool.on('exit', () => {
			self.wsserver.close()
		})
	}

	get localizedName() {
		return this.tool.i18n.__('Overlay settings')
	}

	get tool() {
		return this._ui.tool
	}

	wsNewConnection(conn) {
		const self = this
		console.log('[OverlayWS] New connection')
		this.wsConnections.push(conn)
		conn.on('text', function (str) {
			if(str.startsWith('music_volume_update=')) {
				self.overlaySettingsVolumeControlElement.value = str.substr(20)
			}
		})
		conn.on('close', function (code, reason) {
			console.log('[OverlayWS] Connection closed')
			self.wsConnections.splice(self.wsConnections.indexOf(conn), 1)
		})
	}

	broadcastWsMessage(message) {
		if(typeof(message) != 'string') return
		for(let i = 0; i < this.wsConnections.length; i++) {
			this.wsConnections[i].sendText(message)
		}
	}

	httpRequest(req, resp){
		const self = this
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
				resp.writeHead(400, {'Content-Length': 0})
				resp.end()
			} else {
				try {
					fs.accessSync(rp + name + '.html')
					let doc = fs.readFileSync(rp + name + '.html', { 'encoding': 'utf8' })
					doc = doc.replace(/\{__WS_PORT__\}/, this.wsport)
					doc = doc.replace(/\{__MUSIC_PLAYLIST__\}/, this.overlayMusicPlaylist)
					doc = doc.replace(/\{__MUSIC_VOLUME__\}/, this.overlayMusicVolume)

					resp.writeHead(200, {'Content-Length': Buffer.byteLength(doc, 'utf8')})
					resp.end(doc)
				} catch(e) {
					resp.writeHead(404, {'Content-Length': 0})
					resp.end()
				}
			}
		} else if(filename == 'send') {
			this.broadcastWsMessage(u.query)

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
			resp.writeHead(200, {'Content-Length': doc.length})
			resp.end(doc)
		} else if(!access) {
			resp.writeHead(404, {'Content-Length': 0})
			resp.end()
		} else {
			resp.writeHead(400, {'Content-Length': 0})
			resp.end()
		}
	}

	disableOverlayHotkeys() {
		globalShortcut.unregisterAll()
	}

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
		this.tool.settings.setJSON('overlay_hotkeys', hotkeyStorage)
	}

	open() {
		this._visible = true
		document.querySelector('#content_overlays').style.display = 'block'
	}

	close() {
		this._visible = false
		document.querySelector('#content_overlays').style.display = 'none'
	}

}

module.exports = Overlays