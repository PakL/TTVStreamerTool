import Page from '../UI/Page';
import { ipcRenderer } from 'electron';
import Path from 'path';

import * as Settings from '../Settings';
import Broadcast from '../Broadcast';

import { IAddon } from '../../main/Util/AddonsTypes';

import * as riot from 'riot';
import AddonsPageCmp from '../../../../dist/dev.pakl.ttvst/renderer/UI/Addons/AddonsPage';

import _ttvst from '../TTVST';
declare var TTVST: _ttvst;

class AddonsPage extends Page {
	

	private addonspage: riot.RiotComponent = null;
	private packageLists: Array<string> = [];

	private addons: Array<IAddon> = [];
	
	constructor() {
		super('Addons');

		this.loadAddon = this.loadAddon.bind(this);
		this.updateAddons = this.updateAddons.bind(this);

		this.onBatchFailed = this.onBatchFailed.bind(this);

		this.onRepositoryChange = this.onRepositoryChange.bind(this);

		ipcRenderer.on('Addons.load', this.loadAddon);
		ipcRenderer.on('Addons.update', this.updateAddons);

		ipcRenderer.on('Addons.batchFailed', this.onBatchFailed);

		ipcRenderer.send('Addons.loadInstalled');
		this.startLoadRepository();
	}


	get icon(): string {
		return 'Puzzle';
	}


	content(): HTMLElement {
		if(this.addonspage === null) {
			let startpageCmpnt = riot.component<null, null>(AddonsPageCmp as any);
			this.addonspage = startpageCmpnt(document.createElement('AddonsPage'));
			this.addonspage.update({ addons: this.addons });
			this.addonspage.setRepositoryCallback(this.onRepositoryChange);
		}
		return this.addonspage.root;
	}

	async loadAddon(event: Electron.IpcRendererEvent, addonpath: string, addonrenderer: string) {
		try {
			let modpath = Path.relative(__dirname, Path.join(process.cwd(), Path.join(addonpath, addonrenderer))).replace(new RegExp('\\'+Path.sep, 'g'), '/');
			require(modpath);
		} catch(e) {
			ipcRenderer.send('Addons.loadError', addonpath, { code: e.code, message: e.message, stack: e.stack });
			console.error(e);
		}
	}

	async updateAddons(event: Electron.IpcRendererEvent, addons: Array<IAddon>) {
		this.addons = addons;
		if(this.addonspage !== null) {
			this.addonspage.update({ addons });
		}
	}

	async onBatchFailed() {
		if(this.addonspage === null) return;
		TTVST.ui.alert(TTVST.i18n.__('There was an error creating the batch to make the changes happen. Please retry or find more information in the error log.'));
	}

	startLoadRepository() {
		this.packageLists = Settings.getJSON('addon_packagelists', []);
		this.packageLists.unshift('https://addons.ttvst.app/v2/addons.json');
		for(let i = 0; i < this.packageLists.length; i++) {
			ipcRenderer.send('Addons.loadRepository', this.packageLists[i]);
		}
	}

	onRepositoryChange(sourcesInput: string) {
		let packagesRaw = sourcesInput.split('\n');
		let packages = [];

		for(let i = 0; i < packagesRaw.length; i++) {
			packagesRaw[i] = packagesRaw[i].trim()
			if(packagesRaw[i].startsWith('https://')) {
				packages.push(packagesRaw[i]);
			}
		}
		TTVST.settings.setJSON('addon_packagelists', packages);
	}


}
export = AddonsPage;