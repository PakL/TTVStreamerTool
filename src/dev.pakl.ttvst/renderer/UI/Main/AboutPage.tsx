import Page from '../Page';
import * as React from 'react';
import _ttvst from '../../TTVST';

import { Icon } from 'office-ui-fabric-react';

declare var TTVST: _ttvst;

const nodeIntegrationTrue: any = 'true';

class AboutPage extends Page {

	constructor() {
		super('About TTVST');

		this.__ = TTVST.i18n.__.bind(TTVST.i18n);
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Unknown" />;
	}

	get showInViewsList() {
		return false;
	}

	content(): React.SFCElement<any> {
		return (
			<webview src="about.html" nodeintegration={nodeIntegrationTrue} style={{ width: '100%', height: '100%' }} />
		)
	}

}

export = AboutPage;