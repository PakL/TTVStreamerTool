const { ipcRenderer } = require('electron');

Object.assign(window, {
	openLinkExternal: function(url: string) {
		if(url.startsWith('https://') && document.location.href.startsWith('file://')) {
			ipcRenderer.invoke('open-external', url);
		}
	},
	loadTTVSTCSS: function() {
		ipcRenderer.invoke('render-sass').then((css) => {
			document.querySelector('#stylesheet').innerHTML = css;
		});
	},
	getAppVersion: function() {
		ipcRenderer.invoke('get-app-version').then((versions) => {
			let [app, electron, chrome, node] = versions;
			(document.querySelector('#appversion') as HTMLSpanElement).innerText = app;
			(document.querySelector('#electronversion') as HTMLSpanElement).innerText = electron;
			(document.querySelector('#nodeversion') as HTMLSpanElement).innerText = node;
			(document.querySelector('#chromeversion') as HTMLSpanElement).innerText = chrome;
			
		});
	}
})