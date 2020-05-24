import Page from '../UI/Page';
import { ipcRenderer, IpcRendererEvent } from 'electron';

import * as Settings from '../Settings';
import * as Helix from '../../main/Twitch/APIHelixTypes';


import * as riot from 'riot';

import StartpageCmp from '../../../../dist/dev.pakl.ttvst/renderer/UI/Startpage/Startpage';

class Startpage extends Page {

	lastHelixFailedRequests: number = 0;
	helixFailedRequestsInRow: number = 0;

	startpage: riot.RiotComponent = null;

	constructor() {
		super('Startpage');
		this.onLogin = this.onLogin.bind(this);
	}

	get icon(): string {
		return 'Home';
	}

	onLogin() {
		console.log('Login');
	}

	content(): HTMLElement {
		if(this.startpage === null) {
			let startpageCmpnt = riot.component<null, null>(StartpageCmp);
			this.startpage = startpageCmpnt(document.createElement('Startpage'));
			this.startpage.setLoginCallback(this.onLogin);
		}
		return this.startpage.root;
	}
}

export = Startpage;