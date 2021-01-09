import TMI from '../Twitch/TMI';
import * as T from '../Twitch/TMITypes';
import APIHelix from '../Twitch/APIHelix';
import * as H from '../Twitch/APIHelixTypes';

import TTVSTMain from '../TTVSTMain';
import Broadcast, { IBroadcastAction, IBroadcastTrigger } from '../BroadcastMain';
import winston from 'winston';

declare var logger: winston.Logger;
declare var TTVST: TTVSTMain;

const _trigger: IBroadcastTrigger[] = [{
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
}, {
	label: 'Channel point reward redemption',
	description: 'When a user redeemes a reward with their channel points',
	channel: 'app.ttvst.pubsub.reward',
	addon: 'Twitch',
	arguments: [
		{ label: 'redemptionid', description: 'ID of the redemption - useful for advanced users', type: 'string' },
		{ label: 'rewardid', description: 'ID of the reward - useful for advanced users', type: 'string' },
		{ label: 'rewardtitle', description: 'Title of the reward', type: 'string' },
		{ label: 'cost', description: 'Number of points that were used to redeem the reward', type: 'number' },
		{ label: 'userinput', description: 'The message that was sent by the user if the reward allows it', type: 'string' },
		{ label: 'login', description: 'The unformatted user name', type: 'string' },
		{ label: 'username', description: 'By the user formatted user name with uppercase or localization', type: 'string' }
	]
}];

const _actions: IBroadcastAction[] = [{
	label: 'Send Twitch Chat Message',
	description: 'Send a chat message to your channel',
	channel: 'app.ttvst.tmi.sendMessage',
	addon: 'Twitch',
	parameters: [
		{ label: 'message', description: 'The message that you want to send', type: 'string' }
	]
}, {
	label: 'Get channel title',
	description: 'Loads and returns the current channel title. If no channel is given the channel of the tool\'s user is requested.',
	channel: 'app.ttvst.helix.getStream',
	addon: 'Twitch',
	parameters: [
		{ label: 'channel', description: 'The channel you request the info of. Optional.', type: 'string' }
	],
	result: { label: 'title', description: 'The channel title', type: 'string' }
}, {
	label: 'Get channel game',
	description: 'Loads and returns the current channel game. If no channel is given the channel of the tool\'s user is requested.',
	channel: 'app.ttvst.helix.getGame',
	addon: 'Twitch',
	parameters: [
		{ label: 'channel', description: 'The channel you request the info of. Optional.', type: 'string' }
	],
	result: { label: 'game', description: 'The game', type: 'string' }
}, {
	label: 'Set channel title',
	description: 'Set the title of your channel',
	channel: 'app.ttvst.helix.setTitle',
	addon: 'Twitch',
	parameters: [
		{ label: 'title', description: 'New channel title. Must not be empty', type: 'string' }
	],
	result: { label: 'success', description: 'True if the title was changed', type: 'boolean' }
}, {
	label: 'Sets channel game',
	description: 'Sets the channel game. Does not have to be precise but takes the first search result. Try to be as precise as possible.',
	channel: 'app.ttvst.helix.setGame',
	addon: 'Twitch',
	parameters: [
		{ label: 'game', description: 'The game name you want the channel to set to', type: 'string' }
	],
	result: { label: 'game', description: 'The game name the channel was set to. Empty on failure.', type: 'string' }
}]

class TwitchBroadcast {

	tmi: TMI;
	helix: APIHelix;

	constructor() {
		this.tmi = TTVST.tmi;
		this.helix = TTVST.helix;

		for(let i = 0; i < _trigger.length; i++) Broadcast.registerTrigger(_trigger[i]);
		for(let i = 0; i < _actions.length; i++) Broadcast.registerAction(_actions[i]);

		this.tmi.on('message', this.onTMIMessage.bind(this));
		TTVST.pubsub.on('reward-redeemed', this.onPubsubReward.bind(this));

		Broadcast.instance.on('app.ttvst.tmi.sendMessage', this.onTMISendMessage.bind(this));
		Broadcast.instance.on('app.ttvst.helix.getStream', this.onHelixGetStreamTitle.bind(this));
		Broadcast.instance.on('app.ttvst.helix.getGame', this.onHelixGetStreamGame.bind(this));

		Broadcast.instance.on('app.ttvst.helix.setTitle', this.onHelixSetStreamTitle.bind(this));
		Broadcast.instance.on('app.ttvst.helix.setGame', this.onHelixSetStreamGame.bind(this));
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

	onPubsubReward(redemptionid: string, rewardid: string, channelid: string, rewardtitle: string, user: { id: string, login: string, display_name: string }, cost: number, userinput: string) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string' || TTVST.helix.userobj.id !== channelid) return;

		let dispName = user.login;
		if(typeof(user.display_name) === 'string' && user.display_name.length > 0) dispName = user.display_name;

		Broadcast.instance.emit('app.ttvst.pubsub.reward', redemptionid, rewardid, rewardtitle, cost, userinput, user.login, dispName);
	}

	onTMISendMessage(message: string) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') return;
		this.tmi.say(TTVST.helix.userobj.login, message);
	}

	async getAPICache(apiRoute: 'getStreams'|'getGames'|'getChannel'|'getUsers'|'searchCategories', cacheTime: number, ...parameters: any[]): Promise<H.IAPIHelixStreams|H.IAPIHelixGames|H.IAPIHelixChannel|H.IAPIHelixUserList|H.IAPIHelixSearchCategories> {
		let parameterString = JSON.stringify(parameters);

		if(apiRoute === 'getStreams' && parameters.length < 1) return null;
		if(apiRoute === 'getGames' && parameters.length < 2) return null;
		if(apiRoute === 'getChannel' && parameters.length < 1) return null;
		if(apiRoute === 'getUsers' && parameters.length < 1) return null;
		if(apiRoute === 'searchCategories' && parameters.length < 1) return null;

		let cache = await TTVST.Settings.getJSON('helix_' + apiRoute + '_' + parameterString, null, true);
		let cache_time = parseInt(await TTVST.Settings.getString('helix_' + apiRoute + '_' + parameterString + '_time', '0', true));
		if(cache === null || ( cacheTime > 0 && cache_time < ((new Date()).getTime() - (cacheTime * 1000)) )) {
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

	async getStreamAPIProperty(channel: string, property: keyof H.IAPIHelixStreamObject): Promise<string|number> {
		if(typeof(channel) !== 'string') channel = '';
		if(channel.length <= 0) channel = TTVST.helix.userobj.login;

		let response: string|number = '';
		let stream_cache = (await this.getAPICache('getStreams', 30, { user_login: channel }) as H.IAPIHelixStreams);
		if(stream_cache !== null && stream_cache.data.length > 0) {
			if(Array.isArray(stream_cache.data[0][property])) {
				response = (stream_cache.data[0][property] as Array<string>).join(';');
			} else {
				response = (stream_cache.data[0][property] as string|number);
			}
		}

		return response;
	}

	async getChannelAPIProperty(channel: string, property: keyof H.IAPIHelixChannelObject): Promise<string|number> {
		if(typeof(channel) !== 'string') channel = '';

		let channel_id = '';
		if(channel.length <= 0)  {
			channel_id = TTVST.helix.userobj.id;
		} else {
			let users = (await this.getAPICache('getUsers', 8 * 60 * 60, { login: channel }) as H.IAPIHelixUserList)
			if(users.data.length > 0) {
				channel_id = users.data[0].id;
			} else {
				return '';
			}
		}

		let response: string|number = '';
		let stream_cache = (await this.getAPICache('getChannel', 30, channel_id) as H.IAPIHelixChannel);
		if(stream_cache !== null && stream_cache.data.length > 0) {
			response = (stream_cache.data[0][property] as string|number);
		}

		return response;
	}

	async onHelixGetStreamTitle(executeId: string, channel: string = '') {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, '');
			return;
		}

		let response = '';
		try {
			response = (await this.getStreamAPIProperty(channel, 'title') as string);
			if(response.length == 0) {
				response = (await this.getChannelAPIProperty(channel, 'title') as string);
			}
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, response);
	}

	async onHelixGetStreamGame(executeId: string, channel: string = '') {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, '');
			return;
		}

		let response = '';
		try {
			response = (await this.getStreamAPIProperty(channel, 'game_name') as string);
			if(response.length == 0) {
				response = (await this.getChannelAPIProperty(channel, 'game_name') as string);
			}
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, response);
	}

	async onHelixSetStreamTitle(executeId: string, title: string) {
		if(typeof(title) !== 'string' || title.length <= 0 || TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, false);
			return;
		}

		let success = false;
		try {
			await this.helix.patchChannel(this.helix.userobj.id, { title });
			success = true;
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, success);
	}

	async onHelixSetStreamGame(executeId: string, game: string) {
		if(typeof(game) !== 'string' || game.length <= 0 || TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string') {
			TTVST.BroadcastMain.instance.executeRespond(executeId, false);
			return;
		}

		let result = '';
		try {
			let game_id = '';
			let game_name = '';
			let search = await this.getAPICache('searchCategories', -1, { query: game }) as H.IAPIHelixSearchCategories;
			if(search.data.length > 0) {
				for(let i = 0; i < search.data.length; i++) {
					if(search.data[i].name.toLowerCase() === game.toLowerCase()) {
						game_id = search.data[i].id;
						game_name = search.data[i].name;
					}
				}
				if(game_id.length <= 0) {
					game_id = search.data[0].id;
					game_name = search.data[0].name;
				}
			}

			if(game_id.length > 0) {
				await this.helix.patchChannel(this.helix.userobj.id, { game_id });
				result = game_name;
			}
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, result);
	}

}

export = TwitchBroadcast;