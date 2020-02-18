import Page from '../Page';
import * as React from 'react';
import _ttvst from '../../TTVST';

import SettingsSet from './SettingsSetComponent';
import { ISettingsProps } from './SettingsComponent';
import { Icon } from 'office-ui-fabric-react';

import SettingsConfig from './SettingsConfiguration';

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

		this.settingsSets = SettingsConfig;
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Settings" />;
	}

	get showInViewsList() {
		return false;
	}

	content(): React.SFCElement<any> | React.SFCElement<any>[] {
		return this.settingsSets.map((set: ISettingsSetDef) => (
			<SettingsSet key={set.title} {...set} />
		));
	}

}

export = SettingsPage;