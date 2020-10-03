const { ipcRenderer, shell } = require('electron');

Object.assign(window, {
	openLinkExternal: function(url: string) {
		if(url.startsWith('https://') && document.location.href.startsWith('file://')) {
			shell.openExternal(url);
		}
	},
	loadTTVSTCSS: function() {
		ipcRenderer.invoke('render-sass').then((css) => {
			document.querySelector('#stylesheet').innerHTML = css;
		});
	},
	getAppVersion: function() {
		ipcRenderer.invoke('get-app-version').then((version) => {
			(document.querySelector('#appversion') as HTMLSpanElement).innerText = version;
		});
	}
})