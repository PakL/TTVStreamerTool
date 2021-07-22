import Page from '../UI/Page';
import _ttvst from '../TTVST';

import * as riot from 'riot';

import SettingsMenu, * as SettingsMenuComp from '../UI/Settings/SettingsMenu';
import SettingsConfig from '../UI/Settings/SettingsConfiguration';
import { ISettingsSetProps } from '../UI/Settings/SettingsConfiguration';

declare var TTVST: _ttvst;

class SettingsPage extends Page {

	settingsCmpnt: SettingsMenuComp.Component = null;
	settings: Array<ISettingsSetProps> = [];

	constructor() {
		super('Settings');

		this.settings = this.settings.concat(SettingsConfig);
	}

	get icon(): any {
		return 'Settings';
	}

	content(): HTMLElement {
		let settCmpnt = riot.component(SettingsMenu);
		this.settingsCmpnt = settCmpnt(document.createElement('SettingsMenu'));

		this.settingsCmpnt.setSettings(this.settings);

		return this.settingsCmpnt.root;
	}

	addSettingsSet(settings: ISettingsSetProps) {
		this.settings.push(settings);
		this.settingsCmpnt.setSettings(this.settings);
	}

	update() {
		this.settingsCmpnt.update();
	}

}

export = SettingsPage;