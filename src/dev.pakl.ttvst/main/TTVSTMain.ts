import MainWindow from './MainWindow';

import APIHelix from './Twitch/APIHelix';

import Startpage from './Pages/Startpage';
import TMI from './Twitch/TMI';

export default class TTVSTMain {

	private _mainWindow: MainWindow = null;

	private _helix: APIHelix = null;
	private _tmi: TMI = null;

	private _startpage: Startpage = null;

	constructor(mainWindow: MainWindow) {
		this._mainWindow = mainWindow;
	}

	init() {
		this.initTwitch();
		this.initCockpit();
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
	}

	get mainWindow(): MainWindow {
		return this._mainWindow;
	}

	get helix(): APIHelix {
		return this._helix;
	}

	get tmi(): TMI {
		return this._tmi;
	}

	private initCockpit() {
		this._startpage = new Startpage();
	}

}