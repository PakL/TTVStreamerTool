import APIHelix from './Twitch/APIHelix';

import Startpage from './Cockpit/Startpage';

export default class TTVSTMain {

	private _helix: APIHelix = null;

	private _startpage: Startpage = null;

	constructor() {
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
	}

	get helix() {
		return this._helix;
	}

	private initCockpit() {
		this._startpage = new Startpage();
	}

}