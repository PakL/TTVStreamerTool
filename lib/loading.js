let loadingElement = null
var startLoading = function() {
	if(loadingElement != null) return

	loadingElement = document.createElement('modal')
	loadingElement.innerHTML = '<img src="res/hourglass.gif" alt="" />'

	document.getElementsByTagName('body')[0].appendChild(loadingElement)
	riot.mount(loadingElement)
}

var stopLoading = function() {
	if(loadingElement == null) return
	loadingElement.parentElement.removeChild(loadingElement)
	loadingElement = null
}