import { ipcRenderer } from 'electron';
process.env.NODE_ENV = ipcRenderer.sendSync('request-node-env');

import i18n from 'i18n-nodejs';

import UI from './UI/UI';
import * as Settings from './Settings';

import Broadcast from './Broadcast';

import Startpage from './Pages/Startpage';
import AddonsPage from './Pages/AddonsPage';
import SettingsPage from './Pages/SettingsPage';
import ChangelogPage from './Pages/ChangelogPage';
import AboutPage from './Pages/AboutPage';

class TTVST {

	private _ui: UI;
	private _i18n: i18n;

	private _startpage: Startpage;
	private _addonspage: AddonsPage;

	init() {
		this._i18n = new i18n(Settings.language(), './../../language.json');
		this._i18n.__ = this._i18n.__.bind(this._i18n);
		this._ui = new UI();

		this._startpage = new Startpage();
		this._addonspage = new AddonsPage();

		this._ui.addPage(this._startpage);
		this._ui.addPage(this._addonspage, true);
		this._ui.addPage(new SettingsPage(), true);
		this._ui.addPage(new ChangelogPage(), true);
		this._ui.addPage(new AboutPage(), true);
	}

	get i18n(): i18n {
		return this._i18n;
	}

	get ui(): UI {
		return this._ui;
	}

	get Settings(): typeof Settings {
		return Settings;
	}

	get Broadcast(): typeof Broadcast {
		return Broadcast;
	}

}

export = TTVST;