import Page from '../UI/Page';
import { ipcRenderer } from 'electron';
import Path from 'path';

import * as Settings from '../Settings';
import Broadcast from '../Broadcast';

import { IAddon } from '../../main/Util/AddonsTypes';
import { IStatusObject } from '../../main/Pages/StartpageTypes';

import * as riot from 'riot';
import AddonsPageCmp, * as AddonsPageComp from '../../renderer/UI/Addons/AddonsPage';

import _ttvst from '../TTVST';
declare var TTVST: _ttvst;

class AddonsPage extends Page {
	

	private addonspage: AddonsPageComp.Component = null;
	private packageLists: Array<string> = [];

	private addons: Array<IAddon> = [];

	private mainUpdateAvaiable: boolean = false;
	
	constructor() {
		super('Addons');

		this.onCockpitStatus = this.onCockpitStatus.bind(this);

		this.loadAddon = this.loadAddon.bind(this);
		this.loadLanguage = this.loadLanguage.bind(this);
		this.updateAddons = this.updateAddons.bind(this);

		this.onBatchFailed = this.onBatchFailed.bind(this);

		this.onRepositoryChange = this.onRepositoryChange.bind(this);

		Broadcast.instance.on('cockpit.status', this.onCockpitStatus);

		ipcRenderer.on('Addons.load', this.loadAddon);
		ipcRenderer.on('Addons.language', this.loadLanguage);
		ipcRenderer.on('Addons.update', this.updateAddons);

		ipcRenderer.on('Addons.batchFailed', this.onBatchFailed);

		ipcRenderer.send('Addons.loadInstalled');
		this.startLoadRepository();
	}


	get icon(): string {
		return 'Puzzle';
	}

	onCockpitStatus(statusObject: IStatusObject) {
		if(statusObject.key === 'app.ttvst.update' && statusObject.status == 'good') {
			this.mainUpdateAvaiable = true;
		}
	}


	content(): HTMLElement {
		if(this.addonspage === null) {
			let startpageCmpnt = riot.component(AddonsPageCmp);
			this.addonspage = startpageCmpnt(document.createElement('AddonsPage'));
			this.addonspage.update({ addons: this.addons });
			this.addonspage.setRepositoryCallback(this.onRepositoryChange);
		}
		return this.addonspage.root;
	}

	open() {
		if(this.mainUpdateAvaiable) {
			TTVST.ui.alert(TTVST.i18n.__('You cannot install or update addons while an update for TTVST is available. Please update TTVST first!'), 'Update available');
		}
	}

	async loadLanguage(event: Electron.IpcRendererEvent, addonpath: string) {
		try {
			let langPath = Path.relative(__dirname, Path.join(addonpath, 'language.json')).replace(new RegExp('\\'+Path.sep, 'g'), '/')
			let langData = require(langPath);

			TTVST.i18n._locale = Object.assign(langData, TTVST.i18n._locale);
			TTVST.ui.update();
		} catch(e) {
			ipcRenderer.send('Addons.languageError', addonpath, { code: e.code, message: e.message, stack: e.stack });
		}
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
		TTVST.Settings.setJSON('addon_packagelists', packages);
		this.startLoadRepository();
	}


}
export = AddonsPage;