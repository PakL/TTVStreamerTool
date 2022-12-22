import Page from '../UI/Page';
import { ipcRenderer } from 'electron';

import * as Settings from '../Settings';
import * as Helix from '../../main/Twitch/APIHelixTypes';
import Broadcast from '../Broadcast';

import * as riot from 'riot';

import StartpageCmp, * as StartpageComp from '../UI/Startpage/Startpage';
import { IStatusObject } from '../../main/Pages/StartpageTypes';

import _ttvst from '../TTVST';
declare var TTVST: _ttvst;

class Startpage extends Page {

	lastHelixFailedRequests: number = 0;
	helixFailedRequestsInRow: number = 0;

	startpage: StartpageComp.Component = null;

	constructor() {
		super('Startpage');
		this.onLogin = this.onLogin.bind(this);
		this.onLogout = this.onLogout.bind(this);

		this.onStatusUpdate = this.onStatusUpdate.bind(this);

		let loginOnStartup = Settings.getBoolean('ttvst.global.loginonstartup', true);
		if(loginOnStartup) {
			let token = this.getToken();
			this.validateAndGetUserInfo(token).catch((e) => {
				console.error(e);
			});
		}

		Broadcast.instance.on('cockpit.status', this.onStatusUpdate);
		Broadcast.instance.emit('startpage-ready');
	}

	get icon(): string {
		return 'Home';
	}

	private getToken(): string {
		let token = Settings.getString('ttvst.global.twitch_token', '', false, true);
		if(token.length <= 0) {
			// check on old token
			token = Settings.getString('tw_auth_token', '');
			if(token.length > 0) {
				Settings.setString('ttvst.global.twitch_token', token, false, true);
				localStorage.removeItem('tw_auth_token');
			}
		}
		return token;
	}

	async onLogin() {
		let token = this.getToken();
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
		Settings.setString('ttvst.global.twitch_token', '', false, true);
	}

	async validateAndGetUserInfo(token: string): Promise<boolean> {
		if(typeof(token) !== 'string' || token.length <= 0) return false;

		let scopes = Settings.getJSON('ttvst.global.scope', [])
		if(scopes.indexOf('moderator:manage:announcements') < 0) {
			TTVST.ui.alert(TTVST.i18n.__('Sorry to interrupt! Twitch has made some changes which forces us to get more permissions from you in order for us to provide you with the full functionality of our application. Please consider logging out and back in to renew your Twitch login with the added permissions.'), 'Outdated login token', 'UserWarning');
		}

		let validation: Helix.IAPIHelixValidation = await ipcRenderer.invoke('cockpit.check-login', token);
		if(typeof(validation.login) === 'string') {
			Settings.setString('ttvst.global.twitch_token', token, false, true);
			let users: Helix.IAPIHelixUserList = await ipcRenderer.invoke('cockpit.get-user');
			if(users.data.length >= 1) {
				let user = users.data[0];
				this.startpage.updateLogin({ waiting: false, loggedin: true, loginName: user.display_name, avatarUrl: user.profile_image_url });
				ipcRenderer.send('cockpit.tmi.connect');
				ipcRenderer.send('cockpit.pubsub.connect');
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
			let startpageCmpnt = riot.component(StartpageCmp);
			this.startpage = startpageCmpnt(document.createElement('Startpage'));
			this.startpage.setLoginCallback(this.onLogin);
			this.startpage.setLogoutCallback(this.onLogout);
		}
		return this.startpage.root;
	}
}

export = Startpage;