const EventEmitter = require('events')
const i18n = require('../node_modules/i18n-nodejs')

const ToolUI = require('./toolui')
const ToolSettings = require('./settings')
const TwitchTv = require('../lib/twitchtv')
const TwitchHelix = require('../lib/twitchhelix')
const TTVLogin = require('./auth')
const Chat = require('./chat')

const Channel = require('../var/channel')
const Follows = require('../var/follows')

const Addons = require('./addons')

/**
 * This module initializes pretty much everything and other modules have access to other modules over here.
 * 
 * @class TTVTool
 * @fires TTVTool#load
 * @fires TTVTool#exit
 * @extends {EventEmitter}
 */
class TTVTool extends EventEmitter {

	constructor() {
		super()
		const self = this

		this.setMaxListeners(50)

		this._loaded = false
		this._settings = new ToolSettings(this)
		this._i18n = new i18n(this._settings.language, './../../language.json')
		this._twitchapi = new TwitchTv({
			clientid: '11vhuxdssb9pc3s2uqpa7s3s0252hyk',
			redirecturi: 'http://localhost:8086/',
			scope: [
				'user:read:email',
				'chat:read',
				'chat:edit',
				'whispers:read',
				'whispers:edit',
				'user:edit:broadcast',
				'channel:read:subscriptions',
				'channel:moderate',
				'user_read',
				'channel_check_subscription',
				'channel_editor',
				'channel_read'
			]
		})
		this._twitchhelix = new TwitchHelix({
			clientid: '11vhuxdssb9pc3s2uqpa7s3s0252hyk',
			redirecturi: 'http://localhost:8086/',
			scope: []
		})
		this._auth = new TTVLogin(this)
		this._chat = new Chat(this)

		this._ui = new ToolUI(this)
		this._ui.addPage(this._settings)
		
		this._channel = new Channel(this)
		this._follows = new Follows(this)

		this._addons = new Addons(this)

		this.once('load', () => {
			if(self._settings.lightDesignMode) {
				document.querySelector('body').classList.add('invert')
			}
		})

		window.onload = async (e) => {
			riot.install((c) => {
				c.makeAccessible = () => { c.root._tag = c }
				return c
			})
			await riot.compile()

			document.querySelectorAll('script[type=riot]').forEach((rt) => {
				rt.remove()
			})

			/**
			 * Fires after the document was loaded. Basically window.onload. Use this instead
			 * of window.onload to not overwrite the onload function and breaking the entire
			 * application. Thank you. :)
			 * 
			 * @event TTVTool#load
			 */
			self.emit('load')
			self._loaded = true
		}
		window.onbeforeunload = (e) => {
			/**
			 * Fires before the application is exited. Once again just window.onbeforeunload.
			 * Don't overwrite window.onbeforeunload please.
			 * 
			 * @event TTVTool#exit
			 */
			self.emit('exit')
		}

		
	}

	/**
	 * Was the load event fired
	 * 
	 * @type {Boolean}
	 * @readonly
	 */
	get loaded()
	{
		return this._loaded
	}

	/**
	 * Gives you the UI modules
	 * 
	 * @type {ToolUI}
	 * @readonly
	 */
	get ui() {
		return this._ui
	}

	/**
	 * Gives you the {@link https://www.npmjs.com/package/i18n-nodejs|i18n-nodejs} module.
	 * 
	 * @type {i18n-nodejs}
	 * @see {@link https://www.npmjs.com/package/i18n-nodejs}
	 * @readonly
	 */
	get i18n() {
		return this._i18n
	}

	/**
	 * Gives you the settings module.
	 * 
	 * @type {ToolSettings}
	 * @readonly
	 */
	get settings() {
		return this._settings
	}

	/**
	 * Gives you the Twitch-API module.
	 * 
	 * @type {TwitchTv}
	 * @readonly
	 */
	get twitchapi() {
		return this._twitchapi
	}

	/**
	 * Gives you the new Twitch API module
	 * 
	 * @type {TwitchHelix}
	 * @readonly
	 */
	get twitchhelix() {
		return this._twitchhelix
	}
	
	/**
	 * Gives you the auth module.
	 * 
	 * @type {TTVLogin}
	 * @readonly
	 */
	get auth() {
		return this._auth
	}

	/**
	 * Gives you the chat module.
	 * 
	 * @type {Chat}
	 * @readonly
	 */
	get chat() {
		return this._chat
	}

	/**
	 * Gives you the cockpit module.
	 * 
	 * @type {Cockpit}
	 * @readonly
	 */
	get cockpit() {
		return this._ui.findPage('Cockpit')
	}

	/**
	 * Gives you the overlay module.
	 * 
	 * @type {TTVLogin}
	 * @readonly
	 */
	get overlays() {
		return this._ui.findPage('Overlays')
	}

	/**
	 * Gives you the channel data module.
	 * 
	 * @type {Channel}
	 * @readonly
	 */
	get channel() {
		return this._channel
	}

	/**
	 * Gives you the follow data module.
	 * 
	 * @type {Follows}
	 * @readonly
	 */
	get follows() {
		return this._follows
	}

	/**
	 * Gives you a subscription module.
	 * 
	 * @type {undefined}
	 * @readonly
	 * @deprecated Subscription are now shared with everyone via chat.
	 */
	get subscriptions() {
		return this._subscriptions
	}

	/**
	 * Gives you the addons module.
	 * 
	 * @type {Addons}
	 * @readonly
	 */
	get addons() {
		return this._addons
	}

}

const tool = new TTVTool()
module.exports = tool