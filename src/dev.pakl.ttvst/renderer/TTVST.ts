import { ipcRenderer } from 'electron';
process.env.NODE_ENV = ipcRenderer.sendSync('request-node-env');

import i18n from 'i18n-nodejs';

import UI from './UI/UI';
import * as Settings from './Settings'


class TTVST {

	private _ui: UI;
	private _i18n: i18n;

	init() {
		this._i18n = new i18n(Settings.language(), './../../language.json')
		this._ui = new UI(this);
	}

	get i18n(): i18n {
		return this._i18n;
	}

	get ui(): UI {
		return this._ui;
	}

}

export = TTVST;