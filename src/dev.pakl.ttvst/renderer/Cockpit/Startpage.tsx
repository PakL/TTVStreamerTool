import Page from '../UI/Page';
import * as React from 'react';

import LoginComponent from '../UI/Cockpit/LoginComponent';
import CockpitControlComponent from '../UI/Cockpit/CockpitControlComponent';

import { Stack, IStackTokens } from 'office-ui-fabric-react';


let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };

class Startpage extends Page {

	constructor() {
		super('');
	}

	content(): React.SFCElement<any> {
		return (
			<React.Fragment>
				<LoginComponent />
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

}

export = Startpage;