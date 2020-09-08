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
		frame.setAttribute('src', 'about.html');
		frame.setAttribute('nodeintegration', 'true');
		frame.setAttribute('enableremotemodule', 'false');
		frame.style.width = '100%';
		frame.style.height = '100%';
		frame.style.border = '0';
		return frame;
	}

	open() {
		(document.querySelector(`#contentWrapper > div[data-name="About TTVST"] > webview`) as Electron.WebviewTag).setZoomFactor(1);
	}

}

export = AboutPage;