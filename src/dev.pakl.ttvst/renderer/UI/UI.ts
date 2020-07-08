import { ipcRenderer } from 'electron';
import * as riot from 'riot';

import App from '../../../../dist/dev.pakl.ttvst/renderer/UI/Main/App';
import Modal from '../../../../dist/dev.pakl.ttvst/renderer/UI/Main/Modal';

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

let modalCmpnt: any = null;

export interface IModalButton {
	key: string;
	title: string;
	callback?: () => boolean;
}

export default class UI {

	private tool: TTVST;
	
	private pages: Array<Page> = [];

	private _openPage: Page = null;

	private root: HTMLElement = null;
	private app: riot.RiotComponent<null, null> = null;

	private components: Array<riot.RiotComponent> = [];

	constructor(tool: TTVST) {
		this.tool = tool;

		const self = this;
		riot.install((comp: riot.RiotComponent<any, any>): riot.RiotComponent<any, any> => {
			self.registerComponent(comp);
			return comp;
		});

		let appCmpnt = riot.component<null, null>(App);
		this.app = appCmpnt(document.createElement('App'));

		modalCmpnt = riot.component<null, null>(Modal);

		this.root = document.querySelector('#root');
		this.root.appendChild(this.app.root);
	}

	registerComponent(component: riot.RiotComponent) {
		if(this.components.indexOf(component) < 0) {
			this.components.push(component);
		}
	}

	update() {
		for(let i = 0; i <this.components.length; i++) {
			this.components[i].update();
		}
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

	alert(message: string, title: string = '', icon: string = 'WarningSolid'): Promise<void> {
		return new Promise((res) => {
			let msgLines = message.split('\n');
			let content: Array<Node> = [];
			for(let i = 0; i < msgLines.length; i++) {
				content.push(document.createTextNode(msgLines[i]));
				if(i+1 < msgLines.length) {
					content.push(document.createElement('br'));
				}
			}

			let modal = document.createElement('Modal');
			let modalR: riot.RiotComponent = modalCmpnt(modal, {
				content,
				title,
				icon,
				buttons: [{ key: 'ok', title: 'OK' }],
				onclose: () => {
					res();
				}
			});

			document.querySelector('body').appendChild(modalR.root);
		});
	}

	confirm(message: string, yesno: boolean = false, title: string = '', icon: string = 'UnknownSolid'): Promise<boolean> {
		return new Promise((res) => {
			let msgLines = message.split('\n');
			let content: Array<Node> = [];
			for(let i = 0; i < msgLines.length; i++) {
				content.push(document.createTextNode(msgLines[i]));
				if(i+1 < msgLines.length) {
					content.push(document.createElement('br'));
				}
			}

			let modal = document.createElement('Modal');
			let response = false;
			let modalR: riot.RiotComponent = modalCmpnt(modal, {
				content,
				title,
				icon,
				buttons: [
					{ key: 'ok', title: yesno ? 'Yes' : 'OK', callback: () => { response = true; } },
					{ key: 'cancel', title: yesno ? 'No' : 'Cancel' }
				],
				onclose: () => {
					res(response);
				},
				hideOnOob: false
			});

			document.querySelector('body').appendChild(modalR.root);
		});
	}

	modal(content: Node | Array<Node>, title: string = '', icon: string, onclose?: () => void, buttons?: Array<IModalButton>, hideOnOob?: boolean): riot.RiotComponent {
		let modal = document.createElement('Modal');
		let modalR: riot.RiotComponent = modalCmpnt(modal, { content, title, icon, buttons, onclose, hideOnOob });
		document.querySelector('body').appendChild(modalR.root);
		return modalR;
	}

}