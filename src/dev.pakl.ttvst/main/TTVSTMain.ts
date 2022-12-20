import path from 'path';

import MainWindow from './MainWindow';
import dateFormat, { DateFormatI18n } from 'dateformat';

import APIHelix from './Twitch/APIHelix';

import Startpage from './Pages/Startpage';
import TMI from './Twitch/TMI';
import PubSub from './Twitch/PubSub';
import EventSub from './Twitch/EventSub';
import BroadcastMain from './BroadcastMain';
import Addons from './Util/Addons';
import * as Settings from './Util/Settings';
import * as i18n from './Util/I18n';

import TwitchBroadcast from './Util/TwitchBroadcast';

export default class TTVSTMain {

	private _mainWindow: MainWindow = null;

	private _helix: APIHelix = null;
	private _tmi: TMI = null;
	private _pubsub: PubSub;
	private _eventsub: EventSub;
	private _ttvbroadcast: TwitchBroadcast = null;

	private _startpage: Startpage = null;
	private _addons: Addons = null;

	private _i18n: { __: typeof i18n.__ } = null;

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
		this._i18n = i18n;
	}

	private initTwitch() {
		this._helix = new APIHelix({
			clientid: '11vhuxdssb9pc3s2uqpa7s3s0252hyk',
			redirectUri: 'http://localhost:8086/',
			scope: [
				'chat:read',
				'chat:edit',
				'channel:moderate',

				'whispers:read',
				'whispers:edit',

				'user:read:email',

				'channel:edit:commercial',
				'channel:manage:broadcast',
				'channel:manage:polls',
				'channel:manage:predictions',
				'channel:manage:raids',
				'channel:manage:redemptions',
				'channel:read:polls',
				'channel:read:predictions',
				'channel:read:redemptions',
				'channel:read:subscriptions',

				'moderation:read',
				'moderator:manage:announcements',
				'moderator:manage:banned_users',
				'moderator:read:blocked_terms',
				'moderator:manage:blocked_terms',
				'moderator:manage:chat_messages',
				'moderator:read:chat_settings',
				'moderator:manage:chat_settings'
			]
		});

		this._tmi = new TMI();
		//this._pubsub = new PubSub();
		this._eventsub = new EventSub();

		this._ttvbroadcast = new TwitchBroadcast();
	}

	get i18n(): typeof i18n {
		return this._i18n;
	}

	get helix(): APIHelix {
		return this._helix;
	}

	get tmi(): TMI {
		return this._tmi;
	}

	get eventsub(): EventSub {
		return this._eventsub;
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