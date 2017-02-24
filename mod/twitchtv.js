"use strict"
const https = require('https')
const url = require('url')

class TwitchTv {

	constructor(options) {
		this.clientid = ''
		this.redirecturi = ''
		this.scope = []
		this.token = ''

		this.userid = ''
		this.userobj = null
		this.channelid = ''
		this.channelobj = null

		this.validstates = []

		if(typeof(options.clientid) == 'string') this.clientid = options.clientid
		if(typeof(options.redirecturi) == 'string') this.redirecturi = options.redirecturi
		if(typeof(options.scope) == 'object') this.scope = options.scope

		this.token = window.localStorage.getItem('tw_auth_token')
		if(this.token == null) this.token = ''
	}

	getAuthImplicitGrantFlowUrl() {
		var state = Math.floor(Date.now() / 1000).toString(16)
		this.validstates.push(state)

		return 'https://api.twitch.tv/kraken/oauth2/authorize' +
				'?response_type=token' +
				'&client_id=' + this.clientid +
				'&redirect_uri=' + encodeURIComponent(this.redirecturi) +
				'&scope=' + this.scope.join('+') +
				'&state=' + state +
				'&force_verify=true'
	}

	verifyState(state) {
		var i = this.validstates.indexOf(state)
		if(i >= 0) {
			this.validstates.splice(i, 1)
			return true
		}

		return false
	}

	setAuthToken(token) {
		if(typeof(token) != 'string') token = ''
		this.token = token
		window.localStorage.setItem('tw_auth_token', token)
	}

	getAuthToken() {
		return this.token
	}

	isLoggedIn() {
		return (this.token.length > 0)
	}


	requestAPI(uri, query, authNeeded, callback) {
		const self = this
		if(typeof(authNeeded) != 'boolean') authNeeded = false
		if(typeof(query) != 'object' || query == null) query = {}

		if(typeof(uri) != 'string' || typeof(callback) != 'function') return

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

		console.log(`Request for ${uri} started... authNeeded:${authNeeded}`)

		let overridehost = 'api.twitch.tv'
		if(uri.startsWith('https://')) {
			var parsedurl = url.parse(uri)
			overridehost = parsedurl.hostname
			uri = parsedurl.path
		}

		https.request({
			'method': 'GET',
			'host': overridehost,
			'path': uri,
			'headers': headers
		}, (res) => {
			res.setEncoding('utf8')
			let rawData = ''
			res.on('data', (chunk) => { rawData += chunk })
			res.on('end', () => {
				var error = null
				let parsed = null
				try {
					parsed = JSON.parse(rawData)
				} catch(e) {
					error = e
					return
				}
				if(res.statusCode != 200) {
					error = new Error(`API request failed for ${uri} with status code ${res.statusCode}`)
				} else {
					if(uri == '/kraken/user') {
						self.userobj = parsed
					} else if(uri == '/kraken/channels') {
						self.channelobj = parsed
					}
				}
				callback(parsed, error)
			})
		}).on('error', (e) => {
			callback(null, new Error(`API request failed for ${uri} with message ${e.message}`))
		}).end()
	}

	/*********************************************
	 * Users
	 *********************************************/
	getUser(userid, callback) {
		if(typeof(userid) == 'function') {
			callback = userid
			userid = ''
		}
		if(typeof(callback) != 'function' || (typeof(userid) != 'string' && typeof(userid) != 'number')) return
		userid = userid.toString()
		if(userid.length == 0 && this.userobj != null) {
			callback(this.userobj, null)
		} else {
			this.requestAPI('/kraken/user' + (userid.length > 0 ? 's/' + userid : ''), null, !(userid.length > 0), callback)
		}
	}

	getUserFollows(userid, options, callback) {
		if(typeof(callback) != 'function' || (typeof(userid) != 'string' && typeof(userid) != 'number')) return
		userid = userid.toString()
		if(userid.length == 0) {
			if(this.userid.length > 0) userid = this.userid
			else {
				const self = this
				this.getUser((res, err) => {
					if(res != null && res.hasOwnProperty('_id')) {
						self.userid = res._id
						self.getUserFollows('', options, callback)
					} else {
						callback(res, err)
					}
				})
				return
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
		this.requestAPI(uri, opt, false, callback)
	}
	
	/*********************************************
	 * Channels
	 *********************************************/
	getChannel(channelid, callback) {
		if(typeof(channelid) == 'function') {
			callback = channelid
			channelid = ''
		}
		if(typeof(callback) != 'function' || (typeof(channelid) != 'string' && typeof(channelid) != 'number')) return
		channelid = channelid.toString()
		if(channelid.length == 0 && this.channelobj != null) {
			callback(this.channelobj, null)
		} else {
			this.requestAPI('/kraken/channel' + (channelid.length > 0 ? 's/' + channelid : ''), null, !(channelid.length > 0), callback)
		}
	}

	/*********************************************
	 * Chat
	 *********************************************/
	getChatBadgesByChannel(channelid, callback) {
		if(typeof(callback) != 'function' || (typeof(channelid) != 'string' && typeof(channelid) != 'number')) return
		channelid = channelid.toString()
		if(channelid.length > 0) {
			this.requestAPI('/kraken/chat/' + channelid + '/badges', null, false, callback)
		}
	}

	// Undocumented but better
	getChatBadgeSetsByChannel(channelid, callback) {
		const self = this
		if(typeof(callback) != 'function' || (typeof(channelid) != 'string' && typeof(channelid) != 'number')) return
		channelid = channelid.toString()
		if(channelid.length > 0) {
			// Global badge settings are not available in the channel badge
			// sets so we need to load them first and overwrite them later
			this.getChatBadgeSetsByChannel('', (res, error) => {
				if(res != null && res.hasOwnProperty('badge_sets')) {
					self.requestAPI('https://badges.twitch.tv/v1/badges/channels/' + channelid + '/display', null, false, (res_channel, error) => {
						if(res_channel != null && res_channel.hasOwnProperty('badge_sets')) {
							// Overwrite global settings...
							for(var set in res_channel.badge_sets) {
								if(res_channel.badge_sets.hasOwnProperty(set)) {
									res.badge_sets[set] = res_channel.badge_sets[set]
								}
							}
							callback(res, error)
						} else {
							callback(res_channel, error)
						}
					})
				} else {
					callback(res, error)
				}
			})
		} else {
			this.requestAPI('https://badges.twitch.tv/v1/badges/global/display', null, false, callback)
		}
	}
}

module.exports = TwitchTv