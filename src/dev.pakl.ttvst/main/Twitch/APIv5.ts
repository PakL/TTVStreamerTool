import url from 'url';
import got, { Method, Response } from 'got';
import * as T from './APIv5Types';
import winston from 'winston';

declare var logger: winston.Logger;

class APIv5 {

	clientid: string = '';
	redirectUri: string = '';
	scope: Array<string> = [];

	token: string = '';
	userid: string = '';
	userobj: T.IAPIv5User = null;
	channelobj: T.IAPIv5Channel = null;

	validstates: Array<string> = [];
	lastRequest: number = 0;

	private _initialEmotesets: number = 0;
	private _brokenEmotesets: Array<string> = [];

	constructor(options: T.IAPIv5Options) {
		if(typeof(options.clientid) == 'string') this.clientid = options.clientid;
		if(typeof(options.redirectUri) == 'string') this.redirectUri = options.redirectUri;
		if(typeof(options.scope) == 'object') this.scope = options.scope;

		const self = this
		logger.info('[TTVST] Requesting known broken emote sets')
		got('https://sync.ttvst.app/broken_emotesets.json', { responseType: 'json', timeout: 10000 }).then(function(resp){
			let body = resp.body
			if(body instanceof Array) {
				logger.info('[TTVST] Found ' + body.length + ' broken emote sets')
				self._brokenEmotesets = body
				self._initialEmotesets = self._brokenEmotesets.length
			}
		}).catch((err) => {
			logger.error('[TTVST] Error loading emote sets')
			logger.error(err)
		})
	}

	/**
	 * Returns a complete URL for the grant flow authentication and creates a state.
	 */
	getAuthImplicitGrantFlowUrl(): string {
		var state = Math.floor(Date.now() / 1000).toString(16)
		this.validstates.push(state)

		return 'https://id.twitch.tv/oauth2/authorize' +
				'?response_type=token' +
				'&client_id=' + this.clientid +
				'&redirect_uri=' + encodeURIComponent(this.redirectUri) +
				'&scope=' + this.scope.join('+') +
				'&state=' + state +
				'&force_verify=true'
	}

	/**
	 * Verifys if this returned state is one of the valid states and removes it from the local list.
	 */
	verifyState(state: string): boolean {
		var i = this.validstates.indexOf(state)
		if(i >= 0) {
			this.validstates.splice(i, 1)
			return true
		}

		return false
	}

	/**
	 * Fills the user token and saves it in the localStorage.
	 */
	setAuthToken(token: string) {
		if(typeof(token) != 'string') token = ''
		this.token = token
	}

	/**
	 * Returns the twitch user auth token. Used for login in twitch irc or api requests for user related information.
	 */
	getAuthToken(): string {
		return this.token
	}

	/**
	 * Returns true if user is logged in.
	 */
	isLoggedIn(): boolean {
		return (this.token.length > 0)
	}

	/**
	 * Prepares and executes a request to the twitch api and parses the response
	 */
	requestAPI(uri: string, query?: Record<string, string>, authNeeded?: boolean, postdata?: Record<string, any>, method?: Method): Promise<T.IAPIv5Response> {
		const self = this
		if(typeof(authNeeded) != 'boolean') authNeeded = false
		if(typeof(query) != 'object' || query == null) query = {};

		if(typeof(postdata) !== 'object') {
			postdata = {};
		}
		if(typeof(uri) != 'string') return;
		if(typeof(method) !== 'string') method = 'GET';

		if(Object.keys(postdata).length > 0) authNeeded = true;

		let querystr = ''
		for(let key of Object.keys(query)) {
			querystr += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
		}
		querystr = '?' + querystr.substr(1);
		if(querystr.length > 1) {
			uri += querystr;
		}

		let headers: Record<string, string> = {
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': self.clientid
		};
		if(authNeeded) {
			headers['Authorization'] = 'OAuth ' + self.token;
		}

		/*
		var poststr = '';
		if(Object.keys(postdata).length > 0) {
			poststr = JSON.stringify(postdata);
			headers['Content-Type'] = 'application/json';
			headers['Content-Length'] = Buffer.from(poststr).length.toString();
		}
		*/

		logger.verbose(`[API] Request for ${uri} started... authNeeded:${authNeeded}`);

		let overridehost = 'api.twitch.tv';
		if(uri.startsWith('https://')) {
			var parsedurl = url.parse(uri);
			overridehost = parsedurl.hostname;
			uri = parsedurl.path;
		}

		let waitFor = 500 - ((Date.now()-500) - this.lastRequest);
		if(waitFor > 500) waitFor = 500;
		if(waitFor < 0) waitFor = 0;


		return new Promise((resolve, reject) => {
			setTimeout(() => {
				self.lastRequest = Date.now();
				
				let requestURL = 'https://' + overridehost + uri;
				let requestOptions: Record<string, any> = {
					method: 'GET',
					responseType: 'json',
					headers: headers,
					timeout: 10000
				};
				if(Object.keys(postdata).length > 0) {
					requestOptions.method = 'PUT';
					requestOptions.body = postdata;
				}
				if(method !== 'GET') {
					requestOptions.method = method;
				}

				got(requestURL, requestOptions).then((response: Response<T.IAPIv5Response>) => {
					let body = response.body;
					let data = null;
					if(response.statusCode == 204) {
						data = {};
					} else if(typeof(body) == 'object') {
						data = body;
					} else {
						try {
							data = JSON.parse(body);
						} catch(e) {
							logger.error('[API] Got unregular response:', body);
							reject(e);
							return;
						}
					}

					if(response.statusCode !== 200 && response.statusCode !== 204) {
						/*if(response.statusCode == 429) {
							self.ratelimitreset = parseInt(response.headers['ratelimit-reset']) * 1000
						}*/
						if(typeof(data) === 'object' && data.hasOwnProperty('message')) {
							reject(new Error('API error response: (' + response.statusCode + ') ' + data.message));
						} else if(typeof(data) === 'object') {
							reject(new Error(JSON.stringify(body)));
						} else if(typeof(body) === 'string') {
							reject(new Error(body));
						}
						return;
					}
					
					if(uri == '/kraken/user') {
						self.userobj = data;
					} else if(uri == '/kraken/channels') {
						self.channelobj = data;
					}
					resolve(data);
				}).catch((error) => {
					reject(error);
				})
			}, waitFor);
		});
	}

	/*********************************************
	 * Users
	 *********************************************/
	/**
	 * Gets a user by the passed userid or by the oauth token
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-user}
	 */
	getUser(userid?: string | number): Promise<T.IAPIv5User> {
		if(typeof(userid) === 'undefined') userid = '';
		if(typeof(userid) != 'string' && typeof(userid) != 'number') return new Promise((res, rej) => { rej(new Error('userid must be of type string or number')) });
		userid = userid.toString();
		if(userid.length == 0 && this.userobj != null) {
			const self = this;
			return new Promise((res, rej) => { res(self.userobj) });
		} else {
			return this.requestAPI('/kraken/user' + (userid.length > 0 ? 's/' + userid : ''), null, !(userid.length > 0));
		}
	}

	/**
	 * Gets user objects by name.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-users}
	 */
	getUserByName(username: string): Promise<T.IAPIv5User> {
		if(typeof(username) != 'string') return new Promise((res, rej) => { rej(new Error('username must be of type string')); });
		username = username.toLowerCase();
		return this.requestAPI('/kraken/users', { login: username }, false);
	}

	/**
	 * Get the channels a user follows.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-user-follows}
	 */
	getUserFollows(userid : string | number | T.IAPIv5UserFollowOptions, options? : T.IAPIv5UserFollowOptions): Promise<T.IAPIv5FollowList> {
		if(typeof(userid) == 'object') {
			options = userid;
			userid = '';
		}
		if(typeof(userid) != 'string' && typeof(userid) != 'number') return Promise.reject(new Error('userid must be of type string or number'));
		userid = userid.toString();
		if(userid.length == 0) {
			if(this.userid.length > 0) userid = this.userid;
			else {
				const self = this;
				return new Promise((resolve, rej) => {
					this.getUser().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.userid = res._id.toString();
							self.getUserFollows(self.userid, options).then(resolve).catch(rej);
						} else {
							rej(res);
						}
					}).catch((e) => {
						rej(e);
					});
				});
			}
		}
		var uri = '/kraken/users/' + userid + '/follows/channels';
		var opt: Record<string, string> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit.toString();
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset.toString();
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction;
			if(options.hasOwnProperty('sortby') && (options.sortby == 'created_at' || options.sortby == 'last_broadcast' || options.sortby == 'login')) opt.sortby = options.sortby;
		}
		return this.requestAPI(uri, opt, false);
	}
	
	/*********************************************
	 * Channels
	 *********************************************/
	/**
	 * Gets a channel by the passed channelid or by the oauth token
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel}
	 */
	getChannel(channelid?: string | number): Promise<T.IAPIv5Channel> {
		if(typeof(channelid) == 'undefined') channelid = '';
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return;
		channelid = channelid.toString();
		if(channelid.length == 0 && this.channelobj != null) {
			const self = this;
			return Promise.resolve(self.channelobj);
		} else {
			return this.requestAPI('/kraken/channel' + (channelid.length > 0 ? 's/' + channelid : ''), null, !(channelid.length > 0));
		}
	}

	/**
	 * Updates some channel data
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#update-channel}
	 */
	updateChannel(channelid: string | number, options?: T.IAPIv5ChannelUpdateOptions): Promise<T.IAPIv5Channel> {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();

		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('status') && typeof(options.status) == 'string') opt.status = options.status;
			if(options.hasOwnProperty('game') && typeof(options.game) == 'string') opt.game = options.game;
			if(options.hasOwnProperty('delay') && typeof(options.delay) == 'string') opt.delay = options.delay;
			if(options.hasOwnProperty('channel_feed_enabled') && typeof(options.channel_feed_enabled) == 'boolean') opt.channel_feed_enabled = options.channel_feed_enabled;
		}
		if(Object.keys(opt).length <= 0) return;

		return this.requestAPI('/kraken/channels/' + channelid, null, true, { channel: opt });
	}

	/**
	 * Gets users that follow the channel.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-followers}
	 */
	getChannelFollowers(channelid : string | number | T.IAPIv5ChannelFollowersOptions, options? : T.IAPIv5ChannelFollowersOptions): Promise<T.IAPIv5FollowerList> {
		if(typeof(channelid) == 'object') {
			options = channelid;
			channelid = '';
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		if(channelid.length == 0) {
			if(this.userid.length > 0) channelid = this.userid;
			else {
				const self = this;
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.userid = res._id.toString();
							self.getChannelFollowers(self.userid, options).then(resolve).catch(rej);
						} else {
							rej(res);
						}
					}).catch((e) => {
						rej(e);
					})
				});
			}
		}
		var uri = '/kraken/channels/' + channelid + '/follows';
		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit;
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset;
			if(options.hasOwnProperty('cursor') && typeof(options.cursor) == 'string') opt.cursor = options.cursor;
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction;
		}
		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Gets subscribers to the channel. Logged in user needs to have permission to view channel subscriber or you get a 401 error.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-subscribers}
	 */
	getChannelSubscribers(channelid: string | number | T.IAPIv5SubscribersOptions, options?: T.IAPIv5SubscribersOptions): Promise<T.IAPIv5SubscriberList> {
		if(typeof(channelid) == 'object') {
			options = channelid;
			channelid = '';
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		if(channelid.length == 0) {
			if(this.userid.length > 0) channelid = this.userid;
			else {
				const self = this;
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.userid = res._id.toString();
							self.getChannelSubscribers(self.userid, options).then(resolve).catch(rej);
						} else {
							rej(res);
						}
					}).catch((e) => {
						rej(e);
					});
				});
			}
		}
		var uri = '/kraken/channels/' + channelid + '/subscriptions';
		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit;
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset;
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction;
		}
		return this.requestAPI(uri, opt, true);
	}

	/**
	 * Gets a list of VODs (Video on Demand) from a specified channel.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-videos}
	 */
	getChannelVideos(channelid: string | number, options?: T.IAPIv5VideosOptions) : Promise<T.IAPIv5VideoList> {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		var uri = '/kraken/channels/' + channelid + '/videos';
		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit;
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset;
			if(options.hasOwnProperty('broadcast_type') && typeof(options.broadcast_type) == 'string') opt.broadcast_type = options.broadcast_type;
			if(options.hasOwnProperty('language') && typeof(options.language) == 'string') opt.language = options.language;
			if(options.hasOwnProperty('sort') && (options.sort == 'views' || options.sort == 'time')) opt.sort = options.sort;
		}
		return this.requestAPI(uri, opt, true);
	}

	/**
	 * Starts a commercial (advertisement) on a specified channel. This is valid only for channels that are Twitch partners
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels#start-channel-commercial}
	 */
	startChannelCommercial(channelid : string | number, length: 30 | 60 | 90 | 120 | 150 | 180): Promise<T.IAPIv5StartCommercial> {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		let uri = '/kraken/channels/' + channelid + '/commercial';
		if(typeof(length) !== 'number' || [30, 60, 90, 120, 150, 180].indexOf(length) < 0) return Promise.reject(new Error('length must be a number of 30, 60, 90, 120, 150, or 180'));
		return this.requestAPI(uri, {}, true, {'length': length}, 'POST');
	}

	/*********************************************
	 * Chat
	 *********************************************/
	/**
	 * Loads channel badges. It's incomplete. If you want better badges use {@link TwitchTv#getChatBadgeSetsByChannel}.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/chat/#get-chat-badges-by-channel}
	 */
	getChatBadgesByChannel(channelid: string | number): Promise<T.IAPIv5ChannelBadges> {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		if(channelid.length > 0) {
			return this.requestAPI('/kraken/chat/' + channelid + '/badges', null, false);
		} else {
			return Promise.reject(new Error('channelid must not be empty'));
		}
	}

	// Undocumented and slow but better
	/**
	 * A more detailed alternative to {@link TwitchTv#getChatBadgesByChannel}. There is no official documentation and is no official api endpoint. See example for an example response.
	 * 
	 * @example
	 * // Example response:
	 * {
	 *   "badge_sets": {
	 *     "subscriber": {
	 *       "versions": {
	 *         "0": {
	 *           "image_url_1x": "https://static-cdn.jtvnw.net/badges/v1/7821fdef-7fd6-4085-a9b0-eae8952ce299/1",
	 *           "image_url_2x": "https://static-cdn.jtvnw.net/badges/v1/7821fdef-7fd6-4085-a9b0-eae8952ce299/2",
	 *           "image_url_4x": "https://static-cdn.jtvnw.net/badges/v1/7821fdef-7fd6-4085-a9b0-eae8952ce299/3",
	 *           "description": "Subscriber",
	 *           "title": "Subscriber",
	 *           "click_action": "subscribe_to_channel",
	 *           "click_url": ""
	 *         }
	 *       }
	 *     }
	 *   }
	 * }
	 */
	getChatBadgeSetsByChannel(channelid?: string | number): Promise<T.IAPIv5BadgeSets> {
		const self = this
		if(typeof(channelid) === 'undefined') channelid = '';
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		if(channelid.length > 0) {
			// Global badge settings are not available in the channel badge
			// sets so we need to load them first and overwrite them later
			return new Promise((resolve, reject) => {
				this.getChatBadgeSetsByChannel().then((res) => {
					if(res != null && res.hasOwnProperty('badge_sets')) {
						self.requestAPI('https://badges.twitch.tv/v1/badges/channels/' + channelid + '/display', null, false).then((res_channel) => {
							if(res_channel != null && res_channel.hasOwnProperty('badge_sets')) {
								// Overwrite global settings...
								for(var set in res_channel.badge_sets) {
									if(res_channel.badge_sets.hasOwnProperty(set)) {
										res.badge_sets[set] = res_channel.badge_sets[set];
									}
								}
								resolve(res);
							} else {
								reject(res_channel);
							}
						}).catch((e) => {
							reject(e);
						});
					} else {
						reject(res);
					}
				}).catch((e) => {
					reject(e);
				});
			});
		} else {
			return this.requestAPI('https://badges.twitch.tv/v1/badges/global/display', null, false);
		}
	}

	/**
	 * Helping function that will filter out broken emote sets, that twitch won't fix and creates internal server errors on twitch api
	 * 
	 * @param {String} emotesets 
	 * @param {Boolean} [filtered=false]
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 */
	_getChatEmoticonsBySet(emotesets: string, filtered?: boolean): Promise<T.IAPIv5Emotesets> {
		if(typeof(filtered) !== 'boolean') filtered = false;
		var res = {emoticon_sets:{}};
		const self = this;
		return new Promise(async (resolve) => {
			let sets = emotesets.split(',');
			let emotes = null;
			if(!filtered) {
				for(let i = 0; i < self._brokenEmotesets.length; i++) {
					let index = sets.indexOf(self._brokenEmotesets[i]);
					if(index >= 0) {
						sets.splice(index, 1);
					}
				}

				try {
					emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: sets.join(',')}, false);
					res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets);
					resolve(res);
					return;
				} catch(e) {}
			}

			if(sets.length == 1) {
				self._brokenEmotesets.push(sets[0]);
				resolve(res);
				return;
			}
			if(sets.length <= 0) {
				resolve(res);
				return;
			}

			let chunkSize = Math.ceil(sets.length / 2);
			let part1 = sets.slice(0, chunkSize);
			let part2 = sets.slice(chunkSize);
			
			emotes = {emoticon_sets: {}};
			try {
				emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: part1.join(',')}, false);
			} catch(e) {
				emotes = await self._getChatEmoticonsBySet(part1.join(','), true);
			}
			res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets);

			emotes = {emoticon_sets: {}};
			try {
				emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: part2.join(',')}, false);
			} catch(e) {
				emotes = await self._getChatEmoticonsBySet(part2.join(','), true);
			}
			res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets);

			resolve(res);
		});
	}

	/**
	 * Get emote sets.
	 * 
	 * @param {String} emotesets Comma seperated list of emote set ids.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/chat/#get-chat-emoticons-by-set}
	 */
	getChatEmoticonsBySet(emotesets: string): Promise<T.IAPIv5Emotesets> {
		const self = this
		if(typeof(emotesets) != 'string') return Promise.reject(new Error('emotesets must be of type string'));
		return new Promise((res, rej) => {
			this._getChatEmoticonsBySet(emotesets).then((d) => {
				if(self._brokenEmotesets.length > self._initialEmotesets) {
					self._initialEmotesets = self._brokenEmotesets.length;
					logger.info('[TTVST] Reporting broken emote sets so others may provit');
					got.post('https://sync.ttvst.app/report_emotesets.php', { timeout: 10000, json: self._brokenEmotesets });
				}
				res(d);
			});
		});
	}
	
	/**
	 * Approve or deny a message filtered by AutoMod
	 */
	postAutoMod(action: 'approve' | 'deny', msg_id : string): Promise<{}> {
		if(action !== 'approve' && action !== 'deny') {
			return Promise.reject(new Error('action must be either approve or deny'));
		}
		if(typeof(msg_id) !== 'string' || msg_id.length <= 0) {
			return Promise.reject(new Error('msg_id must be string'));
		}
		return this.requestAPI('/kraken/chat/twitchbot/' + action, null, true, { msg_id: msg_id }, 'POST');
	}

	/*********************************************
	 * Streams
	 *********************************************/
	/**
	 * Loads a stream object for a channel
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/streams/#get-stream-by-user}
	 */
	getStreamByUser(channelid: string | number | T.IAPIv5UserStreamOptions, options?: T.IAPIv5UserStreamOptions): Promise<T.IAPIv5UserStream> {
		if(typeof(channelid) == 'object') {
			options = channelid;
			channelid = '';
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return Promise.reject(new Error('channelid must be of type string or number'));
		channelid = channelid.toString();
		if(channelid.length == 0) {
			if(this.userid.length > 0) channelid = this.userid;
			else {
				const self = this;
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.userid = res._id.toString();
							self.getStreamByUser(self.userid, options).then(resolve).catch(rej);
						} else {
							rej(res);
						}
					}).catch((e) => {
						rej(e);
					});
				});
			}
		}
		var uri = '/kraken/streams/' + channelid;
		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('stream_type') && (options.stream_type == 'live' || options.stream_type == 'playlist' || options.stream_type == 'all')) opt.stream_type = options.stream_type;
		}
		return this.requestAPI(uri, opt, false);
	}

	/*********************************************
	 * Search
	 *********************************************/
	/**
	 * Search for available games
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/search/#search-games}
	 */
	searchGames(query: string, options?: { live?: boolean }): Promise<T.IAPIv5Games> {
		if(typeof(query) != 'string' || query.length < 3) return Promise.reject(new Error('query must be of type string and at least 3 characters long'));
		var uri = '/kraken/search/games';
		var opt: Record<string, any> = { query: query };
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('live') && typeof(options.live) === 'boolean') opt.live = options.live;
		}
		return this.requestAPI(uri, opt, false);
	}

		
	/*********************************************
	 * Team
	 *********************************************/
	/**
	 * Gets a specified team object
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/teams/#get-team}
	 */
	getTeam(teamname: string): Promise<T.IAPIv5Team> {
		if(typeof(teamname) != 'string') return Promise.reject(new Error('teamname must be of type string'));
		return this.requestAPI('/kraken/teams/' + encodeURIComponent(teamname), {}, false);
	}

	/*********************************************
	 * Collections
	 *********************************************/
	/**
	 * Gets collections to a specified channel
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/collections/#get-collections-by-channel}
	 */
	getCollectionsByChannel(channelid: string, options?: T.IAPIv5CollectionOptions): Promise<T.IAPIv5Collections> {
		if(typeof(channelid) != 'string') return Promise.reject(new Error('channelid must be of type string'));
		var uri = '/kraken/channels/' + encodeURIComponent(channelid) + '/collections';
		var opt: Record<string, any> = {};
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit;
			if(options.hasOwnProperty('cursor') && typeof(options.cursor) == 'string') opt.cursor = options.cursor;
			if(options.hasOwnProperty('containing_item') && typeof(options.containing_item) == 'string' && options.containing_item.startsWith('video:')) opt.containing_item = options.containing_item;
		}
		return this.requestAPI(uri, opt, false);
	}


	/*********************************************
	 * Bits
	 *********************************************/
	/**
	 * Retrieves the list of available cheermotes
	 * 
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/bits#get-cheermotes}
	 */
	getCheermotes(channel_id: string): Promise<T.IAPIv5Cheermotes> {
		let options: Record<string, any> = {};
		if(typeof(channel_id) === 'string') options.channel_id = channel_id;
		return this.requestAPI('/kraken/bits/actions', options, false);
	}

}

export = APIv5;