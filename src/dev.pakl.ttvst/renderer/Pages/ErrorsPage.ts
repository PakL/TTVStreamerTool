import { ipcRenderer } from 'electron';
import Page from '../UI/Page';

import _ttvst from '../TTVST';
declare var TTVST: _ttvst;

class ErrorsPage extends Page {

	private errorDocElement: HTMLDivElement;
	private loading: boolean = false;

	constructor() {
		super('Errors');
	}

	get icon(): string {
		return 'TextDocument';
	}

	content(): any {
		let mainElement = document.createElement('div');
		mainElement.style.padding = '20px';

		let refreshButton = document.createElement('button');
		refreshButton.innerText = TTVST.i18n.__('Refresh');
		refreshButton.onclick = (() => {
			this.refreshErrorLog();
		}).bind(this);
		let openFolderButton = document.createElement('button');
		openFolderButton.style.marginLeft = '5px';
		openFolderButton.innerText = TTVST.i18n.__('Open log folder');
		openFolderButton.onclick = (() => {
			this.onOpenErrorFolder();
		}).bind(this);

		this.errorDocElement = document.createElement('div');
		this.errorDocElement.style.fontFamily = 'monospace';
		this.errorDocElement.style.whiteSpace = 'pre-wrap';
		this.errorDocElement.style.marginTop = '10px';

		mainElement.appendChild(refreshButton);
		mainElement.appendChild(openFolderButton);
		mainElement.appendChild(this.errorDocElement);

		return mainElement;
	}

	async refreshErrorLog() {
		if(this.loading) return;
		this.loading = true;
		try {
			let errDoc = await ipcRenderer.invoke('get-error-log');
			if(errDoc.length == 0) {
				errDoc = 'Error log is empty. This is a good thing.';
			}
			this.errorDocElement.innerText = errDoc;
		} catch(e) {
			console.error(e);
		}
		this.loading = false;
	}

	async onOpenErrorFolder() {
		ipcRenderer.send('open-error-log-folder');
	}

	open() {
		this.refreshErrorLog();
	}

	close() {
		this.errorDocElement.innerHTML = '';
	}

}

export = ErrorsPage;