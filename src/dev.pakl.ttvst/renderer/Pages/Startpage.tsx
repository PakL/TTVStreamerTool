import Page from '../UI/Page';
import * as React from 'react';
import { ipcRenderer, IpcRendererEvent } from 'electron';

import * as Settings from '../Settings';
import * as Helix from '../../main/Twitch/APIHelixTypes';

import LoginComponent from '../UI/Cockpit/LoginComponent';
import CockpitControlComponent from '../UI/Cockpit/CockpitControlComponent';

import { Stack, IStackTokens, Icon } from 'office-ui-fabric-react';


let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

class Startpage extends Page {

	loginComp: LoginComponent = null;

	tmiControl: CockpitControlComponent = null;
	apiControl: CockpitControlComponent = null;
	ovlControl: CockpitControlComponent = null;
	wstControl: CockpitControlComponent = null;

	lastHelixFailedRequests: number = 0;
	helixFailedRequestsInRow: number = 0;

	constructor() {
		super('Startpage');

		this.setLoginRef = this.setLoginRef.bind(this);
		this.onLoginPress = this.onLoginPress.bind(this);
		this.onLogoutPress = this.onLogoutPress.bind(this);
		this.performLogin = this.performLogin.bind(this);
		this.setTMIControl = this.setTMIControl.bind(this);
		this.setAPIControl = this.setAPIControl.bind(this);
		this.setOverlayControl = this.setOverlayControl.bind(this);
		this.setWSControl = this.setWSControl.bind(this);

		ipcRenderer.send('Startpage.on', 'tmi.statusUpdate');
		this.onTMIStatusUpdate = this.onTMIStatusUpdate.bind(this);
		ipcRenderer.on('Startpage.tmi.statusUpdate', this.onTMIStatusUpdate);

		ipcRenderer.send('TwitchHelix.on', 'statusUpdate');
		this.onHelixStatusUpdate = this.onHelixStatusUpdate.bind(this);
		ipcRenderer.on('TwitchHelix.statusUpdate', this.onHelixStatusUpdate);
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Home" />;
	}

	content(): React.SFCElement<any> {
		return (
			<React.Fragment>
				<LoginComponent ref={this.setLoginRef} />
				<Stack key="cockpit_controls_r1" tokens={sectionStackTokens} horizontal>
					<CockpitControlComponent
						header={this.__('Twitch Messaging Interface (TMI)')}
						iconName="CannedChat"
						startingStatus={this.__('Unkown status.')}
						startingCondition="warn"
						ref={this.setTMIControl}
					/>
					<CockpitControlComponent
						header={this.__('Twitch API')}
						iconName="Accounts"
						startingStatus={this.__('Unkown status.')}
						startingCondition="warn"
						ref={this.setAPIControl}
					/>
				</Stack>
				<Stack key="cockpit_controls_r2" tokens={sectionStackTokens} horizontal>
					<CockpitControlComponent
						header={this.__('Overlay Service')}
						iconName="MapLayers"
						startingStatus={this.__('Unkown status.')}
						startingCondition="warn"
						ref={this.setOverlayControl}
					/>
					<CockpitControlComponent
						header={this.__('Overlay Command Socket')}
						iconName="Remote"
						startingStatus={this.__('Unkown status.')}
						startingCondition="warn"
						ref={this.setWSControl}
					/>
				</Stack>
			</React.Fragment>
		);
	}

	async setLoginRef(logincomp: LoginComponent) {
		if(this.loginComp !== null) return;
		this.loginComp = logincomp;
		this.loginComp.onLogin(this.onLoginPress);
		this.loginComp.onLogout(this.onLogoutPress);

		await this.performLogin();
	}

	async onLoginPress() {
		try {
			let token: string = await ipcRenderer.invoke('cockpit-login');

			Settings.setString('tw_auth_token', token);
			this.performLogin();
		} catch(e) {
			console.error(e);
			//TODO:empty catch
		}
	}

	async onLogoutPress() {
		try {
			await ipcRenderer.invoke('cockpit-logout');

			Settings.setString('tw_auth_token', '');
			this.performLogin();
		} catch(e) {
			//TODO:empty catch
		}
	}

	async performLogin() {
		if(this.loginComp === null) return;
		let token = Settings.getString('tw_auth_token', '');
		if(token.length > 0) {
			let validate: Helix.IAPIHelixValidation = await ipcRenderer.invoke('cockpit-check-login', token);
			if(validate !== null) {
				let user: Helix.IAPIHelixUserList = await ipcRenderer.invoke('cockpit-get-user');
				if(user !== null) {
					let tuser = user.data[0];
					this.loginComp.setState({ imageUrl: tuser.profile_image_url, username: tuser.display_name, text: 'Logged in. Welcome back!', loggedIn: true });
					ipcRenderer.send('connect-tmi');
					return;
				}
			}
		}
		this.loginComp.setState({ imageUrl: '', username: 'Not logged in', text: 'Please log in to twitch to use the TTVStreamerTool to its full potential.', loggedIn: false });
	}

	async setTMIControl(control: CockpitControlComponent) {
		if(this.tmiControl !== null) return;
		this.tmiControl = control;
	}
	async setAPIControl(control: CockpitControlComponent) {
		if(this.apiControl !== null) return;
		this.apiControl = control;
	}
	async setOverlayControl(control: CockpitControlComponent) {
		if(this.ovlControl !== null) return;
		this.ovlControl = control;
	}
	async setWSControl(control: CockpitControlComponent) {
		if(this.wstControl !== null) return;
		this.wstControl = control;
	}

	onTMIStatusUpdate(event: IpcRendererEvent, status: string) {
		if(this.tmiControl === null) return;
		switch(status) {
			case 'ready':
				this.tmiControl.setState({ condition: 'warn', status: 'Connection successful. Authenticating...' });
				break;
			case 'registered':
				this.tmiControl.setState({ condition: 'good', status: 'Connected and logged in.'});
				break;
			case 'auth-failed':
				this.tmiControl.setState({ condition: 'warn', status: 'Authentication failed.'});
				break;
			case 'closed-due-to-error':
				this.tmiControl.setState({ condition: 'bad', status: 'Connection closed due to an error. Check log for details.'});
				break;
			case 'closed':
				this.tmiControl.setState({ condition: 'bad', status: 'Connection was closed properly.'});
				break;
		}
	}

	onHelixStatusUpdate(event: IpcRendererEvent, totalRequests: number, failedRequests: number, avgTime: number) {
		let condition = 'good';

		if(failedRequests > this.lastHelixFailedRequests) {
			condition = 'warn';
			this.helixFailedRequestsInRow++;
			if(this.helixFailedRequestsInRow >= 3) {
				condition = 'bad';
			}
		} else {
			this.helixFailedRequestsInRow = 0;
		}

		if(avgTime > 5000 && condition == 'good') {
			condition = 'warn';
		}

		let status = `Total requests: ${totalRequests}. Failed requests: ${failedRequests}. Current average response time: ${avgTime}ms`;

		this.apiControl.setState({ condition, status });
	}

}

export = Startpage;