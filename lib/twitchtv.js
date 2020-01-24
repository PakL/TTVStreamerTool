const https = require('https')
const url = require('url')
const zlib = require('zlib')
const request = require('request')

/**
 * This module manages requests to the twitch api in a asynchonos manner
 * 
 * @class TwitchTv
 * @param {Object} options Options for the TwitchTv object
 * @param {String} [options.clientid] The client id of the twitch api app
 * @param {String} [options.redirecturi] The redirect uri of the twitch api app
 * @param {Array} [options.scope] An array of the permission scopes you might need
 */
class TwitchTv {

	constructor(options) {
		/**
		 * The twitch api app client id that is necessary for request to the twitch api.
		 * @member {String}
		 */
		this.clientid = ''
		/**
		 * The redirect uri that ist set in the app settings.
		 * @member {String}
		 */
		this.redirecturi = ''
		/**
		 * An array with the required permission scopes.
		 * @member {Array}
		 */
		this.scope = []
		/**
		 * You know exactly what this is. Don't touch it!
		 * @private
		 * @member {String}
		 */
		this.token = ''
		/**
		 * User id of the logged in user.
		 * @member {String}
		 */
		this.userid = ''
		/**
		 * An object with all twitch user information. More information in the {@link https://dev.twitch.tv/docs/v5/reference/users/#get-user|twitch api documentation}.
		 * @member {(null | Object)}
		 */
		this.userobj = null
		/**
		 * The channel id of the logged in user. Until now it's the same as the user id but it might change.
		 * @member {String}
		 */
		this.channelid = ''
		/**
		 * An object with all twitch channel information. More information in the {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel|twitch api documentation}.
		 * @member {(null | Object)}
		 */
		this.channelobj = null

		this.validstates = []
		this.lastRequest = 0

		if(typeof(options.clientid) == 'string') this.clientid = options.clientid
		if(typeof(options.redirecturi) == 'string') this.redirecturi = options.redirecturi
		if(typeof(options.scope) == 'object') this.scope = options.scope

		if(typeof(window) !== "undefined" && window.hasOwnProperty('localStorage')) {
			this.token = window.localStorage.getItem('tw_auth_token')
			if(this.token == null) this.token = ''
		}

		this._initialEmotesets = 0
		this._brokenEmotesets = []

		const self = this
		console.log('[TTVST] Requesting known broken emote sets')
		request.get('https://sync.ttvst.app/broken_emotesets.json', { json: true, timeout: 10000 }, function(err, resp, body){
			if(!err) {
				console.log('[TTVST] Found ' + body.length + ' broken emote sets')
				self._brokenEmotesets = body
				self._initialEmotesets = self._brokenEmotesets.length
			} else {
				console.log('[TTVST] Error loading emote sets')
				console.error(err)
			}
		})
	}

	/**
	 * Returns a complete URL for the grant flow authentication and creates a state.
	 * 
	 * @returns {String}
	 */
	getAuthImplicitGrantFlowUrl() {
		var state = Math.floor(Date.now() / 1000).toString(16)
		this.validstates.push(state)

		return 'https://id.twitch.tv/oauth2/authorize' +
				'?response_type=token' +
				'&client_id=' + this.clientid +
				'&redirect_uri=' + encodeURIComponent(this.redirecturi) +
				'&scope=' + this.scope.join('+') +
				'&state=' + state +
				'&force_verify=true'
	}

	/**
	 * Verifys if this returned state is one of the valid states and removes it from the local list.
	 * 
	 * @param {String} state The state that is returned by the OAuth auth flow
	 * @returns {Boolean}
	 */
	verifyState(state) {
		var i = this.validstates.indexOf(state)
		if(i >= 0) {
			this.validstates.splice(i, 1)
			return true
		}

		return false
	}

	/**
	 * Fills the user token and saves it in the localStorage.
	 * 
	 * @param {String} token The token that is returned by the OAuth2 auth flow
	 */
	setAuthToken(token) {
		if(typeof(token) != 'string') token = ''
		this.token = token
		window.localStorage.setItem('tw_auth_token', token)
	}

	/**
	 * Returns the twitch user auth token. Used for login in twitch irc or api requests for user related information.
	 * 
	 * @returns {String}
	 */
	getAuthToken() {
		return this.token
	}

	/**
	 * Returns true if user is logged in.
	 * 
	 * @returns {Boolean}
	 */
	isLoggedIn() {
		return (this.token.length > 0)
	}

	/**
	 * Prepares and executes a request to the twitch api and parses the response
	 * 
	 * @param {String} uri The URI to the api endpoint. Only the path is required, the host api.twitch.tv is prepended when the uri does not start with https://
	 * @param {Object} query An object with all request parameters. Is being encoded for the uri. Must be passed but can be empty.
	 * @param {Boolean} authNeeded Is user authorization required for this request. Oauth token is then passed on the request.
	 * @param {Object} [postdata={}] Optional post data. If there are properties in this object authNeeded is set to true and request method is set to put. Post data is serialized to a JSON string.
	 * @param {String} [method=GET] Optional HTTP method. Defaults to GET (or PUT if postdata contains items)
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 */
	requestAPI(uri, query, authNeeded, postdata, method) {
		const self = this
		if(typeof(authNeeded) != 'boolean') authNeeded = false
		if(typeof(query) != 'object' || query == null) query = {}

		if(typeof(postdata) !== 'object') {
			postdata = {}
		}
		if(typeof(uri) != 'string') return
		if(typeof(method) !== 'string') method = 'GET'
		method = method.toUpperCase()

		if(Object.keys(postdata).length > 0) authNeeded = true

		let querystr = ''
		for(var key in query) {
			if(query.hasOwnProperty(key)) {
				querystr += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key])
			}
		}
		querystr = '?' + querystr.substr(1)
		if(querystr.length > 1) {
			uri += querystr
		}

		let headers = {
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': self.clientid
		}
		if(authNeeded) {
			headers['Authorization'] = 'OAuth ' + self.token
		}
		/*var poststr = ''
		if(Object.keys(postdata).length > 0) {
			poststr = JSON.stringify(postdata)
			headers['Content-Type'] = 'application/json'
			headers['Content-Length'] = Buffer.from(poststr).length
		}*/

		console.log(`[API] Request for ${uri} started... authNeeded:${authNeeded}`)

		let overridehost = 'api.twitch.tv'
		if(uri.startsWith('https://')) {
			var parsedurl = url.parse(uri)
			overridehost = parsedurl.hostname
			uri = parsedurl.path
		}

		let waitFor = 500 - ((Date.now()-500) - this.lastRequest)
		if(waitFor > 500) waitFor = 500
		if(waitFor < 0) waitFor = 0


		return new Promise((resolve, reject) => {
			setTimeout(() => {
				self.lastRequest = Date.now()
				
				let requestOptions = {
					'method': 'GET',
					'url': 'https://' + overridehost + uri,
					'json': true,
					'headers': headers,
					'gzip': true,
					'strictSSL': true,
					'timeout': 10000
				}
				if(Object.keys(postdata).length > 0) {
					requestOptions.method = 'PUT'
					requestOptions.body = postdata
				}
				if(method !== 'GET') {
					requestOptions.method = method
				}

				request(requestOptions, (error, response, body) => {
					if(error) {
						reject(error)
						return
					}
					let data = null
					if(response.statusCode == 204) {
						data = {}
					} else if(typeof(body) == 'object') {
						data = body
					} else {
						try {
							data = JSON.parse(body)
						} catch(e) {
							console.log('[API] Got unregular response:', body)
							reject(e)
							return
						}
					}

					if(response.statusCode !== 200 && response.statusCode !== 204) {
						/*if(response.statusCode == 429) {
							self.ratelimitreset = parseInt(response.headers['ratelimit-reset']) * 1000
						}*/
						if(typeof(data) === 'object' && data.hasOwnProperty('message')) {
							reject(new Error('API error response: (' + response.statusCode + ') ' + data.message))
						} else if(typeof(data) === 'object') {
							reject(new Error(JSON.stringify(body)))
						} else {
							reject(new Error(body))
						}
						return
					}
					
					if(uri == '/kraken/user') {
						self.userobj = data
					} else if(uri == '/kraken/channels') {
						self.channelobj = data
					}
					resolve(data)
				})
			}, waitFor)
		})
	}

	/*********************************************
	 * Users
	 *********************************************/
	/**
	 * Gets a user by the passed userid or by the oauth token
	 * 
	 * @param {(String|Number)} [userid] The user id of the user you want to get. Usernames are not supported. Use {@link TwitchTv#getUserByName} to get the user by name.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-user}
	 */
	getUser(userid) {
		if(typeof(userid) === 'undefined') userid = ''
		if(typeof(userid) != 'string' && typeof(userid) != 'number') return new Promise((res, rej) => { rej(new Error('userid must be of type string or number')) })
		userid = userid.toString()
		if(userid.length == 0 && this.userobj != null) {
			const self = this
			return new Promise((res, rej) => { res(self.userobj) })
		} else {
			return this.requestAPI('/kraken/user' + (userid.length > 0 ? 's/' + userid : ''), null, !(userid.length > 0))
		}
	}

	/**
	 * Gets user objects by name.
	 * 
	 * @param {String} username Username of the user you want to get. You can pass a comma seperated list (up to 100) to get multiple users at once. Display name is not supported.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-users}
	 */
	getUserByName(username) {
		if(typeof(username) != 'string') return new Promise((res, rej) => { rej(new Error('username must be of type string')) })
		username = username.toLowerCase()
		return this.requestAPI('/kraken/users', { login: username }, false)
	}

	/**
	 * Get the channels a user follows.
	 * 
	 * @param {(String|Number)} [userid] The user id of the user you want the follows of.
	 * @param {Object} options Options to control direction and sorting of the result
	 * @param {Number} [options.limit=25] Maximum number of most-recent objects to return. Maximum: 100.
	 * @param {Number} [options.offset=0] Object offset for pagination of results.
	 * @param {String} [options.direction='desc'] Sorting direction. Valid values: asc (oldes first), desc (newest first).
	 * @param {String} [options.sortby='created_at'] Sorting key. Valid values: created_at, last_broadcast, login.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/users/#get-user-follows}
	 */
	getUserFollows(userid, options) {
		if(typeof(userid) == 'object') {
			options = userid
			userid = ''
		}
		if(typeof(userid) != 'string' && typeof(userid) != 'number') return new Promise((res, rej) => { rej(new Error('userid must be of type string or number')) })
		userid = userid.toString()
		if(userid.length == 0) {
			if(this.userid.length > 0) userid = this.userid
			else {
				const self = this
				return new Promise((resolve, rej) => {
					this.getUser().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.userid = res._id
							self.getUserFollows(self.userid, options).then(resolve).catch(rej)
						} else {
							rej(res)
						}
					}).catch((e) => {
						rej(e)
					})
				})
			}
		}
		var uri = '/kraken/users/' + userid + '/follows/channels'
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction
			if(options.hasOwnProperty('sortby') && (options.sortby == 'created_at' || options.sortby == 'last_broadcast' || options.sortby == 'login')) opt.sortby = options.sortby
		}
		return this.requestAPI(uri, opt, false)
	}
	
	/*********************************************
	 * Channels
	 *********************************************/
	/**
	 * Gets a channel by the passed channelid or by the oauth token
	 * 
	 * @param {(String|Number)} [channelid] The channel id of the channel you want to get. Channel names are not supported.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel}
	 */
	getChannel(channelid) {
		if(typeof(channelid) == 'undefined') channelid = ''
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return
		channelid = channelid.toString()
		if(channelid.length == 0 && this.channelobj != null) {
			const self = this
			return new Promise((res, rej) => { res(self.channelobj) })
		} else {
			return this.requestAPI('/kraken/channel' + (channelid.length > 0 ? 's/' + channelid : ''), null, !(channelid.length > 0))
		}
	}

	/**
	 * Updates some channel data
	 * 
	 * @param {(String|Number)} channelid The channel id of the channel you want to update. The logged in user must have permission for that or an http error 401 is returned.
	 * @param {Object} options Options that should be changed. At least one property is required or no request is made (and therefore no callback called).
	 * @param {String} [options.status] Description of the broadcaster's status, displayed as a title on the channel page.
	 * @param {String} [options.game] Name of game.
	 * @param {String} [options.delay] Channel delay, in seconds. This inserts a delay in the live feed. Only channel owner can change this.
	 * @param {Boolean} [options.channel_feed_enabled] If true, the channel's feed is turned on. Only channel owner can change this.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#update-channel}
	 */
	updateChannel(channelid, options) {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()

		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('status') && typeof(options.status) == 'string') opt.status = options.status
			if(options.hasOwnProperty('game') && typeof(options.game) == 'string') opt.game = options.game
			if(options.hasOwnProperty('delay') && typeof(options.delay) == 'string') opt.delay = options.delay
			if(options.hasOwnProperty('channel_feed_enabled') && typeof(options.channel_feed_enabled) == 'boolean') opt.channel_feed_enabled = options.channel_feed_enabled
		}
		if(Object.keys(opt).length <= 0) return

		return this.requestAPI('/kraken/channels/' + channelid, null, true, {channel: opt})
	}

	/**
	 * Gets users that follow the channel.
	 * 
	 * @param {(String|Number)} [channelid] Channel id of the channel you want the followers of.
	 * @param {Object} options Options to control direction of the result.
	 * @param {Number} [options.limit=25] Maximum number of objects to return. Maximum: 100.
	 * @param {Number} [options.offset=0] Object offset for pagination of results.
	 * @param {String} [options.cursor] Tells the server where to start fetching the next set of results, in a multi-page response.
	 * @param {String} [options.direction='desc'] Direction of sorting. Valid values: asc (oldest first), desc (newest first).
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-followers}
	 */
	getChannelFollowers(channelid, options) {
		if(typeof(channelid) == 'object') {
			options = channelid
			channelid = ''
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		if(channelid.length == 0) {
			if(this.channelid.length > 0) channelid = this.channelid
			else {
				const self = this
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.channelid = res._id
							self.getChannelFollowers(self.channelid, options).then(resolve).catch(rej)
						} else {
							rej(res)
						}
					}).catch((e) => {
						rej(e)
					})
				})
			}
		}
		var uri = '/kraken/channels/' + channelid + '/follows'
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset
			if(options.hasOwnProperty('cursor') && typeof(options.cursor) == 'string') opt.cursor = options.cursor
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction
		}
		return this.requestAPI(uri, opt, false)
	}

	/**
	 * Gets subscribers to the channel. Logged in user needs to have permission to view channel subscriber or you get a 401 error.
	 * 
	 * @param {(String|Number)} [channelid] Channel id of the channel you want the subscriber of.
	 * @param {Object} options Options to control direction of the result.
	 * @param {Number} [options.limit=25] Maximum number of objects to return. Maximum: 100.
	 * @param {Number} [options.offset=0] Object offset for pagination of results.
	 * @param {String} [options.direction='asc'] Direction of sorting. Valid values: asc (oldest first), desc (newest first).
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-subscribers}
	 */
	getChannelSubscribers(channelid, options) {
		if(typeof(channelid) == 'object') {
			options = channelid
			channelid = ''
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		if(channelid.length == 0) {
			if(this.channelid.length > 0) channelid = this.channelid
			else {
				const self = this
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.channelid = res._id
							self.getChannelSubscribers(self.channelid, options).then(resolve).catch(rej)
						} else {
							rej(res)
						}
					}).catch((e) => {
						rej(e)
					})
				})
			}
		}
		var uri = '/kraken/channels/' + channelid + '/subscriptions'
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset
			if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction
		}
		return this.requestAPI(uri, opt, true)
	}

	/**
	 * Gets a list of VODs (Video on Demand) from a specified channel.
	 * 
	 * @param {(String|Number)} channelid Channel id of the channel you want the subscriber of.
	 * @param {Object} options Options to control direction of the result.
	 * @param {Number} [options.limit=25] Maximum number of objects to return. Maximum: 100.
	 * @param {Number} [options.offset=0] Object offset for pagination of results.
	 * @param {String} [options.broadcast_type='archive,highlight,upload'] Constrains the type of videos returned. Valid values: (any combination of) archive, highlight, upload.
	 * @param {String} [options.language] Constrains the language of the videos that are returned; for example, en,es. Default: all languages.
	 * @param {String} [options.sort='time'] Sorting order of the returned objects. Valid values: views, time. 
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-videos}
	 */
	getChannelVideos(channelid, options) {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		var uri = '/kraken/channels/' + channelid + '/videos'
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
			if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset
			if(options.hasOwnProperty('broadcast_type') && typeof(options.broadcast_type) == 'string') opt.broadcast_type = options.broadcast_type
			if(options.hasOwnProperty('language') && typeof(options.language) == 'string') opt.language = options.language
			if(options.hasOwnProperty('sort') && (options.sort == 'views' || options.sort == 'time')) opt.sort = options.sort
		}
		return this.requestAPI(uri, opt, true)
	}

	/**
	 * Starts a commercial (advertisement) on a specified channel. This is valid only for channels that are Twitch partners. You cannot start a commercial more often than once every 8 minutes.
	 * 
	 * @param {(String|Number)} channelid Channel id of the channel you want start commercials for
	 * @param {Number} length The length of the commercial (in seconds). Valid values are 30, 60, 90, 120, 150, and 180.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels#start-channel-commercial}
	 */
	startChannelCommercial(channelid, length) {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		let uri = '/kraken/channels/' + channelid + '/commercial'
		if(typeof(length) !== 'number' || [30, 60, 90, 120, 150, 180].indexOf(length) < 0) return new Promise((res, rej) => { rej(new Error('length must be a number of 30, 60, 90, 120, 150, or 180')) })
		return this.requestAPI(uri, {}, true, {'length': length}, 'POST')
	}

	/*********************************************
	 * Chat
	 *********************************************/
	/**
	 * Loads channel badges. It's incomplete. If you want better badges use {@link TwitchTv#getChatBadgeSetsByChannel}.
	 * 
	 * @param {(String|Number)} channelid Channel id of the channel you want the badges of.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/chat/#get-chat-badges-by-channel}
	 */
	getChatBadgesByChannel(channelid) {
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		if(channelid.length > 0) {
			return this.requestAPI('/kraken/chat/' + channelid + '/badges', null, false)
		} else {
			return new Promise((res, rej) => { rej(new Error('channelid must not be empty')) })
		}
	}

	// Undocumented and slow but better
	/**
	 * A more detailed alternative to {@link TwitchTv#getChatBadgesByChannel}. There is no official documentation and is now official api endpoint. See example for an example response.
	 * 
	 * @param {(String|Number)} [channelid] Channel id of the channel you want the badges of.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
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
	getChatBadgeSetsByChannel(channelid) {
		const self = this
		if(typeof(channelid) === 'undefined') channelid = ''
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
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
										res.badge_sets[set] = res_channel.badge_sets[set]
									}
								}
								resolve(res)
							} else {
								reject(res_channel)
							}
						}).catch((e) => {
							reject(e)
						})
					} else {
						reject(res)
					}
				}).catch((e) => {
					reject(e)
				})
			})
		} else {
			return this.requestAPI('https://badges.twitch.tv/v1/badges/global/display', null, false)
		}
	}

	/**
	 * Helping function that will filter out broken emote sets, that twitch won't fix and creates internal server errors on twitch api
	 * 
	 * @param {String} emotesets 
	 * @param {Boolean} [filtered=false]
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 */
	_getChatEmoticonsBySet(emotesets, filtered) {
		if(typeof(filtered) !== 'boolean') filtered = false
		var res = {emoticon_sets:{}}
		const self = this
		return new Promise(async (resolve) => {
			let sets = emotesets.split(',')
			let emotes = null
			if(!filtered) {
				for(let i = 0; i < self._brokenEmotesets.length; i++) {
					let index = sets.indexOf(self._brokenEmotesets[i])
					if(index >= 0) {
						sets.splice(index, 1)
					}
				}

				try {
					emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: sets.join(',')}, false)
					res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets)
					resolve(res)
					return
				} catch(e) {}
			}

			if(sets.length == 1) {
				self._brokenEmotesets.push(sets[0])
				resolve(res)
				return
			}
			if(sets.length <= 0) {
				resolve(res)
				return
			}

			let chunkSize = Math.ceil(sets.length / 2)
			let part1 = sets.slice(0, chunkSize)
			let part2 = sets.slice(chunkSize)
			
			emotes = {emoticon_sets: {}}
			try {
				emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: part1.join(',')}, false)
			} catch(e) {
				emotes = await self._getChatEmoticonsBySet(part1.join(','), true)
			}
			res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets)

			emotes = {emoticon_sets: {}}
			try {
				emotes = await self.requestAPI('/kraken/chat/emoticon_images', {emotesets: part2.join(',')}, false)
			} catch(e) {
				emotes = await self._getChatEmoticonsBySet(part2.join(','), true)
			}
			res.emoticon_sets = Object.assign(res.emoticon_sets, emotes.emoticon_sets)

			resolve(res)
		})
	}

	/**
	 * Get emote sets.
	 * 
	 * @param {String} emotesets Comma seperated list of emote set ids.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/chat/#get-chat-emoticons-by-set}
	 */
	getChatEmoticonsBySet(emotesets) {
		const self = this
		if(typeof(emotesets) != 'string') return new Promise((res, rej) => { rej(new Error('emotesets must be of type string')) })
		return new Promise((res, rej) => {
			this._getChatEmoticonsBySet(emotesets).then((d) => {
				if(self._brokenEmotesets.length > self._initialEmotesets) {
					self._initialEmotesets = self._brokenEmotesets.length
					console.log('[TTVST] Reporting broken emote sets so others may provit')
					request.post('https://sync.ttvst.app/report_emotesets.php', { timeout: 10000, json: true, body: self._brokenEmotesets })
				}
				res(d)
			})
		})
	}
	
	/**
	 * Approve or deny a message filtered by AutoMod
	 * 
	 * @param {String} action A string that is either 'approve' or 'deny'
	 * @param {String} msg_id A string containing the message's id
	 * @returns {Promise} Returns a Promise that resolves with an empty object
	 */
	postAutoMod(action, msg_id) {
		if(action !== 'approve' && action !== 'deny') {
			return new Promise((res, rej) => { rej(new Error('action must be either approve or deny')) })
		}
		if(typeof(msg_id) !== 'string' || msg_id.length <= 0) {
			return new Promise((res, rej) => { rej(new Error('msg_id must be string')) })
		}
		return this.requestAPI('/kraken/chat/twitchbot/' + action, null, true, { msg_id: msg_id }, 'POST')
	}

	/*********************************************
	 * Streams
	 *********************************************/
	/**
	 * Loads a stream object for a channel
	 * 
	 * @param {(String|Number)} [channelid] Channel id of the channel you want the stream for.
	 * @param {Object} options Options to filter by stream type
	 * @param {String} [options.steam_type='live'] Constrains the type of streams returned. Valid values: live, playlist, all. Playlists are offline streams of VODs (Video on Demand) that appear live.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/streams/#get-stream-by-user}
	 */
	getStreamByUser(channelid, options) {
		if(typeof(channelid) == 'object') {
			options = channelid
			channelid = ''
		}
		if(typeof(channelid) != 'string' && typeof(channelid) != 'number') return new Promise((res, rej) => { rej(new Error('channelid must be of type string or number')) })
		channelid = channelid.toString()
		if(channelid.length == 0) {
			if(this.channelid.length > 0) channelid = this.channelid
			else {
				const self = this
				return new Promise((resolve, rej) => {
					this.getChannel().then((res) => {
						if(res != null && res.hasOwnProperty('_id')) {
							self.channelid = res._id
							self.getStreamByUser(self.channelid, options).then(resolve).catch(rej)
						} else {
							rej(res)
						}
					}).catch((e) => {
						rej(e)
					})
				})
			}
		}
		var uri = '/kraken/streams/' + channelid
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('stream_type') && (options.stream_type == 'live' || options.stream_type == 'playlist' || options.stream_type == 'all')) opt.stream_type = options.stream_type
		}
		return this.requestAPI(uri, opt, false)
	}

	/*********************************************
	 * Search
	 *********************************************/
	/**
	 * Search for available games
	 * 
	 * @param {String} query Search query. Must be at least 3 characters long, otherwise request is not being done.
	 * @param {Object} options Options for filtering
	 * @param {Boolean} [options.live=false] If true, returns only games that are live on at least one channel.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/search/#search-games}
	 */
	searchGames(query, options, callback) {
		if(typeof(query) != 'string' || query.length < 3) return new Promise((res, rej) => { rej(new Error('query must be of type string and at lease 3 characters long')) })
		var uri = '/kraken/search/games'
		var opt = { query: query }
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('live') && (options.live == 'true' || options.live == 'false')) opt.live = options.live
		}
		return this.requestAPI(uri, opt, false)
	}

		
	/*********************************************
	 * Team
	 *********************************************/
	/**
	 * Gets a specified team object
	 * 
	 * @param {String} teamname The teamname that you want to get
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/teams/#get-team}
	 */
	getTeam(teamname, callback) {
		if(typeof(teamname) != 'string') return new Promise((res, rej) => { rej(new Error('teamname must be of type string')) })
		return this.requestAPI('/kraken/teams/' + encodeURIComponent(teamname), {}, false)
	}

	/*********************************************
	 * Collections
	 *********************************************/
	/**
	 * Gets collections to a specified channel
	 * 
	 * @param {String} channelid The channel you want the collections of
	 * @param {Object} [options] Options to filter or limit the response
	 * @param {String} [options.limit=10] Maximum number of most-recent objects to return. Maximum: 100.
	 * @param {Number} [options.cursor] Tells the server where to start fetching the next set of results in a multi-page response.
	 * @param {String} [options.containing_item] Returns only collections containing the specified video. Note this uses a video ID, not a collection item ID. Example: video:89917098.
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/collections/#get-collections-by-channel}
	 */
	getCollectionsByChannel(channelid, options) {
		if(typeof(channelid) != 'string') return new Promise((res, rej) => { rej(new Error('channelid must be of type string')) })
		var uri = '/kraken/channels/' + encodeURIComponent(channelid) + '/collections'
		var opt = {}
		if(typeof(options) == 'object') {
			if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
			if(options.hasOwnProperty('cursor') && typeof(options.cursor) == 'string') opt.cursor = options.cursor
			if(options.hasOwnProperty('containing_item') && typeof(options.containing_item) == 'string' && options.containing_item.startsWith('video:')) opt.containing_item = options.containing_item
		}
		return this.requestAPI(uri, opt, false)
	}


	/*********************************************
	 * Bits
	 *********************************************/
	/**
	 * Retrieves the list of available cheermotes
	 * 
	 * @param {String} [channel_id] If this is specified, the cheermote for this channel is included in the response (if the channel owner has uploaded a channel-specific cheermote).
	 * @returns {Promise} Returns a Promise that resolves with the deserialized json object
	 * @see {@link https://dev.twitch.tv/docs/v5/reference/bits#get-cheermotes}
	 */
	getCheermotes(channel_id) {
		let options = {}
		if(typeof(channel_id) === 'string') options.channel_id = channel_id
		return this.requestAPI('/kraken/bits/actions', options, false)
	}

}

module.exports = TwitchTv