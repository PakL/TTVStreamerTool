"use strict"

const EventEmitter = require('events')
const i18n = require('../node_modules/i18n-nodejs')

const ToolUI = require('./toolui')
const ToolSettings = require('../lib/settings')
const TwitchTv = require('./twitchtv')
const TTVLogin = require('../lib/auth')
const Chat = require('../lib/chat')

const Channel = require('../var/channel')
const Follows = require('../var/follows')
const Subscriptions = require('../var/subscriptions')

const Addons = require('../lib/addons')

class TTVTool extends EventEmitter {

	constructor() {
		super()

		this._settings = new ToolSettings(this)
		this._i18n = i18n(this._settings.language, './../../language.json')
		this._twitchapi = new TwitchTv({
			clientid: '11vhuxdssb9pc3s2uqpa7s3s0252hyk',
			redirecturi: 'http://localhost:8086/',
			scope: [
				'user_read',
				'channel_check_subscription',
				'channel_editor',
				'channel_read',
				'channel_stream',
				'channel_subscriptions',
				'chat_login'
			]
		})
		this._auth = new TTVLogin(this)
		this._chat = new Chat(this)

		this._ui = new ToolUI(this)
		
		this._channel = new Channel(this)
		this._follows = new Follows(this)
		this._subscriptions = new Subscriptions(this)

		this._addons = new Addons(this)

		const self = this
		window.onload = (e) => { self.emit('load') }
		window.onbeforeunload = (e) => { self.emit('exit') }
	}


	get ui() {
		return this._ui
	}

	get i18n() {
		return this._i18n
	}

	get settings() {
		return this._settings
	}

	get twitchapi() {
		return this._twitchapi
	}
	
	get auth() {
		return this._auth
	}

	get chat() {
		return this._chat
	}

	get cockpit() {
		return this._ui.findPage('Cockpit')
	}

	get overlays() {
		return this._ui.findPage('Overlays')
	}

	get channel() {
		return this._channel
	}

	get follows() {
		return this._follows
	}

	get subscriptions() {
		return this._subscriptions
	}

}

const tool = new TTVTool()
module.exports = tool