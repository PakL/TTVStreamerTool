var showErrorMessage = function(error) {
	stopLoading() // Stop loading
	if(!error.hasOwnProperty('message')) error = new Error(i18n.__('Unkown error'))
	console.dir(error)
	var modal = document.createElement('modal')
	modal.inenrHTML = error.message.replace('<', '&gt;').replace('>', '&lt;').replace('\n', '<br>')
	modal.onclick = function() {
		this.parentElement.removeChild(this)
	}
	modal.style.cursor = 'pointer'

	document.getElementsByTagName('body')[0].appendChild(modal)
	riot.mount(modal)
}