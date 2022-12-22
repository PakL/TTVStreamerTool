import TMI from '../Twitch/TMI';
import * as T from '../Twitch/TMITypes';
import APIHelix from '../Twitch/APIHelix';
import * as H from '../Twitch/APIHelixTypes';
import * as E from '../Twitch/EventSubTypes';

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
}, {
	label: 'Channel subscription',
	description: 'When a user shares a channel subscription',
	channel: 'app.ttvst.pubsub.subscription',
	addon: 'Twitch',
	arguments: [
		{ label: 'type', description: 'Type of message. One of: sub, resub, subgift, anonsubgift', type: 'string' },
		{ label: 'tier', description: 'One of: Prime, 1000, 2000, 3000', type: 'string' },
		{ label: 'cumulative_months', description: 'Number of months the user has subscribed to your channel', type: 'number' },
		{ label: 'streak_months', description: 'Number of months the user has subscribed to your channel in a row', type: 'number' },
		{ label: 'message', description: 'An optional message by the user', type: 'string' },
		{ label: 'user_login', description: '(User who triggered the event) The unformatted user name', type: 'string' },
		{ label: 'user_name', description: 'By the user formatted user name with uppercase or localization', type: 'string' },
		{ label: 'recipient_login', description: '(User who recieved subscription - might be the same as user_login) The unformatted user name', type: 'string' },
		{ label: 'recipient_name', description: 'By the user formatted user name with uppercase or localization', type: 'string' }
	]
}, {
	label: 'Channel follow',
	description: 'When a user follows your channel',
	channel: 'app.ttvst.eventsub.channel.follow',
	addon: 'Twitch',
	arguments: [
		{ label: 'user_id', description: 'The user id', type: 'string' },
		{ label: 'user_login', description: 'The unformatted user name', type: 'string' },
		{ label: 'user_name', description: 'By the user formatted user name with uppercase or localization', type: 'string' }
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
	label: 'Send Twitch Chat Announcement',
	description: 'Send a chat announcement to your channel',
	channel: 'app.ttvst.helix.sendAnnouncement',
	addon: 'Twitch',
	parameters: [
		{ label: 'message', description: 'The message that you want to send', type: 'string' },
		{ label: 'color', description: 'Highlight color. Possible values: blue, green, orange, purple, primary (default)', type: 'string' }
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
	label: 'Set channel informations',
	description: 'Set the title and/or the game of your channel',
	channel: 'app.ttvst.helix.setStreamInfo',
	addon: 'Twitch',
	parameters: [
		{ label: 'title', description: 'New channel title. Empty means no change.', type: 'string' },
		{ label: 'game', description: 'New channel game. Does not have to be precise but takes the first search result. Try to be as precise as possible. Empty means no change.', type: 'string' }
	],
	result: { label: 'success', description: 'True if the channel was updated', type: 'boolean' }
}, {
	label: 'Set channel point redemption status',
	description: 'Set a channel point redemption status to fulfilled or canceled. Canceling will refund points to the user.',
	channel: 'app.ttvst.helix.updateRedemption',
	addon: 'Twitch',
	parameters: [
		{ label: 'redemptionid', description: 'ID of the redemption - take from trigger', type: 'string' },
		{ label: 'rewardid', description: 'ID of the reward - take from trigger', type: 'string' },
		{ label: 'status', description: 'on = fulfilled, off = canceled', type: 'boolean' }
	],
	result: { label: 'success', description: 'True if the redemption status was updated', type: 'boolean' }
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
		this.tmi.on('usernotice', this.onTMIUsernotice.bind(this));
		TTVST.eventsub.on('channel.channel_points_custom_reward_redemption.add', this.onEventsubReward.bind(this));
		TTVST.eventsub.on('channel.follow', this.onEventsubFollow.bind(this));

		Broadcast.instance.on('app.ttvst.tmi.sendMessage', this.onTMISendMessage.bind(this));
		Broadcast.instance.on('app.ttvst.helix.sendAnnouncement', this.onHelixSendAnnouncement.bind(this));
		Broadcast.instance.on('app.ttvst.helix.getStream', this.onHelixGetStreamTitle.bind(this));
		Broadcast.instance.on('app.ttvst.helix.getGame', this.onHelixGetStreamGame.bind(this));
		Broadcast.instance.on('app.ttvst.helix.setStreamInfo', this.onHelixSetStreamInfo.bind(this));
		Broadcast.instance.on('app.ttvst.helix.updateRedemption', this.onHelixUpdateRedemption.bind(this));
	}

	onTMIMessage(msg: T.TMIMessage) {
		if(this.helix.userobj === null || typeof(this.helix.userobj.login) !== 'string' || this.helix.userobj.login !== msg.channel) return;
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

	onTMIUsernotice(channel: string, tags: T.TMITagsUsernotice, message: string) {
		if(this.helix.userobj === null || typeof(this.helix.userobj.login) !== 'string' || this.helix.userobj.login !== channel) return;

		if(['sub', 'resub', 'subgift', 'anonsubgift'].indexOf(tags['msg-id']) < 0) return;

		let dispName = tags.login;
		if(typeof(tags['display-name']) === 'string' && tags['display-name'].length > 0) dispName = tags['display-name'];
		let rdispName = typeof(tags['msg-param-recipient-user-name']) === 'string' ? tags['msg-param-recipient-user-name'] : dispName;
		if(typeof(tags['msg-param-recipient-display-name']) === 'string' && tags['msg-param-recipient-display-name'].length > 0) rdispName = tags['msg-param-recipient-display-name'];

		Broadcast.instance.emit(
			'app.ttvst.pubsub.subscription',
			tags['msg-id'],
			tags['msg-param-sub-plan'],
			typeof(tags['msg-param-cumulative-months']) !== 'undefined' ? parseInt(tags['msg-param-cumulative-months']) : parseInt(tags['msg-param-months']),
			typeof(tags['msg-param-streak-months']) !== 'undefined' ? parseInt(tags['msg-param-streak-months']) : 0,
			message,
			tags.login,
			dispName,
			typeof(tags['msg-param-recipient-user-name']) === 'string' ? tags['msg-param-recipient-user-name'] : tags.login,
			rdispName
		);
	}

	onEventsubReward(payload: E.IEventSubChannelPointsCustomRewardRedemptionAddEventPayload) {
		if(this.helix.userobj === null || typeof(this.helix.userobj.login) !== 'string' || this.helix.userobj.id !== payload.event.broadcaster_user_id) return;

		let dispName = payload.event.user_login;
		if(typeof(payload.event.user_name) === 'string' && payload.event.user_name.length > 0) dispName = payload.event.user_name;

		Broadcast.instance.emit('app.ttvst.pubsub.reward', payload.event.id, payload.event.reward.id, payload.event.reward.title, payload.event.reward.cost, payload.event.user_input, payload.event.user_id, dispName);
	}

	onEventsubFollow(payload: E.IEventSubChannelFollowEventPayload) {
		Broadcast.instance.emit('app.ttvst.eventsub.channel.follow', payload.event.user_id, payload.event.user_login, payload.event.user_name);
	}

	/*onPubsubSubscribe(channelid: string, type: 'sub'|'resub'|'subgift'|'anonsubgift'|'resubgift'|'anonresubgift', tier: 'Prime'|'1000'|'2000'|'3000', cumulative_months: number, streak_months: number, message: string, user: { id: string, login: string, display_name: string }, recipient: { id: string, login: string, display_name: string }) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string' || TTVST.helix.userobj.id !== channelid) return;
		
		let dispName = user.login;
		if(typeof(user.display_name) === 'string' && user.display_name.length > 0) dispName = user.display_name;
		let rdispName = recipient.login;
		if(typeof(recipient.display_name) === 'string' && recipient.display_name.length > 0) rdispName = recipient.display_name;

		Broadcast.instance.emit('app.ttvst.pubsub.subscription', type, tier, cumulative_months, streak_months, message, user.login, dispName, recipient.login, rdispName);
	}*/

	onTMISendMessage(message: string) {
		if(this.helix.userobj === null || typeof(this.helix.userobj.login) !== 'string') return;
		this.tmi.say(TTVST.helix.userobj.login, message);
	}

	async onHelixSendAnnouncement(message: string, color: 'blue'|'green'|'orange'|'purple'|'primary') {
		if(this.helix.userobj === null || typeof(this.helix.userobj.login) !== 'string') return;
		if(typeof(message) !== 'string') return;

		let scopes = await TTVST.Settings.getJSON('ttvst.global.scope', [])
		if(scopes.indexOf('moderator:manage:announcements') < 0) {
			TTVST.mainWindow.notification(await TTVST.i18n.__('Your Twitch login is out of date. Please renew your login on the start page.'), false);
			return;
		}

		if(typeof(color) !== 'string') color = 'primary';
		color = color.toLowerCase() as ('blue'|'green'|'orange'|'purple'|'primary');
		if(['blue', 'green', 'orange', 'purple', 'primary'].indexOf(color) < 0) color = 'primary';

		if(message.length > 0) {
			this.helix.sendChatAnnouncement(message, color);
		}
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
				if(typeof(stream.data) !== 'undefined') {
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
			response = (await this.getChannelAPIProperty(channel, 'title') as string);
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
			response = (await this.getChannelAPIProperty(channel, 'game_name') as string);
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, response);
	}

	async onHelixSetStreamInfo(executeId: string, title: string, game: string) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string' || ((typeof(title) !== 'string' || title.length <= 0) && (typeof(game) !== 'string' || game.length <= 0))) {
			TTVST.BroadcastMain.instance.executeRespond(executeId, false);
			return;
		}

		let success: boolean = false;
		let opt: { title?: string; game_id?: string; } = {};
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

			if(typeof(opt.title) === 'string' || typeof(opt.game_id) === 'string') {
				await this.helix.patchChannel(this.helix.userobj.id, opt);
				success = true;
			}
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, success);
	}

	async onHelixUpdateRedemption(executeId: string, redemption_id: string, reward_id: string, status: boolean) {
		if(TTVST.helix.userobj === null || typeof(TTVST.helix.userobj.login) !== 'string' ||
			typeof(redemption_id) !== 'string' || redemption_id.length <= 0 ||
			typeof(reward_id) !== 'string' || reward_id.length <= 0 ||
			typeof(status) !== 'boolean'
		) {
			TTVST.BroadcastMain.instance.executeRespond(executeId, false);
			return;
		}

		let success = false;
		try {
			let resp = await this.helix.updateRedemptionStatus(redemption_id, reward_id, status ? 'FULFILLED' : 'CANCELED');
			if(resp.data.length > 0) {
				if(resp.data[0].status == (status ? 'FULFILLED' : 'CANCELED')) {
					success = true;
				}
			}
		} catch(e) {
			logger.error(e);
		}
		TTVST.BroadcastMain.instance.executeRespond(executeId, success);
	}

}

export = TwitchBroadcast;