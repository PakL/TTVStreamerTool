import Page from '../UI/Page';
import _ttvst from '../TTVST';

import * as riot from 'riot';

import SettingsMenu from '../../../../dist/dev.pakl.ttvst/renderer/UI/Settings/SettingsMenu';
import SettingsConfig from '../UI/Settings/SettingsConfiguration';

declare var TTVST: _ttvst;

class SettingsPage extends Page {

	settings: riot.RiotComponent = null;

	constructor() {
		super('Settings');
	}

	get icon(): any {
		return 'Settings';
	}

	content(): HTMLElement {
		let settCmpnt = riot.component<null, null>(SettingsMenu);
		this.settings = settCmpnt(document.createElement('SettingsMenu'));

		this.settings.setSettings(SettingsConfig);

		return this.settings.root;
	}

}

export = SettingsPage;