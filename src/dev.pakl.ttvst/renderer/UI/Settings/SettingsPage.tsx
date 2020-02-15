import Page from '../Page';
import * as React from 'react';

import SettingsSet from './SettingsSetComponent';
import { Icon } from 'office-ui-fabric-react';


class SettingsPage extends Page {
	
	constructor() {
		super('Settings');
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Settings" />;
	}

	get showInViewsList() {
		return false;
	}

	content(): React.SFCElement<any> | React.SFCElement<any>[] {
		return [(
			<SettingsSet key="asd" title="Test" settings={[{
				setting: '___',
				default: 'abcd',
				type: 'text',
				label: 'Test Text',
				description: 'Test description'
			}]} />
		)];
	}

}

export = SettingsPage;