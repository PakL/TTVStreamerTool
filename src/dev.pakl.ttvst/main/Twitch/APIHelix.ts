import got, { Method, Response } from 'got';
import url from 'url';
import * as T from './APIHelixTypes';
import IpcEventEmitter from '../Util/IpcEventEmitter';
import winston from 'winston';

declare var logger: winston.Logger;

export class UnauthroizedError extends Error {}

/**
 * @class TwitchHelix
 * @param {Object} options Options for the TwitchTv object
 * @param {String} [options.clientid] The client id of the twitch api app
 * @param {String} [options.redirecturi] The redirect uri of the twitch api app
 * @param {Array} [options.scope] An array of the permission scopes you might need
 * @param {String} [options.token] A string with an bearer token. If this is omitted token will be loaded from localStroage if possible
 */
export default class TwitchHelix extends IpcEventEmitter {

	clientid: string = '';
	redirectUri: string = '';
	scope: Array<string> = [];

	token: string = '';
	userid: string = '';
	userobj: T.IAPIHelixUser = null;

	validstates: Array<string> = [];
	ratelimitreset: number = -1;

	requestCount: number = 0;
	requestTimes: Array<number> = [];
	requestsFailed: number = 0;

	constructor(options: T.IAPIHelixOptions) {
		super();
		if(typeof(options.clientid) == 'string') this.clientid = options.clientid;
		if(typeof(options.redirectUri) == 'string') this.redirectUri = options.redirectUri;
		if(typeof(options.scope) == 'object') this.scope = options.scope;
	}

	/**
	 * Returns a complete URL for the grant flow authentication and creates a state.
	 */
	getAuthImplicitGrantFlowUrl(overwriteRedirect?: string): string {
		let state = Math.floor(Date.now() / 1000).toString(16);
		this.validstates.push(state);

		return 'https://id.twitch.tv/oauth2/authorize' +
				'?response_type=token' +
				'&client_id=' + this.clientid +
				'&redirect_uri=' + encodeURIComponent(typeof(overwriteRedirect) === 'string' ? overwriteRedirect : this.redirectUri) +
				'&scope=' + this.scope.join('+') +
				'&state=' + state +
				'&force_verify=true';
	}

	/**
	 * Verifys if this returned state is one of the valid states and removes it from the local list.
	 */
	verifyState(state: string): boolean {
		let i = this.validstates.indexOf(state);
		if(i >= 0) {
			this.validstates.splice(i, 1);
			return true;
		}

		return false;
	}

	/**
	 * Fills the user token and saves it in the localStorage.
	 */
	setAuthToken(token: string): void {
		if(typeof(token) != 'string') token = '';
		this.token = token;
	}

	/**
	 * Returns the twitch user auth token. Used for login in twitch irc or api requests for user related information.
	 */
	getAuthToken(): string {
		return this.token;
	}

	/**
	 * Returns true if user is logged in.
	 */
	isLoggedIn(): boolean {
		return (this.token.length > 0);
	}

	/**
	 * Prepares and executes a request to the twitch api and parses the response
	 * 
	 * @example
	 * twitchtv.requestAPI(
	 *     // uri
	 *     '/helix/users',
	 * 
	 *     // query
	 *     {
	 *         login: ['pakl']
	 *     },
	 * 
	 *     // authNeeded
	 *     false
	 * ).then((data) => {
	 *     // Do something with data
	 * })
	 */
	requestAPI(uri: string, query?: { [key: string]: string|string[] }, authNeeded?: boolean, postdata?: { [key: string]: any }, noretry?: boolean, method?: Method): Promise<T.IAPIHelixResponse> {
		const self = this;
		if(typeof(authNeeded) != 'boolean') authNeeded = false;
		if(typeof(query) != 'object' || query == null) query = {};
		if(typeof(noretry) != 'boolean') noretry = false;
		if(typeof(method) !== 'string') method = 'GET';

		if(typeof(postdata) !== 'object') {
			postdata = {};
		}
		if(typeof(uri) != 'string') return Promise.reject(new Error('uri must be of type string'));

		if(Object.keys(postdata).length > 0) authNeeded = true;

		let querystr = '';
		for(let key in query) {
			if(query.hasOwnProperty(key)) {
				let val = query[key];
				if(!Array.isArray(val)) {
					val = [val];
				}
				for(let i = 0; i < val.length; i++) {
					querystr += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val[i]);
				}
			}
		}
		querystr = '?' + querystr.substr(1);
		if(querystr.length > 1) {
			uri += querystr;
		}

		let headers: { [key: string]: string } = {
			'Client-ID': self.clientid
		};
		if(self.token.length > 0) {
			headers['Authorization'] = 'Bearer ' + self.token;
		} else if(authNeeded) {
			return Promise.reject(new Error('User not logged in but authorization needed'));
		}

		/*
		let poststr = ''
		if(Object.keys(postdata).length > 0) {
			poststr = JSON.stringify(postdata)
			headers['Content-Type'] = 'application/json; charset=UTF-8'
		}
		*/

		let overridehost = 'api.twitch.tv';
		if(uri.startsWith('https://')) {
			let parsedurl = url.parse(uri);
			overridehost = parsedurl.hostname;
			uri = parsedurl.path;

			if(overridehost === 'id.twitch.tv') {
				headers['Authorization'] = headers['Authorization'].replace(/^Bearer/, 'OAuth');
			}
		}

		logger.verbose(`[API] Request for https://${overridehost + uri} started... authNeeded:${authNeeded}`);

		if(this.ratelimitreset > 0) {
			let timestamp = new Date().getTime();
			if(timestamp >= this.ratelimitreset) {
				this.ratelimitreset = -1;
 			} else {
				return Promise.reject(new Error('Rate limit exceeded. Try again later.'));
			}
		}

		return new Promise((resolve, reject) => {
			let startTime = Date.now();
			self.requestCount++;

			let requestURL = 'https://' + overridehost + uri;
			let requestOptions: { [key: string]: any } = {
				method: 'GET',
				responseType: 'json',
				headers: headers,
				timeout: 5000,
				throwHttpErrors: false
			};
			if(Object.keys(postdata).length > 0) {
				requestOptions.method = 'PUT';
				requestOptions.body = postdata;
			}
			if(method.length > 0) requestOptions.method = method.toUpperCase();
			got(requestURL, requestOptions).then((response: Response<T.IAPIHelixResponse>) => {
				let endTime = Date.now();
				self.requestTimes.push(endTime - startTime);
				if(self.requestTimes.length > 10) {
					self.requestTimes.shift();
				}
				self.emitStatusUpdate();

				let body = response.body;
				if(response.statusCode < 200 || response.statusCode > 299) {
					if(response.statusCode == 429) {
						let ratelimitReset: string = '';
						if(Array.isArray(response.headers['ratelimit-reset'])) {
							ratelimitReset = response.headers['ratelimit-reset'][0];
						} else {
							ratelimitReset = response.headers['ratelimit-reset'];
						}
						self.ratelimitreset = parseInt(ratelimitReset) * 1000;
					}
					if(response.statusCode === 401) {
						reject(new UnauthroizedError());
					} else if(typeof(body) == 'object' && body.hasOwnProperty('message')) {
						if(body.message.length <= 0 && typeof(body.status) !== 'undefined' && typeof(body.error) !== 'undefined') body.message = body.status + ' - ' + body.error;
						reject(new Error(body.message));
					} else if(body == 'object') {
						reject(new Error(JSON.stringify(body)));
					} else {
						reject(new Error(body));
					}
					return;
				}

				let data = null;
				if(typeof(body) == 'object') {
					data = body;
				} else if(response.statusCode == 204) {
					resolve({});
				} else {
					try {
						data = JSON.parse(body);
					} catch(e) {
						reject(e);
						logger.error('[API] Got unregular response:', body);
						return;
					}
				}
				resolve(data);
			}).catch((e) => {
				self.requestsFailed++;
				self.emitStatusUpdate();
				reject(e);
			});
		});
	}

	private emitStatusUpdate() {
		let totalTime = 0;
		this.requestTimes.map((t: number) => { totalTime += t; });
		let avgTime = Math.round(totalTime / this.requestTimes.length);
		this.emit('statusUpdate', this.requestCount, this.requestsFailed, avgTime);
	}


	/**
	 * Validates the OAuth token and returns information about it
	 */
	validate(): Promise<T.IAPIHelixValidation>
	{
		return this.requestAPI('https://id.twitch.tv/oauth2/validate', {}, true);
	}

	/**
	 * Gets information about one or more specified Twitch users. Users are identified by optional user IDs and/or login name. If neither a user ID nor a login name is specified, the user is looked up by Bearer token.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users}
	 */
	getUsers(query?: T.IAPIHelixUserOptions): Promise<T.IAPIHelixUserList>
	{
		let uri = '/helix/users';
		let opt: { [key: string]: string|string[] } = {};
		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('id') && (Array.isArray(query.id) || typeof(query.id) == "string")) opt.id = query.id;
			if(query.hasOwnProperty('login') && (Array.isArray(query.login) || typeof(query.login) == "string")) opt.login = query.login;
		}

		if(typeof(opt.id) === 'undefined' && typeof(opt.login) === 'undefined') {
			const self = this;
			return new Promise((resolve, reject) => {
				self.requestAPI(uri, opt, true).then((data: T.IAPIHelixUserList) => {
					self.userid = data.data[0].id;
					self.userobj = data.data[0];
					resolve(data);
				}).catch(reject);
			});
		}

		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Gets information on follow relationships between two Twitch users. Information returned is sorted in order, most recent follow first. This can return information like “who is lirik following,” “who is following lirik,” or “is user X following user Y.”
	 * At minimum, from_id or to_id must be provided for a query to be valid.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users-follows}
	 */
	getUsersFollows(from_id: string | number, to_id: string | number, first?: number, after?: string): Promise<T.IAPIHelixFollows>
	{
		let uri = '/helix/users/follows';
		let opt: { [key: string]: string } = {};

		if(typeof(from_id) == 'number') from_id = from_id.toString();
		if(typeof(to_id) == 'number') to_id = to_id.toString();

		if(typeof(from_id) == 'string' && from_id.length > 0) opt.from_id = from_id;
		if(typeof(to_id) == 'string' && to_id.length > 0) opt.to_id = to_id;
		if(typeof(first) == 'number' && first > 0 && first <= 100) opt.first = first.toString();
		if(typeof(after) == 'string' && after.length > 0) opt.after = after;

		if(typeof(opt.from_id) !== 'string' && typeof(opt.to_id) !== 'string') {
			return Promise.reject(new Error('One of either from_id or to_id must be defined'));
		}
		return this.requestAPI(uri, opt, false);
	}


	/**
	 * Gets channel information for users.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#get-channel-information}
	 */
	getChannel(broadcaster_id: string): Promise<T.IAPIHelixChannel> {
		let uri = '/helix/channels';
		let opt: { [key: string]: string } = {};
		
		if(typeof(broadcaster_id) == 'string' && broadcaster_id.length > 0) opt.broadcaster_id = broadcaster_id;

		if(typeof(opt.broadcaster_id) !== 'string' || opt.broadcaster_id.length <= 0) {
			return Promise.reject(new Error('broadcaster_id must not be empty'));
		}
		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Modifies channel information for users.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#modify-channel-information}
	 */
	patchChannel(broadcaster_id: string, query: T.IAPIHelixChannelPatchOptions): Promise<{}> {
		let uri = '/helix/channels';
		let opt: { [key: string]: string } = {};
		let post: { [key: string]: string } = {};

		if(typeof(broadcaster_id) == 'string' && broadcaster_id.length > 0) opt.broadcaster_id = broadcaster_id;

		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('game_id') && typeof(query.game_id) == "string") post.game_id = query.game_id;
			if(query.hasOwnProperty('broadcaster_language') && typeof(query.broadcaster_language) == "string") post.broadcaster_language = query.broadcaster_language;
			if(query.hasOwnProperty('title') && typeof(query.title) == "string") post.title = query.title;
		}
		if(typeof(opt.broadcaster_id) !== 'string') {
			return Promise.reject(new Error('broadcaster_id must be defined'));
		}
		if(
			(typeof(post.game_id) !== 'string' || post.game_id.length <= 0) &&
			(typeof(post.broadcaster_language) !== 'string' || post.broadcaster_language.length <= 0) &&
			(typeof(post.title) !== 'string' || post.title.length <= 0)
		) {
			return Promise.reject(new Error('One of either game_id, broadcaster_language or title must be defined'));
		}
		return this.requestAPI(uri, opt, true, post, true, 'PATCH');
	}

	/**
	 * Gets information about active streams. Streams are returned sorted by number of current viewers, in descending order. Across multiple pages of results, there may be duplicate or missing streams, as viewers join and leave streams.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-streams}
	 */
	getStreams(query?: T.IAPIHelixStreamOptions): Promise<T.IAPIHelixStreams>
	{
		let uri = '/helix/streams';
		let opt: { [key: string]: string|string[] } = {};
		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('after') && typeof(query.after) == "string") opt.after = query.after;
			if(query.hasOwnProperty('before') && typeof(query.before) == "string") opt.before = query.before;
			if(query.hasOwnProperty('community_id') && (Array.isArray(query.community_id) || typeof(query.community_id) == "string")) opt.community_id = query.community_id;
			if(query.hasOwnProperty('first') && typeof(query.first) == "number") opt.first = query.first.toString();
			if(query.hasOwnProperty('game_id') && (Array.isArray(query.game_id) || typeof(query.game_id) == "string")) opt.game_id = query.game_id;
			if(query.hasOwnProperty('language') && (Array.isArray(query.language) || typeof(query.language) == "string")) opt.language = query.language;
			if(query.hasOwnProperty('user_id') && (Array.isArray(query.user_id) || typeof(query.user_id) == "string")) opt.user_id = query.user_id;
			if(query.hasOwnProperty('user_login') && (Array.isArray(query.user_login) || typeof(query.user_login) == "string")) opt.user_login = query.user_login;
		}
		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Creates a marker in the stream of a user specified by a user ID. A marker is an arbitrary point in a stream that the broadcaster wants to mark; e.g., to easily return to later.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#create-stream-marker}
	 */
	createStreamMarker(query: T.IAPIHelixStreamMarkerOptions): Promise<T.IAPIHelixStreamMarker>
	{
		let uri = '/helix/streams/markers';
		let post: { [key: string]: string } = {};
		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('user_id') && typeof(query.user_id) == "string") post.user_id = query.user_id;
			if(query.hasOwnProperty('description') && typeof(query.description) == "string") post.description = query.description;
		}
		if(typeof(post.user_id) !== 'string') {
			return Promise.reject(new Error('user_id must be defined'));
		}
		return this.requestAPI(uri, {}, true, post, true, 'POST');
	}

	/**
	 * Gets game information by game ID or name.
	 * At minimum, id or name must be provided for a query to be valid.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users-follows}
	 */
	getGames(id: string | Array<string>, name: string | Array<string>): Promise<T.IAPIHelixGames> {
		let uri = '/helix/games';
		let opt: { [key: string]: string|string[] } = {};

		if((Array.isArray(id) || typeof(id) == "string") && id.length > 0) opt.id = id;
		if((Array.isArray(name) || typeof(name) == "string") && name.length > 0) opt.name = name;

		if(
			typeof(opt.id) !== 'string' && typeof(opt.name) !== 'string' &&
			!Array.isArray(opt.id) && !Array.isArray(opt.name)
		) {
			return Promise.reject(new Error('One of either id or name must be defined'));
		}
		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Returns a list of games or categories that match the query via name either entirely or partially.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#search-categories}
	 */
	searchCategories(query: string, first?: number, after?: string): Promise<T.IAPIHelixSearchCategories> {
		let uri = '/helix/search/categories';
		let opt: { [key: string]: string } = {};

		if(typeof(query) == 'string' && query.length > 0) opt.query = query;
		if(typeof(first) == 'number' && first > 0 && first <= 100) opt.first = first.toString();
		if(typeof(after) == 'string' && after.length > 0) opt.after = after;

		if(typeof(opt.query) !== 'string' || opt.query.length <= 0) {
			return Promise.reject(new Error('query must not be empty'));
		}
		return this.requestAPI(uri, opt, false);
	}


	/**
	 * Gets clip information by clip ID (one or more), broadcaster ID (one only), or game ID (one only).
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-clips}
	 */
	getClips(query: T.IAPIHelixClipsOptions): Promise<T.IAPIHelixClips> {
		let uri = '/helix/clips';
		let opt: { [key: string]: string|string[] } = {};

		if((Array.isArray(query.id) || typeof(query.id) == "string") && query.id.length > 0) opt.id = query.id;
		if(typeof(query.broadcaster_id) == "string" && query.broadcaster_id.length > 0) opt.broadcaster_id = query.broadcaster_id;
		if((typeof(query.game_id) == "string" && query.game_id.length > 0) || typeof(query.game_id) == "number") opt.game_id = query.game_id;

		if(typeof(query.after) == "string" && query.after.length > 0) opt.after = query.after;
		if(typeof(query.before) == "string" && query.before.length > 0) opt.before = query.before;
		if(typeof(query.ended_at) == "string" && query.ended_at.length > 0) opt.ended_at = query.ended_at;
		if(typeof(query.first) == "number") opt.first = query.first.toString();
		if(typeof(query.started_at) == "string" && query.started_at.length > 0) opt.started_at = query.started_at;

		if(
			typeof(opt.id) !== 'string' && typeof(opt.broadcaster_id) !== 'string' &&
			typeof(query.game_id) !== "string" && typeof(query.game_id) !== "number" &&
			!Array.isArray(opt.id)
		) {
			return Promise.reject(new Error('One of either id, broadcaster_id or game_id must be defined'));
		}
		return this.requestAPI(uri, opt, false);
	}

	/**
	 * Returns a list of Custom Reward objects for the Custom Rewards on a channel. Developers only have access to update and delete rewards that the same/calling client_id created.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#get-custom-reward}
	 */
	getCustomRewards(query?: { id?: string, only_manageable_rewards?: boolean }): Promise<T.IAPIHelixRewards> {
		let uri = '/helix/channel_points/custom_rewards';
		let opt: { [key: string]: string } = {};

		opt.broadcaster_id = this.userobj.id;

		if(typeof(query) !== 'undefined') {
			if(typeof(query.id) == "string" && query.id.length > 0) opt.id = query.id;
			if(typeof(query.only_manageable_rewards) == "boolean") opt.only_manageable_rewards = query.only_manageable_rewards ? 'true' : 'false';
		}

		return this.requestAPI(uri, opt, true);
	}

	/**
	 * Updates a Custom Reward created on a channel. Only rewards created by the same client_id can be updated.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#update-custom-reward}
	 */
	updateCustomReward(id: string, query: T.IAPIHelixRewardUpdateOptions) {
		let uri = '/helix/channel_points/custom_rewards';
		let opt: { [key: string]: string } = {};
		let post: { [key: string]: string|number|boolean } = {};

		opt.broadcaster_id = this.userobj.id;
		if(typeof(id) === 'string' && id.length > 0) opt.id = id;

		if(typeof(query.title) === 'string' && query.title.length > 0) post.title = query.title;
		if(typeof(query.prompt) === 'string') post.prompt = query.prompt;
		if(typeof(query.cost) === 'number' && query.cost > 0) post.cost = query.cost;
		if(typeof(query.background_color) === 'string' && query.background_color.match(/^#[0-9a-f]{6}/i)) post.background_color = query.background_color;
		if(typeof(query.is_enabled) === 'boolean') post.is_enabled = query.is_enabled;
		if(typeof(query.is_user_input_required) === 'boolean') post.is_user_input_required = query.is_user_input_required;
		if(typeof(query.is_max_per_stream_enabled) === 'boolean') post.is_max_per_stream_enabled = query.is_max_per_stream_enabled;
		if(typeof(query.max_per_stream) === 'number') post.max_per_stream = query.max_per_stream;
		if(typeof(query.is_max_per_user_per_stream_enabled) === 'boolean') post.is_max_per_user_per_stream_enabled = query.is_max_per_user_per_stream_enabled;
		if(typeof(query.max_per_user_per_stream) === 'number') post.max_per_user_per_stream = query.max_per_user_per_stream;
		if(typeof(query.is_global_cooldown_enabled) === 'boolean') post.is_global_cooldown_enabled = query.is_global_cooldown_enabled;
		if(typeof(query.global_cooldown_seconds) === 'number') post.global_cooldown_seconds = query.global_cooldown_seconds;
		if(typeof(query.is_paused) === 'boolean') post.is_paused = query.is_paused;
		if(typeof(query.should_redemptions_skip_request_queue) === 'boolean') post.should_redemptions_skip_request_queue = query.should_redemptions_skip_request_queue;

		if(typeof(opt.id) !== 'string' || opt.id.length <= 0) {
			return Promise.reject(new Error('id must not be empty'));
		}

		return this.requestAPI(uri, opt, true, post, true, 'PATCH');
	}

	/**
	 * Updates the status of Custom Reward Redemption objects on a channel that are in the UNFULFILLED status.
	 * Only redemptions for a reward created by the same client_id as attached to the access token can be updated.
	 * 
	 * @see {@link https://dev.twitch.tv/docs/api/reference#update-redemption-status}
	 */
	updateRedemptionStatus(redemption_id: string, reward_id: string, status: 'FULFILLED'|'CANCELED'): Promise<T.IAPIHelixRewardRedemptionStatusUpateResponse> {
		let uri = '/helix/channel_points/custom_rewards/redemptions';
		let opt: { [key: string]: string } = {};
		let post: { [key: string]: string|number|boolean } = {};

		opt.broadcaster_id = this.userobj.id;
		if(typeof(redemption_id) === 'string' && redemption_id.length > 0) opt.id = redemption_id;
		if(typeof(reward_id) === 'string' && reward_id.length > 0) opt.reward_id = reward_id;

		if(typeof(status) === 'string' && ['FULFILLED','CANCELED'].indexOf(status) >= 0) post.status = status;

		if(typeof(opt.id) !== 'string' || typeof(opt.reward_id) !== 'string' || typeof(post.status) !== 'string') {
			return Promise.reject(new Error('redemption_id, reward_id and status must not be empty'));
		}
		return this.requestAPI(uri, opt, true, post, true, 'PATCH');
	}
}