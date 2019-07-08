const request = require('request')

/**
 * @class TwitchHelix
 * @param {Object} options Options for the TwitchTv object
 * @param {String} [options.clientid] The client id of the twitch api app
 * @param {String} [options.redirecturi] The redirect uri of the twitch api app
 * @param {Array} [options.scope] An array of the permission scopes you might need
 * @param {String} [options.token] A string with an bearer token. If this is omitted token will be loaded from localStroage if possible
 */
class TwitchHelix {

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
		 * An object with all twitch user information. More information in the {@link https://dev.twitch.tv/docs/api/reference/#get-users|twitch api documentation}.
		 * @member {(null | Object)}
		 */
		this.userobj = null

		this.validstates = []
		this.ratelimitreset = -1;

		if(typeof(options.clientid) == 'string') this.clientid = options.clientid
		if(typeof(options.redirecturi) == 'string') this.redirecturi = options.redirecturi
		if(typeof(options.scope) == 'object') this.scope = options.scope

		if(typeof(options.token) == 'string') this.token = options.token
		else {
			if(typeof(window) !== "undefined" && window.hasOwnProperty('localStorage')) {
				this.token = window.localStorage.getItem('tw_auth_token')
				if(this.token == null) this.token = ''
			}
		}
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

		if(typeof(window) !== "undefined" && window.hasOwnProperty('localStorage')) {
			window.localStorage.setItem('tw_auth_token', token)
		}
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
	 * @param {Boolean} [authNeeded=false] Is user authorization required for this request. Oauth token is then passed on the request.
	 * @param {Object} [postdata={}] Optional post data. If there are properties in this object authNeeded is set to true and request method is set to put. Post data is serialized to a JSON string.
	 * @param {Boolean} [noretry=false] If this is set to true the request will not be retried after a server error response
	 * @returns {Promise} Returns a Promise that resolves with a single response object if the request is done
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
	requestAPI(uri, query, authNeeded, postdata, noretry) {
		const self = this
		if(typeof(authNeeded) != 'boolean') authNeeded = false
		if(typeof(query) != 'object' || query == null) query = {}
		if(typeof(noretry) != 'boolean') noretry = false

		if(typeof(postdata) !== 'object') {
			postdata = {}
		}
		if(typeof(uri) != 'string') return new Promise((r, rej) => { rej(new Error('uri must be of type string')) })

		if(Object.keys(postdata).length > 0) authNeeded = true

		let querystr = ''
		for(var key in query) {
			if(query.hasOwnProperty(key)) {
				let val = query[key]
				if(!Array.isArray(val)) {
					val = [val]
				}
				for(let i = 0; i < val.length; i++) {
					querystr += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val[i])
				}
			}
		}
		querystr = '?' + querystr.substr(1)
		if(querystr.length > 1) {
			uri += querystr
		}

		let headers = {}

		if(self.token.length > 0) {
			headers = {
				'Authorization': 'Bearer ' + self.token
			}
		} else if(!authNeeded) {
			headers = {
				'Client-ID': self.clientid
			}
		} else {
			return new Promise((res, rej) => {
				rej(new Error('User not logged in but authorization needed'))
			})
		}


		var poststr = ''
		if(Object.keys(postdata).length > 0) {
			poststr = JSON.stringify(postdata)
			headers['Content-Type'] = 'application/json'
		}

		console.log(`[API] Request for ${uri} started... authNeeded:${authNeeded}`)

		let overridehost = 'api.twitch.tv'
		if(uri.startsWith('https://')) {
			var parsedurl = url.parse(uri)
			overridehost = parsedurl.hostname
			uri = parsedurl.path
		}

		if(this.ratelimitreset > 0) {
			let timestamp = new Date().getTime()
			if(timestamp >= this.ratelimitreset) {
				this.ratelimitreset = -1
 			} else {
				 return new Promise((res, rej) => {
					rej(new Error('Rate limit exceeded. Try again later.'))
				})
			 }
		}

		return new Promise((resolve, reject) => {
			let requestOptions = {
				'method': 'GET',
				'url': 'https://' + overridehost + uri,
				'json': true,
				'headers': headers,
				'gzip': true,
				'strictSSL': true
			}
			if(Object.keys(postdata).length > 0) {
				requestOptions.method = 'PUT'
				requestOptions.body = postdata
			}
			request(requestOptions, (error, response, body) => {
				if(error) {
					reject(error)
					return
				}
				if(response.statusCode !== 200) {
					if(response.statusCode == 429) {
						self.ratelimitreset = parseInt(response.headers['ratelimit-reset']) * 1000
					} else if(response.statusCode >= 500 && response.statusCode < 600) {
						self.requestAPI(uri, {}, authNeeded, postdata, true).then((b) => {
							resolve(b)
						}).catch((er) => {
							reject(er)
						})
						return
					}
					if(typeof(body) == 'object' && body.hasOwnProperty('message')) {
						reject(new Error(body.message))
					} else if(body == 'object') {
						reject(new Error(JSON.stringify(body)))
					} else {
						reject(new Error(body))
					}
					return
				}

				let data = null
				if(typeof(body) == 'object') {
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
				resolve(data)
			})

		})
	}


	/**
	 * Gets information about one or more specified Twitch users. Users are identified by optional user IDs and/or login name. If neither a user ID nor a login name is specified, the user is looked up by Bearer token.
	 * 
	 * @param {Object} query An object with request parameters
	 * @param {String[]} [query.id] String array of user ids (max 100 entries)
	 * @param {String[]} [query.login] String array of user login names (max 100 entries)
	 * @returns {Promise} Returns a Promise that resolves with a single response object if the request is done
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users}
	 */
	getUsers(query)
	{
		var uri = '/helix/users'
		var opt = {}
		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('id') && (Array.isArray(query.id) || typeof(query.id) == "string")) opt.id = query.id
			if(query.hasOwnProperty('login') && (Array.isArray(query.login) || typeof(query.login) == "string")) opt.login = query.login
		}
		return this.requestAPI(uri, opt, (typeof(opt.id) !== 'string' && typeof(opt.login) !== 'string') ? true : false)
	}

	/**
	 * Gets information on follow relationships between two Twitch users. Information returned is sorted in order, most recent follow first. This can return information like “who is lirik following,” “who is following lirik,” or “is user X following user Y.”
	 * At minimum, from_id or to_id must be provided for a query to be valid.
	 * 
	 * @param {String} from_id User ID. The request returns information about users who are being followed by the from_id user. Will be omitted when empty.
	 * @param {String} to_id User ID. The request returns information about users who are following the to_id user. Will be omitted when empty.
	 * @param {Number} [first] Maximum number of objects to return. Maximum: 100. Default: 20.
	 * @param {String} [after] Cursor for forward pagination: tells the server where to start fetching the next set of results, in a multi-page response.
	 * @returns {Promise} Returns a Promise that resolves with a single response object if the request is done
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users-follows}
	 */
	getUsersFollows(from_id, to_id, first, after)
	{
		var uri = '/helix/users/follows'
		var opt = {}

		if(typeof(from_id) == 'number') from_id = from_id.toString()
		if(typeof(to_id) == 'number') to_id = to_id.toString()

		if(typeof(from_id) == 'string' && from_id.length > 0) opt.from_id = from_id
		if(typeof(to_id) == 'string' && to_id.length > 0) opt.to_id = to_id
		if(typeof(first) == 'number' && first > 0 && first <= 100) opt.first = first
		if(typeof(after) == 'string' && after.length > 0) opt.after = after

		if(typeof(opt.from_id) !== 'string' && typeof(opt.to_id) !== 'string') {
			return new Promise((r, reject) => {
				reject(new Error('One of either from_id or to_id must be defined'))
			})
		}
		return this.requestAPI(uri, opt, false)
	}


	/**
	 * Gets information about active streams. Streams are returned sorted by number of current viewers, in descending order. Across multiple pages of results, there may be duplicate or missing streams, as viewers join and leave streams.
	 * 
	 * @param {Object} query An object with request parameters
	 * @param {String} [query.after] Cursor for forward pagination: tells the server where to start fetching the next set of results, in a multi-page response. The cursor value specified here is from the pagination response field of a prior query.
	 * @param {String} [query.before] Cursor for backward pagination: tells the server where to start fetching the next set of results, in a multi-page response. The cursor value specified here is from the pagination response field of a prior query.
	 * @param {String[]} [query.community_id] Returns streams in a specified community ID. You can specify up to 100 IDs.
	 * @param {Number} [query.first] Maximum number of objects to return. Maximum: 100. Default: 20.
	 * @param {String[]} [query.game_id] Returns streams broadcasting a specified game ID. You can specify up to 100 IDs.
	 * @param {String[]} [query.language] Stream language. You can specify up to 100 languages.
	 * @param {String[]} [query.user_id] Returns streams broadcast by one or more specified user IDs. You can specify up to 100 IDs.
	 * @param {String[]} [query.user_login]  	Returns streams broadcast by one or more specified user login names. You can specify up to 100 names.
	 * @returns {Promise} Returns a Promise that resolves with a single response object if the request is done
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-streams}
	 */
	getStreams(query)
	{
		var uri = '/helix/streams'
		var opt = {}
		if(typeof(query) == 'object') {
			if(query.hasOwnProperty('after') && typeof(query.after) == "string") opt.after = query.after
			if(query.hasOwnProperty('before') && typeof(query.before) == "string") opt.before = query.before
			if(query.hasOwnProperty('community_id') && (Array.isArray(query.community_id) || typeof(query.community_id) == "string")) opt.community_id = query.community_id
			if(query.hasOwnProperty('first') && typeof(query.first) == "number") opt.first = query.first
			if(query.hasOwnProperty('game_id') && (Array.isArray(query.game_id) || typeof(query.game_id) == "string")) opt.game_id = query.game_id
			if(query.hasOwnProperty('language') && (Array.isArray(query.language) || typeof(query.language) == "string")) opt.language = query.language
			if(query.hasOwnProperty('user_id') && (Array.isArray(query.user_id) || typeof(query.user_id) == "string")) opt.user_id = query.user_id
			if(query.hasOwnProperty('user_login') && (Array.isArray(query.user_login) || typeof(query.user_login) == "string")) opt.user_login = query.user_login
		}
		return this.requestAPI(uri, opt, false)
	}

	/**
	 * Gets game information by game ID or name.
	 * At minimum, id or name must be provided for a query to be valid.
	 * 
	 * @param {String[]} id Game ID. At most 100 id values can be specified. Will be omitted when empty.
	 * @param {String[]} name Game name. The name must be an exact match. For instance, “Pokemon” will not return a list of Pokemon games; instead, query the specific Pokemon game(s) in which you are interested. At most 100 name values can be specified. Will be omitted when empty.
	 * @returns {Promise} Returns a Promise that resolves with a single response object if the request is done
	 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users-follows}
	 */
	getGames(id, name) {
		var uri = '/helix/games'
		var opt = {}

		if((Array.isArray(id) || typeof(id) == "string") && id.length > 0) opt.id = id
		if((Array.isArray(name) || typeof(name) == "string") && name.length > 0) opt.name = name

		if(
			typeof(opt.id) !== 'string' && typeof(opt.name) !== 'string' &&
			!Array.isArray(opt.id) && !Array.isArray(opt.name)
		) {
			return new Promise((r, reject) => {
				reject(new Error('One of either id or name must be defined'))
			})
		}
		return this.requestAPI(uri, opt, false)
	}
}
module.exports = TwitchHelix