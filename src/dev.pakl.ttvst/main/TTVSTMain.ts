import path from 'path';

import MainWindow from './MainWindow';
import dateFormat, { DateFormatI18n } from 'dateformat';

import APIHelix from './Twitch/APIHelix';

import Startpage from './Pages/Startpage';
import TMI from './Twitch/TMI';
import PubSub from './Twitch/PubSub';
import BroadcastMain from './BroadcastMain';
import Addons from './Util/Addons';
import * as Settings from './Util/Settings';

import TwitchBroadcast from './Util/TwitchBroadcast';

export default class TTVSTMain {

	private _mainWindow: MainWindow = null;

	private _helix: APIHelix = null;
	private _tmi: TMI = null;
	private _pubsub: PubSub;
	private _ttvbroadcast: TwitchBroadcast = null;

	private _startpage: Startpage = null;
	private _addons: Addons = null;


	private _dateformat: typeof dateFormat;
	private _dateformatI18n: { [lang: string]: DateFormatI18n };

	constructor(mainWindow: MainWindow) {
		this._mainWindow = mainWindow;

		this._dateformat = dateFormat;
		this._dateformatI18n = require('./../../../dateformat.i18n.json');
	}

	get mainWindow(): MainWindow {
		return this._mainWindow;
	}

	init() {
		Settings.getBoolean('helloworld', false);
		this.initTwitch();
		this.initApp();
	}

	private initTwitch() {
		this._helix = new APIHelix({
			clientid: '11vhuxdssb9pc3s2uqpa7s3s0252hyk',
			redirectUri: 'http://localhost:8086/',
			scope: [
				'user:read:email',
				'chat:read',
				'chat:edit',
				'whispers:read',
				'whispers:edit',
				'user:edit:broadcast',
				'channel:read:subscriptions',
				'channel:read:redemptions',
				'channel:manage:redemptions',
				'channel:moderate',
				'moderation:read',
				'user_read',
				'channel_check_subscription',
				'channel_editor',
				'channel_read',
				'channel_commercial'
			]
		});

		this._tmi = new TMI();
		this._pubsub = new PubSub();

		this._ttvbroadcast = new TwitchBroadcast();
	}

	get helix(): APIHelix {
		return this._helix;
	}

	get tmi(): TMI {
		return this._tmi;
	}

	get pubsub(): PubSub {
		return this._pubsub;
	}

	private initApp() {
		this._startpage = new Startpage();
		this._addons = new Addons();
	}

	get startpage(): Startpage {
		return this._startpage;
	}

	get addons(): Addons {
		return this._addons;
	}

	get Settings(): typeof Settings {
		return Settings;
	}

	get BroadcastMain(): typeof BroadcastMain {
		return BroadcastMain;
	}

	get ttvbroadcast(): TwitchBroadcast {
		return this._ttvbroadcast;
	}

	async DateFormat(): Promise<typeof dateFormat> {
		try {
			this._dateformat.i18n = this._dateformatI18n[await Settings.language()];
		} catch(e) {}
		return this._dateformat;
	}

	get iconpath(): string {
		return path.join(__dirname, '../../../res/img/icon.ico');
	}

}