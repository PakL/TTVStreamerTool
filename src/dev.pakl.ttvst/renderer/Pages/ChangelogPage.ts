import { ipcRenderer } from 'electron';
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
		frame.setAttribute('src', 'about:blank');
		frame.setAttribute('preload', '../dist/view-helper.js');
		frame.style.width = '100%';
		frame.style.height = '100%';
		frame.style.border = '0';
		return frame;
	}

	open() {
		let webviewtag = (document.querySelector('#contentWrapper > div[data-name="Changelog"] > webview') as Electron.WebviewTag);
		webviewtag.setZoomFactor(1);
		webviewtag.setAttribute('src', 'changelog.html');
	}

	close() {
		let webviewtag = (document.querySelector('#contentWrapper > div[data-name="Changelog"] > webview') as Electron.WebviewTag);
		webviewtag.setAttribute('src', 'about:blank');
	}

}

export = ChangelogPage;