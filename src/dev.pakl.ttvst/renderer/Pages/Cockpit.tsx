import Page from '../UI/Page';
import * as React from 'react';

import { Icon } from 'office-ui-fabric-react';

import Startpage from './Startpage';


class Cockpit extends Page {

	static get PAGE_STARTPAGE() { return 'startpage'; };


	private view: string = Cockpit.PAGE_STARTPAGE;
	private startpage: Startpage = null;

	constructor() {
		super('Cockpit');

		this.startpage = new Startpage();
	}

	get icon(): React.ReactElement {
		return <Icon iconName="Home" />;
	}
	
	content(): React.SFCElement<any> {
		if(this.view === Cockpit.PAGE_STARTPAGE) {
			return this.startpage.content();
		}
		return <React.Fragment />;
	}

}

export = Cockpit;