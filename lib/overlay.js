const ws = require('nodejs-websocket')
const fs = require('fs')
const url = require('url')

const wsport = 8091
const overlayport = 8090
const overlayres = 'res/overlays/'
let wsConnections = []

let wsserver = ws.createServer(function (conn) {
	console.log('[OverlayWS] New connection')
	wsConnections.push(conn)
	conn.on('text', function (str) {
		if(str.startsWith('music_volume_update=')) {
			overlaySettingsVolumeControlElement.value = str.substr(20)
		}
	})
	conn.on('close', function (code, reason) {
		console.log('[OverlayWS] Connection closed')
		wsConnections.splice(wsConnections.indexOf(conn), 1)
	})
}).listen(wsport)

let broadcastWsMessage = function(message) {
	if(typeof(message) != 'string') return
	for(var i = 0; i < wsConnections.length; i++) {
		wsConnections[i].sendText(message)
	}
}

let overlayserver = http.createServer(function(req, resp){
	var allowedFiles = ['.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.wav', '.mp3']
	var u = url.parse(req.url)
	var filename = u.pathname
	if(filename.length > 0) filename = filename.substr(1)
	var i = filename.lastIndexOf(".")
	var allowed = (allowedFiles.indexOf(filename.substr(i).toLowerCase()) >= 0)
	var access = false
	let rp = overlayres
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
		var name = u.pathname.substring(0, u.pathname.lastIndexOf('.'))
		if(name == 'index') {
			resp.writeHead(400, {'Content-Length': 0})
			resp.end()
		} else {
			try {
				fs.accessSync(rp + name + '.html')
				var doc = fs.readFileSync(rp + name + '.html', { 'encoding': 'utf8' })
				doc = doc.replace(/\{__WS_PORT__\}/, wsport)
				doc = doc.replace(/\{__MUSIC_PLAYLIST__\}/, overlayMusicPlaylist)
				doc = doc.replace(/\{__MUSIC_VOLUME__\}/, overlayMusicVolume)

				resp.writeHead(200, {'Content-Length': Buffer.byteLength(doc, 'utf8')})
				resp.end(doc)
			} catch(e) {
				resp.writeHead(404, {'Content-Length': 0})
				resp.end()
			}
		}
	} else if(filename == 'send') {
		broadcastWsMessage(u.query)

		resp.writeHead(200, {'Content-Length': 0})
		resp.end('')
	} else if(i > 0 && access && allowed) {
		if(filename.substr(i).toLowerCase() == '.js') {
			var doc = fs.readFileSync(rp + filename, { 'encoding': 'utf8' })
			doc = doc.replace(/\{__WS_PORT__\}/, wsport)
			resp.writeHead(200, {'Content-Length': doc.length})
		} else {
			var doc = fs.readFileSync(rp + filename)
			resp.writeHead(200, {'Content-Length': doc.length})
		}
		resp.end(doc)
	} else if(!access) {
		resp.writeHead(404, {'Content-Length': 0})
		resp.end()
	} else {
		resp.writeHead(400, {'Content-Length': 0})
		resp.end()
	}
}).listen(overlayport)


let overlaySettingsPlaylistElement = document.querySelector('#overlay_music_playlistid')
let overlaySettingsVolumeElement = document.querySelector('#overlay_music_volume');
let overlaySettingsVolumeControlElement = document.querySelector('#overlay_music_volume_control');

let overlaySettingsOpen = false
let overlayMusicPlaylist = window.localStorage.getItem('overlay_music_playlist')
let overlayMusicVolume = window.localStorage.getItem('overlay_music_volume')
if(overlayMusicPlaylist == null)
	overlayMusicPlaylist = 'PLRBp0Fe2Gpgm57nFVNM7qYZ9u64U9Q-Bf'
if(overlayMusicVolume == null)
	overlayMusicVolume = 50

let openOverlaySettings = function() {
	hideAllContents()
	if(!overlaySettingsOpen) {
		document.querySelector('#content_overlays').style.display = 'block'
		overlaySettingsOpen = true;
	} else {
		overlaySettingsOpen = false;
		if(openChannelId.length > 0) {
			document.querySelector('#content_cockpit').style.display = 'block'
		} else {
			document.querySelector('#content_follows').style.display = 'block'
		}
	}
}

overlaySettingsPlaylistElement.value = overlayMusicPlaylist
overlaySettingsPlaylistElement.addEventListener('keyup', (e) => {
	overlayMusicPlaylist = overlaySettingsPlaylistElement.value
	if(e.which == 13) {
		window.localStorage.setItem('overlay_music_playlist', overlayMusicPlaylist)
		broadcastWsMessage('music_playlist=' + overlayMusicPlaylist)
	}
})
overlaySettingsVolumeElement.value = overlayMusicVolume
overlaySettingsVolumeElement.addEventListener('change', (e) => {
	window.localStorage.setItem('overlay_music_volume', overlaySettingsVolumeElement.value)
})
overlaySettingsVolumeControlElement.value = overlayMusicVolume
overlaySettingsVolumeControlElement.addEventListener('change', (e) => {
	broadcastWsMessage('live_music_volume=' + overlaySettingsVolumeControlElement.value)
})

document.querySelector('#overlay_music_url').value = 'http://localhost:' + overlayport + '/music.html'
document.querySelector('#overlay_music_volume_control_url').value = 'http://localhost:' + overlayport + '/send?music_volume=50'


let disableOverlayHotkeys = function() {
	globalShortcut.unregisterAll()
}

let renewOverlayHotkeys = function() {
	globalShortcut.unregisterAll()
	let hotkeys = document.querySelector('#overlay_hotkeys').querySelectorAll('hotkey')
	let hotkeyStorage = []
	for(let i = 0; i < hotkeys.length; i++) {
		let accelerator = hotkeys[i].querySelector('.hotkeyaccelerator').value
		let command = hotkeys[i].querySelector('.hotkeycommand').value

		if(accelerator.length > 0 && command.length > 0) {
			globalShortcut.register(accelerator, () => { broadcastWsMessage(command) })
			hotkeyStorage.push({accelerator: accelerator, cmd: command})
		}
	}
	window.localStorage.setItem('overlay_hotkeys', JSON.stringify(hotkeyStorage))
}
riot.mount(document.querySelector('#overlay_hotkeys'), {'localstorage': window.localStorage})