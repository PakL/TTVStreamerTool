const http = require('http')
const electron = require('electron')
const BrowserWindow = electron.remote.BrowserWindow

let logindialog = document.querySelector('#logindialog')
let loginbutton = null
let authwindow = null;
let authresponseserver = null;

var auth = function() {
	loginbutton = document.querySelector('#starttwitchauth')
	loginbutton.innerText = 'Bitte warten...'
	authresponseserver = http.createServer((req, resp) => {
		var response = "<!DOCTYPE html>\r\n<html><head><meta charset=\"utf-8\"><title>OAUTH RESPONSE</title></head><body>This should only be visible for a second...</body></html>"
		resp.writeHead(200, {'Content-Length': response.length, 'Content-Type': 'text/html; charset=utf-8'})
		resp.end(response)
	})
	authresponseserver.on('error', (err) => {
		alert(err.message)
		if(authwindow != null) authwindow.close()
		authresponseserver.close()
		authresponseserver = null
	})
	authresponseserver.on('close', () => { authresponseserver = null })
	authresponseserver.listen(8086, () => {
		loginbutton.innerText = 'Loginfenster öffnet sich...'
		var url = twitchapi.getAuthImplicitGrantFlowUrl()
		authwindow = new BrowserWindow({ width: 400, height: 500, show: false, 'node-integration': false, webPreferences: { sandbox: true } })
		authwindow.loadURL(url)
		authwindow.on('page-title-updated', authtitlechange)
		authwindow.show()
		authwindow.on('closed', () => {
			authwindow = null
			if(authresponseserver != null) {
				authresponseserver.close()
				authresponse({})
			}
		})
	})
}

var authtitlechange = function(event, title) {
	if(title == 'OAUTH RESPONSE') {
		var url = authwindow.webContents.getURL()

		authresponseserver.close()
		authwindow.close()

		var hashindex = url.lastIndexOf('#')
		if(hashindex > 0) {
			var hashstr = url.substring(hashindex+1)
			var hashargs = hashstr.split('&')
			var hash = {}
			for(var i = 0; i < hashargs.length; i++) {
				var kv = hashargs[i].split('=', 2)
				var k = kv[0]
				var v = decodeURIComponent(kv[1])
				hash[k] = v
			}
			authresponse(hash)
		}
	}
}

var authresponse = function(hash) {
	if(typeof(hash.access_token) != 'undefined' && typeof(hash.state) != 'undefined') {
		if(twitchapi.verifyState(hash.state)) {
			loginbutton.innerText = i18n.__('Logged in')
			twitchapi.setAuthToken(hash.access_token)
			continueafterauth()
		} else {
			loginbutton.innerText = i18n.__('Invalid token')
		}
	} else {
		loginbutton.innerText = i18n.__('Canceled by user')
	}
}

var continueafterauth = function() {
	if(twitchapi.isLoggedIn()) {
		logindialog.style.display = 'none'

		twitchapi.getUser('', (res, err) => {
			if(res != null && res.hasOwnProperty('_id')) {
				document.querySelector('#content_follows').style.display = 'block'
				loadMoreFollows(true)
				twitchchat = new Chat(res.name, twitchapi.token)
			} else if(err != null) {
				showErrorMessage(err)
			}
		})
	}
}

riot.mount(logindialog)
continueafterauth()