import Page from '../UI/Page';

class AboutPage extends Page {

	constructor() {
		super('About TTVST');
	}

	get icon(): string {
		return 'Unknown';
	}

	content(): any {
		let frame: Electron.WebviewTag = document.createElement('webview');
		frame.setAttribute('src', 'about:blank');
		frame.setAttribute('preload', '../dist/view-helper.js');
		frame.style.width = '100%';
		frame.style.height = '100%';
		frame.style.border = '0';
		return frame;
	}

	open() {
		let webviewtag = (document.querySelector('#contentWrapper > div[data-name="About TTVST"] > webview') as Electron.WebviewTag);
		webviewtag.setZoomFactor(1);
		webviewtag.setAttribute('src', 'about.html');
	}

	close() {
		let webviewtag = (document.querySelector('#contentWrapper > div[data-name="About TTVST"] > webview') as Electron.WebviewTag);
		webviewtag.setAttribute('src', 'about:blank');
	}

}

export = AboutPage;