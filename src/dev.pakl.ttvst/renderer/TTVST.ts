import { ipcRenderer } from 'electron';
process.env.NODE_ENV = ipcRenderer.sendSync('request-node-env');

import i18n from 'i18n-nodejs';

import UI from './UI/UI';
import * as Settings from './Settings'

import Startpage from './Pages/Startpage';
import SettingsPage from './UI/Settings/SettingsPage';
import ChangelogPage from './UI/Main/ChangelogPage';
import AboutPage from './UI/Main/AboutPage';

class TTVST {

	private _ui: UI;
	private _i18n: i18n;

	private _startpage: Startpage;

	init() {
		this._i18n = new i18n(Settings.language(), './../../language.json');
		this._i18n.__ = this._i18n.__.bind(this._i18n);
		this._ui = new UI(this);

		this._startpage = new Startpage();

		this._ui.addPage(this._startpage);
		this._ui.addPage(new SettingsPage());
		this._ui.addPage(new ChangelogPage());
		this._ui.addPage(new AboutPage());
	}

	get i18n(): i18n {
		return this._i18n;
	}

	get ui(): UI {
		return this._ui;
	}

}

export = TTVST;