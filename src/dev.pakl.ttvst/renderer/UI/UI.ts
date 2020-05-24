import { ipcRenderer } from 'electron';
import * as riot from 'riot';

import App from '../../../../dist/dev.pakl.ttvst/renderer/UI/Main/App';

import i18n from 'i18n-nodejs';

import TTVST from '../TTVST';
import * as Color from './ColorFunctions';

import Page from './Page';

let accentColor: string = ipcRenderer.sendSync('request-accent-color');
let accentBrightness = Color.getBrightness(Color.hexToRGB(accentColor));
while(Color.hexToLuma(accentColor) < 0.6) {
	accentBrightness++;
	accentColor = Color.rgbToHex(Color.setBrightness(Color.hexToRGB(accentColor), accentBrightness));
}
let steps = Math.floor((100 - accentBrightness) / 5);
let accentColorRGB = Color.hexToRGB(accentColor);

class UI {

	private tool: TTVST;
	
	private pages: Array<Page> = [];

	private _openPage: Page = null;

	private root: HTMLElement = null;
	private app: riot.RiotComponent<null, null> = null;

	constructor(tool: TTVST) {
		this.tool = tool;

		let appCmpnt = riot.component<null, null>(App);
		this.app = appCmpnt(document.createElement('App'));

		this.root = document.querySelector('#root');
		this.root.appendChild(this.app.root);
	}


	openPage(page: string) {
		this.pages.forEach((p: Page) => {
			if(p.name === page) {
				if(this._openPage !== null) {
					this._openPage.close();
				}
				this._openPage = p;
				p.open();
			}
		});

		if(this.app !== null) {
			this.app.openPage(page);
		}
	}


	addPage(page: Page, bottom: boolean = false) {
		this.pages.push(page);
		if(this.app !== null) {
			this.app.addPage(page, bottom);
			if(this.pages.length == 1) {
				this.openPage(this.pages[0].name);
			}
		}
	}

	getPage(pagename: string): Page {
		for(let i = 0; i < this.pages.length; i++) {
			if(this.pages[i].name === pagename) {
				return this.pages[i];
			}
		}
		return null;
	}

}
export = UI;