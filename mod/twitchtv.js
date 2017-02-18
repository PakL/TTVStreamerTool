"use strict";
const https = require('https')

class TwitchTv {

	constructor(options) {
		this.clientid = ''
		this.redirecturi = ''
		this.scope = []
		this.token = ''
		this.userid = ''
		this.channelid = ''

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
		if(typeof(authNeeded) == 'function') {
			callback = authNeeded
			authNeeded = false
		}
		if(typeof(query) == 'function') {
			callback = query
			query = {}
		}
		if(typeof(query) == 'boolean') {
			authNeeded = query
			query = {}
		}
		if(typeof(authNeeded) != 'boolean') authNeeded = false
		if(typeof(query) != 'object') query = {}

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

		https.request({
			'method': 'GET',
			'host': 'api.twitch.tv',
			'path': uri,
			'headers': headers
		}, (res) => {
			res.setEncoding('utf8')
			let rawData = ''
			res.on('data', (chunk) => { rawData += chunk })
			res.on('end', () => {
				try {
					let parsed = JSON.parse(rawData)
					var error = null
					if(res.statusCode != 200) {
						error = new Error(`API request failed for ${uri} with status code ${res.statusCode}`)
					}
					callback(parsed, error)
				} catch(e) {
					if(res.statusCode == 200) {
						callback(null, new Error(`API request failed for ${uri} with message ${e.message}`))
					} else {
						callback(null, new Error(`API request failed for ${uri} with status code ${res.statusCode}`))
					}
				}
			})
		}).on('error', (e) => {
			callback(null, new Error(`API request failed for ${uri} with message ${e.message}`))
		}).end()
	}

	getUser(callback) {
		if(typeof(callback) != 'function') return
		this.requestAPI('/kraken/user', true, callback)
	}

	getUserFollows(userid, options, callback) {
		if(typeof(userid) != 'string' && typeof(userid) != 'number') return
		if(userid.length == 0) {
			if(this.userid.length > 0) userid = this.userid
			else {
				const self = this
				this.getUser((res, err) => {
					if(res.hasOwnProperty('_id')) {
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
		if(options.hasOwnProperty('limit') && typeof(options.limit) == 'number') opt.limit = options.limit
		if(options.hasOwnProperty('offset') && typeof(options.offset) == 'number') opt.offset = options.offset
		if(options.hasOwnProperty('direction') && (options.direction == 'asc' || options.direction == 'desc')) opt.direction = options.direction
		if(options.hasOwnProperty('sortby') && (options.sortby == 'created_at' || options.sortby == 'last_broadcast' || options.sortby == 'login')) opt.sortby = options.sortby
		this.requestAPI(uri, opt, callback)
	}

}

module.exports = TwitchTv