const { ipcRenderer, shell } = require('electron');

ipcRenderer.invoke('render-sass').then((css) => {
	document.querySelector('#stylesheet').innerHTML = css;
});

Object.assign(window, {
	openLinkExternal: function(url: string) {
		shell.openExternal(url)
	}
})