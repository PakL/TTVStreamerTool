import Page from '../UI/Page';

class ChangelogPage extends Page {

	constructor() {
		super('Changelog');
	}

	get icon(): string {
		return 'News';
	}

	content(): any {
		let frame: Electron.WebviewTag = document.createElement('webview');
		frame.setAttribute('src', 'changelog.html');
		frame.setAttribute('nodeintegration', 'true');
		frame.setAttribute('enableremotemodule', 'false');
		frame.style.width = '100%';
		frame.style.height = '100%';
		frame.style.border = '0';
		return frame;
	}

	open() {
		(document.querySelector(`#contentWrapper > div[data-name="Changelog"] > webview`) as Electron.WebviewTag).setZoomFactor(1);
	}

}

export = ChangelogPage;