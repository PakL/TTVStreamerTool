const consoleLogHolder = window.console.log;
let enableDebug = function(enable) {
	if(enable) {
		window.console.log = consoleLogHolder
	} else {
		window.console.log = function(){}
	}
}

let item = window.localStorage.getItem('debug-enabled')
if(item != null && item == 'true') {
	enableDebug(true)
} else {
	enableDebug(false)
}