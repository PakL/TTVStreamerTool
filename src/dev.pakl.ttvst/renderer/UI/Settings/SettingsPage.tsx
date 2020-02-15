import Page from '../Page';
import * as React from 'react';
import _ttvst from '../../TTVST';

import SettingsSet from './SettingsSetComponent';
import { ISettingsProps } from './SettingsComponent';
import { Icon } from 'office-ui-fabric-react';

declare var TTVST: _ttvst;

interface ISettingsSetDef {
	title: string;
	settings: Array<ISettingsProps>;
}

class SettingsPage extends Page {
	
	private settingsSets: Array<ISettingsSetDef> = [];

	constructor() {
		super('Settings');

		this.__ = TTVST.i18n.__.bind(TTVST.i18n);

		this.settingsSets.push({
			title: this.__('Application'),
			settings: [
				{ setting: 'language', label: this.__('Language'), type: 'select', selection: [{ key: 'en', text: 'English' }, { key: 'de', text: 'Deutsch' }], default: 'en', description: '' },
				{ setting: 'debug-enabled', label: this.__('Debug logging enabled'), type: 'checkbox', default: false, description: this.__('Enabling will result in a higher memory usage. This is only for debugging purposes.') }
			]
		});
		this.settingsSets.push({
			title: this.__('Cockpit options'),
			settings: [
				{ setting: 'autorecovermessages', label: this.__('Autorecover deleted messages'), type: 'checkbox', default: false, description: '' },
				{ setting: 'showlocalizednames', label: this.__('Show localized display names'), type: 'checkbox', default: true, description: '' },
				{ setting: 'colorlessnames', label: this.__('Do not use different colors for user names in chat'), type: 'checkbox', default: false, description: '' },
				{ setting: 'showviewerlist', label: this.__('Show viewer list'), type: 'checkbox', default: true, description: '' },
				{ setting: 'showactionstream', label: this.__('Show action stream'), type: 'checkbox', default: true, description: '' },
				{ setting: 'showviewersamount', label: this.__('Show amount of viewers'), type: 'checkbox', default: true, description: '' },
				{ setting: 'classicchat', label: this.__('Classic chat'), type: 'checkbox', default: false, description: this.__('Instead of positioning messages below the username and aligning badges to the right, this mode will give you a more classic twitch look, with badges in front of usernames and messages direcly inline.') },
				{ setting: 'chattotop', label: this.__('Show newest messages on top'), type: 'checkbox', default: false, description: this.__('Instead of adding new messages to the bottom, new messages will be added to the top of chat.') },
				{ setting: 'embedchat', label: this.__('Embed chat'), type: 'checkbox', default: false, description: this.__('Embed the orginal twitch chat instead of using the build in one. Some features will not work, like filters, custom emote addons, highlights, etc.') }
			]
		});
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Settings" />;
	}

	get showInViewsList() {
		return false;
	}

	content(): React.SFCElement<any> | React.SFCElement<any>[] {
		return (<div style={{ padding: 10 }}>
					{this.settingsSets.map((set: ISettingsSetDef) => (
						<SettingsSet key={set.title} {...set} />
					))}
				</div>);
	}

}

export = SettingsPage;