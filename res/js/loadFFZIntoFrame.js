window.addEventListener('load', () => {
	document.querySelector('html').classList.add('tw-root--theme-dark')

	var ffzScript = document.createElement('script')
	ffzScript.setAttribute('src', 'https://cdn.frankerfacez.com/static/script.min.js')
	document.querySelector('body').appendChild(ffzScript)
})