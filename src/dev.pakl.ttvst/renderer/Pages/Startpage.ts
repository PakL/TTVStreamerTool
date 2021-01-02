import Page from '../UI/Page';
import { ipcRenderer } from 'electron';

import * as Settings from '../Settings';
import * as Helix from '../../main/Twitch/APIHelixTypes';
import Broadcast from '../Broadcast';

import * as riot from 'riot';

import StartpageCmp from '../../../../dist/dev.pakl.ttvst/renderer/UI/Startpage/Startpage';
import { IStatusObject } from '../../main/Pages/StartpageTypes';



class Startpage extends Page {

	lastHelixFailedRequests: number = 0;
	helixFailedRequestsInRow: number = 0;

	startpage: riot.RiotComponent = null;

	constructor() {
		super('Startpage');
		this.onLogin = this.onLogin.bind(this);
		this.onLogout = this.onLogout.bind(this);

		this.onStatusUpdate = this.onStatusUpdate.bind(this);

		/*let token = Settings.getString('tw_auth_token', '');
		this.validateAndGetUserInfo(token).catch((e) => {
			console.error(e);
		});*/

		Broadcast.instance.on('cockpit.status', this.onStatusUpdate);
		Broadcast.instance.emit('startpage-ready');
	}

	get icon(): string {
		return 'Home';
	}

	async onLogin() {
		let token = Settings.getString('tw_auth_token', '');
		try {
			if(await this.validateAndGetUserInfo(token)) {
				return;
			}
		} catch(e) {}

		try {

			token = await ipcRenderer.invoke('cockpit.login');
			if(token.length > 0) {
				await this.validateAndGetUserInfo(token);
			} else {
				this.startpage.updateLogin({ waiting: false });
			}
		} catch(e) {
			console.error(e);
			this.startpage.updateLogin({ waiting: false });
		}
	}

	async onLogout() {
		await ipcRenderer.invoke('cockpit.logout');
		Settings.setString('tw_auth_token', '');
	}

	async validateAndGetUserInfo(token: string): Promise<boolean> {
		if(typeof(token) !== 'string' || token.length <= 0) return false;

		let validation: Helix.IAPIHelixValidation = await ipcRenderer.invoke('cockpit.check-login', token);
		if(typeof(validation.login) === 'string') {
			Settings.setString('tw_auth_token', token);
			let users: Helix.IAPIHelixUserList = await ipcRenderer.invoke('cockpit.get-user');
			if(users.data.length >= 1) {
				let user = users.data[0];
				this.startpage.updateLogin({ waiting: false, loggedin: true, loginName: user.display_name, avatarUrl: user.profile_image_url });
				ipcRenderer.send('cockpit.tmi.connect');
				return true;
			}
		}
		return false;
	}

	onStatusUpdate(statusObject: IStatusObject) {
		if(this.startpage === null) return;
		this.startpage.updateStatus(statusObject);
	}

	content(): HTMLElement {
		if(this.startpage === null) {
			let startpageCmpnt = riot.component<null, null>(StartpageCmp);
			this.startpage = startpageCmpnt(document.createElement('Startpage'));
			this.startpage.setLoginCallback(this.onLogin);
			this.startpage.setLogoutCallback(this.onLogout);
		}
		return this.startpage.root;
	}
}

export = Startpage;