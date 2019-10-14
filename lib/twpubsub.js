const EventEmitter = require('events')
const ws = require('nodejs-websocket')
const _maxReconnectTimeout = 120000

/**
 * This module manages the connection to the PubSub
 * 
 * @class TwPubSub
 */
class TwPubSub extends EventEmitter {

	constructor() {
		super()
		this._token = window.localStorage.getItem('tw_auth_token')
		this._connection = null
		this._connected = false
		this._autoreconnect = false
		this._reconnectTimeout = 1000
		this._pingTimeout = null

		this._topics = []
		const self = this
		window.setInterval(() => { self._ping() }, 270000)
	}

	/**
	 * Fills the user token
	 * 
	 * @param {String} token The token that is returned by the OAuth2 auth flow
	 */
	setAuthToken(token) {
		this._token = token
		if(this._topics.length > 0) {
			this._connect()
		}
	}

	/**
	 * Connects to the PubSub websocket
	 * 
	 * @private
	 */
	_connect()
	{
		const self = this
		let responded = false
		return new Promise((res, rej) => {
			if(self._connection !== null) {
				res()
				return
			}
	
			console.log('[PubSub] Connecting to pubsub-edge.twitch.tv')
			self._connection = ws.connect('wss://pubsub-edge.twitch.tv', () => {
				console.log('[PubSub] Connection established')
				self._connected = true
				self._autoreconnect = true
				self._reconnectTimeout = 1000
				if(!responded) {
					self._connection.on('text', (t) => { self._onMessage(t) })
					self._connection.on('close', () => { self._onClose() })

					if(self._topics.length > 0) {
						self._out({ type:'LISTEN',data:{topics: self._topics,auth_token: self._token} })
					}

					responded = true
					res()
				}
			})
			self._connection.once('error', (err) => {
				if(!responded) {
					responded = true
					rej(err)
					self._connection = null
					self._autoreconnect = true
					self._onClose()
				}
			})
		})
	}

	/**
	 * Sends a payload to the PubSub
	 * 
	 * @private
	 * @param {Object} json JSON serializable object to send
	 */
	_out(json) {
		if(this._connected) {
			if(typeof(json.data) !== 'undefined' && typeof(json.data.auth_token) !== 'undefined') {
				let publicStr = JSON.stringify(Object.assign({}, json, {data: Object.assign({}, json.data, { auth_token: '***' })}))
				console.log('[PubSub] > ' + publicStr)
			} else{
				console.log('[PubSub] > ' + JSON.stringify(json))
			}

			let str = JSON.stringify(json)
			this._connection.sendText(str)
		}
	}

	/**
	 * Sends a ping to the PubSub and timeouts connection if now answer returns
	 * 
	 * @private
	 */
	_ping() {
		if(this._connected) {
			this._out({type:'PING'})
			const self = this
			this._pingTimeout = window.setTimeout(() => {
				self._disconnect(true)
			}, 2000)
		}
	}

	/**
	 * Processes messages from the PubSub
	 * 
	 * @private
	 * @param {String} text JSON payload as a string
	 */
	_onMessage(text) {
		console.log('[PubSub] < ' + text)
		try {
			let msg = JSON.parse(text)
			if(msg.type == 'PING') {
				this._out({type:'PONG'})
			} else if(msg.type == 'PONG') {
				clearTimeout(this._pingTimeout)
			} else if(msg.type == 'MESSAGE') {
				let message = JSON.parse(msg.data.message).data
				if(msg.data.topic.startsWith('chat_moderator_actions.')) {
					switch(message.moderation_action) {
						case 'automod_rejected':
							/**
							 * Fires when a message was filtered by AutoMod
							 * @event TwPubSub#automod-rejected
							 * @param {String} message The message that was filtered
							 * @param {String} author The user that wrote the message
							 * @param {String} msgid The message id that was filtered
							 * @param {String} reason The reason the message was filtered
							 */
							this.emit('automod-rejected', message.args[1], message.target_user_login, message.msg_id, message.args[2])
							break
						case 'approved_automod_message':
							/**
							 * Fires when a moderator approved a messages that was filtered by AutoMod
							 * @event TwPubSub#automod-approved
							 * @param {String} moderator The moderator that approved the message
							 * @param {String} author The user that wrote the message
							 * @param {String} msgid The message id that was approved
							 */
							this.emit('automod-approved', message.created_by, message.args[0], message.msg_id)
							break
						case 'denied_automod_message':
							/**
							 * Fires when a moderator denies a messages that was filtered by AutoMod
							 * @event TwPubSub#automod-denied
							 * @param {String} moderator The moderator that denied the message
							 * @param {String} author The user that wrote the message
							 * @param {String} msgid The message id that was denied
							 */
							this.emit('automod-denied', message.created_by, message.args[0], message.msg_id)
							break
						default:
							/**
							 * Fires when a moderator uses a moderation command
							 * @event TwPubSub#mod-command
							 * @param {String} command The command that was executed
							 * @param {String[]} args An string array with the arguments the command was executed with
							 * @param {String} moderator The moderator that executed the command
							 */
							this.emit('mod-command', message.moderation_action, message.args, message.created_by)
							break
					}
				}

			}
		} catch(e) {
			console.error('[PubSub]', e)
		}

		if(this._topics.length == 0) {
			this._disconnect(false)
		}
	}

	/**
	 * Actions after the connection was closed
	 * 
	 * @private
	 */
	_onClose() {
		console.log('[PubSub] Connection closed')
		this._connection = null
		this._connected = false
		if(this._autoreconnect) {
			let jitter = Math.floor(Math.random()*1000)
			const self = this
			console.log('[PubSub] Reconnect in ' + (this._reconnectTimeout + jitter / 1000) + ' seconds')
			window.setTimeout(() => {
				self._connect()
			}, this._reconnectTimeout + jitter)
			if(this._reconnectTimeout < _maxReconnectTimeout) {
				this._reconnectTimeout *= 2
			}
		}
	}

	/**
	 * Disconnects from the PubSub
	 * 
	 * @private
	 * @param {boolean} [reconnect] Should a reconnect be attempted?
	 */
	_disconnect(reconnect)
	{
		if(this._connected) {
			if(typeof(reconnect) !== 'boolean') reconnect = false
			this._autoreconnect = reconnect
			this._connected = false
			this._connection.close()
		}
	}

	/**
	 * Add a topic to listen to
	 * 
	 * @async
	 * @param {String} topic 
	 */
	async listen(topic)
	{
		console.log('[PubSub] LISTEN to topic', topic)
		let index = this._topics.indexOf(topic)
		if(index < 0) {
			this._topics.push(topic)
		}
		if(this._token !== null) {
			try {
				if(!this._connected) {
					await this._connect()
				} else {
					this._out({
						type: 'LISTEN',
						data: {
							topics: [ topic ],
							auth_token: this._token
						}
					})
				}
			} catch(e) {
				console.error('[PubSub]', e)
			}
		}
	}

	/**
	 * Unlisten from a topic. If no topics a left to listen for the connection will be closed
	 * 
	 * @async
	 * @param {String} topic 
	 */
	async unlisten(topic)
	{
		console.log('[PubSub] UNLISTEN from topic', topic)
		let index = this._topics.indexOf(topic)
		if(index >= 0) {
			this._topics.splice(index, 1)
			if(this._connected) {
				this._out({
					type: 'UNLISTEN',
					data: {
						topics: [ topic ],
						auth_token: this._token
					}
				})
			}
		}
	}

}

module.exports = TwPubSub