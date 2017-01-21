const http = require('http')

var loginbutton = document.getElementById('starttwitchauth')

var auth = function() {
	loginbutton.innerText = 'Please wait...'
	http.createServer((request, response) => {

	}).listen(8086, () => {
		loginbutton.innerText = 'Login window will open...'
		window.open()
	})
}