import TMI from '../Twitch/TMI';
import * as T from '../Twitch/TMITypes';
import APIHelix from '../Twitch/APIHelix';
import * as H from '../Twitch/APIHelixTypes';

import TTVSTMain from '../TTVSTMain';
import Broadcast from '../BroadcastMain';
import winston, { debug } from 'winston';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;

class TwitchBroadcast {

	tmi: TMI;
	helix: APIHelix;

	constructor() {
		this.tmi = TTVST.tmi;
		this.helix = TTVST.helix;

		Broadcast.registerTrigger({
			label: 'Incoming Twitch Chat Message',
			description: 'Incoming Twitch Chat Message for your channel',
			channel: 'app.ttvst.tmi.message',
			addon: 'Twitch',
			arguments: [
				{ label: 'message', description: 'The message that was sent by the user', type: 'string' },
				{ label: 'login', description: 'The unformatted user name', type: 'string' },
				{ label: 'username', description: 'By the user formatted user name with uppercase or localization', type: 'string' },
				{ label: 'permissions', description: 'An associative array with booleans of permissions. Keys are: isSubscriber, isVIP, isModerator, isBroadcaster', type: 'assoc' },
				{ label: 'tags', description: 'The complete TMI message tags as associative array. Check https://dev.twitch.tv/docs/irc/tags#privmsg-twitch-tags for more info', type: 'assoc' }
			]
		});
		this.tmi.on('message', this.onTMIMessage.bind(this));

		Broadcast.registerAction({
			label: 'Send Twitch Chat Message',
			description: 'Send a chat message to your channel',
			channel: 'app.ttvst.tmi.sendMessage',
			addon: 'Twitch',
			parameters: [
				{ label: 'message', description: 'The message that you want to send', type: 'string' }
			]
		});
		Broadcast.instance.on('app.ttvst.tmi.sendMessage', this.onTMISendMessage.bind(this));

		Broadcast.registerAction({
			label: 'Get channel title',
			description: 'Loads and returns the current channel title. If no channel is given the channel of the tool\'s user is requested.',
			channel: 'app.ttvst.helix.getStream',
			addon: 'Twitch',
			parameters: [
				{ label: 'channel', description: 'The channel you request the info of. Optional.', type: 'string' }
			],
			result: { label: 'title', description: 'The channel title', type: 'string' }
		});
		Broadcast.instance.on('app.ttvst.helix.getStream', this.onHelixGetStreamTitle.bind(this));
		Broadcast.registerAction({
			label: 'Get channel game',
			description: 'Loads and returns the current channel game. If no channel is given the channel of the tool\'s user is requested.',
			channel: 'app.ttvst.helix.getGame',
			addon: 'Twitch',
			parameters: [
				{ label: 'channel', description: 'The channel you request the info of. Optional.', type: 'string' }
			],
			result: { label: 'game', description: 'The game', type: 'string' }
		});
		Broadcast.instance.on('app.ttvst.helix.getGame', this.onHelixGetStreamGame.bind(this));
	}

	onTMIMessage(msg: T.TMIMessage) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string' || TTVST.helix.userobj.login !== msg.channel) return;
		let dispName = msg.user;
		if(typeof(msg.tags['display-name']) === 'string' && msg.tags['display-name'].length > 0) dispName = msg.tags['display-name'];

		let isSubscriber = false;
		let isVIP = false;
		let isModerator = false;
		let isBroadcaster = false;
		if(typeof(msg.tags.badges) === 'string') {
			let badges = msg.tags.badges.split(',');
			for(let i = 0; i < badges.length; i++) {
				let [badge, bver] = badges[i].split('/', 2);
				if(badge === 'subscriber') isSubscriber = true;
				if(badge === 'vip') isVIP = true;
				if(badge === 'moderator') isModerator = true;
				if(badge === 'broadcaster') isBroadcaster = true;
			}
		}

		Broadcast.instance.emit('app.ttvst.tmi.message', msg.message, msg.user, dispName, { isSubscriber, isVIP, isModerator, isBroadcaster }, msg.tags);
	}

	onTMISendMessage(message: string) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') return;
		this.tmi.say(TTVST.helix.userobj.login, message);
	}

	async getAPICache(apiRoute: 'getStreams'|'getGames', ...parameters: any[]): Promise<H.IAPIHelixStreams|H.IAPIHelixGames> {
		let parameterString = JSON.stringify(parameters);

		if(apiRoute === 'getStreams' && parameters.length < 1) return null;
		if(apiRoute === 'getGames' && parameters.length < 2) return null;

		let cache = await TTVST.Settings.getJSON('helix_' + apiRoute + '_' + parameterString, null, true);
		let cache_time = parseInt(await TTVST.Settings.getString('helix_' + apiRoute + '_' + parameterString + '_time', '0', true));
		if(cache === null || (apiRoute === 'getStreams' && cache_time < ((new Date()).getTime() - 30000))) {
			try {
				let stream = await TTVST.helix[apiRoute](...parameters as [any, any]);
				if(stream.data.length == 1) {
					cache = stream;
					cache_time = (new Date()).getTime();

					await TTVST.Settings.setJSON('helix_' + apiRoute + '_' + parameterString, cache, true);
					await TTVST.Settings.setString('helix_' + apiRoute + '_' + parameterString + '_time', cache_time.toString(), true);
				}
			} catch(e) {
				logger.error(e);
			}
		}

		return cache;
	}

	async getStreamAPIProperty(channel: string, property: 'title'|'game_id'|'started_at'|'viewer_count'): Promise<string|number> {
		if(typeof(channel) !== 'string') channel = '';
		if(channel.length <= 0) channel = TTVST.helix.userobj.login;

		let response: string|number = '';
		let stream_cache = (await this.getAPICache('getStreams', { user_login: channel }) as H.IAPIHelixStreams);
		if(stream_cache !== null && stream_cache.data.length > 0) {
			response = stream_cache.data[0][property];
		}

		return response;
	}

	async onHelixGetStreamTitle(executeId: string, channel: string = '') {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, '');
			return;
		}

		let response = await this.getStreamAPIProperty(channel, 'title');
		TTVST.BroadcastMain.instance.executeRespond(executeId, response);
	}

	async onHelixGetStreamGame(executeId: string, channel: string = '') {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, '');
			return;
		}

		let response = '';
		let game_id = (await this.getStreamAPIProperty(channel, 'game_id') as string);
		if(game_id.length > 0) {
			let gamecache = (await this.getAPICache('getGames', game_id) as H.IAPIHelixGames);
			if(gamecache !== null && gamecache.data.length > 0) {
				response = gamecache.data[0].name;
			}
		}

		TTVST.BroadcastMain.instance.executeRespond(executeId, response);
	}

}

export = TwitchBroadcast;