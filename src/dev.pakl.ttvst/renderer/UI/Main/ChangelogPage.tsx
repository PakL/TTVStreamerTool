import Page from '../Page';
import * as React from 'react';
import _ttvst from '../../TTVST';

import { Icon } from 'office-ui-fabric-react';

declare var TTVST: _ttvst;

const nodeIntegrationTrue: any = 'true';

class ChangelogPage extends Page {

	constructor() {
		super('Changelog');

		this.__ = TTVST.i18n.__.bind(TTVST.i18n);
	}

	get icon(): React.ReactElement {
		return <Icon iconName="News" />;
	}

	get showInViewsList() {
		return false;
	}

	content(): React.SFCElement<any> {
		return (
			<webview src="changelog.html" nodeintegration={nodeIntegrationTrue} style={{ width: '100%', height: '100%' }} />
		)
	}

}

export = ChangelogPage;