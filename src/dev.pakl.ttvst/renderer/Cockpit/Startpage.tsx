import Page from '../UI/Page';
import * as React from 'react';
import { ipcRenderer } from 'electron';

import * as Settings from '../Settings';
import * as Helix from '../../main/Twitch/APIHelixTypes';

import LoginComponent from '../UI/Cockpit/LoginComponent';
import CockpitControlComponent from '../UI/Cockpit/CockpitControlComponent';

import { Stack, IStackTokens } from 'office-ui-fabric-react';


let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

class Startpage extends Page {

	loginComp: LoginComponent = null;

	constructor() {
		super('');

	}

	content(): React.SFCElement<any> {
		return (
			<React.Fragment>
				<LoginComponent ref={this.setLoginRef.bind(this)} />
				<Stack key="cockpit_controls_r1" tokens={sectionStackTokens} horizontal>
					<CockpitControlComponent
						header={this.__('Twitch Messaging Interface (TMI)')}
						iconName="CannedChat"
						startingStatus={this.__('TMI is available. Waiting for authentication.')}
						startingCondition="warn"
					/>
					<CockpitControlComponent
						header=""
						iconName="Accounts"
						startingStatus=""
						startingCondition="warn"
					/>
				</Stack>
				<Stack key="cockpit_controls_r2" tokens={sectionStackTokens} horizontal>
					<CockpitControlComponent
						header={this.__('Overlay Service')}
						iconName="MapLayers"
						startingStatus={this.__('Running and listening to port {{port}}.', { port: '8090' })}
						startingCondition="good"
					/>
					<CockpitControlComponent
						header={this.__('Overlay Command Socket')}
						iconName="Remote"
						startingStatus={this.__('Failed to bind port {{port}}.', { port: '8091' })}
						startingCondition="bad"
					/>
				</Stack>
			</React.Fragment>
		);
	}

	async setLoginRef(logincomp: LoginComponent) {
		if(this.loginComp !== null) return;
		this.loginComp = logincomp;

		let token = Settings.getString('tw_auth_token', '');
		if(token.length > 0) {

			let validate: Helix.IAPIHelixValidation = await ipcRenderer.invoke('cockpit-check-login', token);
			if(validate !== null) {
				let user: Helix.IAPIHelixUserList = await ipcRenderer.invoke('cockpit-get-user');
				if(user !== null) {
					let tuser = user.data[0];
					this.loginComp.setState({ imageUrl: tuser.profile_image_url, username: tuser.display_name, text: 'Logged in. Welcome back!', loggedIn: true });
					return;
				}
			}
		}
		this.loginComp.setState({ imageUrl: '', username: 'Not logged in', text: 'Please log in to twitch to use the TTVStreamerTool to its full potential.', loggedIn: false });
	}

}

export = Startpage;