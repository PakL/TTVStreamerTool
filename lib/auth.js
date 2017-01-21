const http = require('http')
const electron = require('electron')
const BrowserWindow = electron.remote.BrowserWindow

let loginbutton = document.getElementById('starttwitchauth')
let authwindow = null;
let authresponseserver = null;

var auth = function() {
	loginbutton.innerText = 'Please wait...'
	authresponseserver = http.createServer((req, resp) => {
		var response = "<!DOCTYPE html>\r\n<html><head><meta charset=\"utf-8\"><title>OAUTH RESPONSE</title></head><body>This should only be visible for a second...</body></html>"
		resp.writeHead(200, {"Content-Length": response.length, "Content-Type": "text/html; charset=utf-8"})
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
		loginbutton.innerText = 'Login window will open...'
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
				var v = kv[1]
				hash[k] = v
			}
			authresponse(hash)
		}
	}
}

var authresponse = function(hash) {
	if(typeof(hash.access_token) != "undefined" && typeof(hash.state) != "undefined") {
		if(twitchapi.verifyState(hash.state)) {
			loginbutton.innerText = 'Logged in'
		} else {
			loginbutton.innerText = 'Invalid token'
		}
	} else {
		loginbutton.innerText = 'Canceled by user'
	}
}

loginbutton.onclick = auth