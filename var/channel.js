"use strict"

const EventEmitter = require('events')

/**
 * This module polls channel and stream data on a regular basis and emits events on changes
 * 
 * @class Channel
 * @extends {EventEmitter}
 * @param {TTVTool} tool
 * @fires {Channel#channelonline}
 * @fires {Channel#channeloffline}
 * @fires {Channel#gamechange}
 * @fires {Channel#statuschange}
 * @fires {Channel#viewers}
 */
class Channel extends EventEmitter {

	constructor(tool) {
		super()

		this.tool = tool
		this.channelobject = {}
		this.streamobject =  {}
		this.timer = null
		
		const self = this
		this.tool.cockpit.on('channelopen', () => {
			self.fetchData()
		})
		this.tool.cockpit.on('channelleft', () => {
			this.channelobject = {}
			this.streamobject =  {}
			clearTimeout(self.timer)
		})
	}

	/**
	 * Shortcut to the twitch api object
	 * 
	 * @readonly
	 * @private
	 */
	get api() {
		return this.tool.twitchapi
	}

	/**
	 * Shortcut to the cockpit
	 * 
	 * @readonly
	 * @private
	 */
	get cockpit() {
		return this.tool.cockpit
	}

	/**
	 * Fetches data every 30 seconds. Do not call this manually.
	 * 
	 * @async
	 * @private
	 */
	async fetchData() {
		const self = this
		if(this.cockpit.openChannelId.length <= 0) return

		let stream = null
		let channel = null
		try {
			stream = await this.api.getStreamByUser(this.cockpit.openChannelId, { stream_type: 'live' })
		} catch (err) {
			if(err.hasOwnProperty('message')) err.message += '\n' + this.tool.i18n.__('Click here to dismiss this message')
			this.tool.ui.showErrorMessage(err, true)
		}

		if(stream !== null && stream.hasOwnProperty('stream') && stream.stream != null) {
			let emitonline = !this.streamobject.hasOwnProperty('_id')
			let oldstatus = ''
			let oldgame = ''
			if(this.channelobject.hasOwnProperty('_id')) {
				oldgame = this.channelobject.game
				oldstatus = this.channelobject.status
			}
			this.streamobject = stream.stream
			this.channelobject = stream.stream.channel

			/**
			 * Fires when the channel goes online.
			 * @event Channel#channelonline
			 */
			if(emitonline) this.emit('channelonline')
			/**
			 * Fires when the game of the channel changes
			 * @event Channel#gamechange
			 * @param {String} newgame The new game of the channel
			 */
			if(oldgame != this.channelobject.game) this.emit('gamechange', this.channelobject.game)
			/** 
			 * Fires when the channel status/title changes
			 * @event Channel#statuschange
			 * @param {String} newtitle The new title/status of the channel
			 */
			if(oldstatus != this.channelobject.status) this.emit('statuschange', this.channelobject.status)
			/**
			 * Fires on every data polling and brings you the current viewers count
			 * @event Channel#viewers
			 * @param {Number} viewers Number of current viewers
			 */
			this.emit('viewers', this.streamobject.viewers)
		} else {
			try {
				channel = await this.api.getChannel(this.cockpit.openChannelId)
			} catch(err) {
				if(err.hasOwnProperty('message')) err.message += '\n' + this.tool.i18n.__('Click here to dismiss this message')
				this.tool.ui.showErrorMessage(err, true)
			}

			if(channel != null && channel.hasOwnProperty('name')) {
				let emitoffline = (this.streamobject.hasOwnProperty('_id') || !this.channelobject.hasOwnProperty('_id'))
				let oldstatus = ''
				let oldgame = ''
				if(this.channelobject.hasOwnProperty('_id')) {
					oldgame = this.channelobject.game
					oldstatus = this.channelobject.status
				}
				this.streamobject = {}
				this.channelobject = channel

				/**
				 * Fires when the channel goes offline.
				 * @event Channel#channeloffline
				 */
				if(emitoffline) this.emit('channeloffline')
				if(oldgame != this.channelobject.game) this.emit('gamechange', this.channelobject.game)
				if(oldstatus != this.channelobject.status) this.emit('statuschange', this.channelobject.status)
				this.emit('viewers', 0)
			} else {
				let err =  this.tool.i18n.__('Unexpected response') + '\n' + this.tool.i18n.__('Click here to dismiss this message')
				this.tool.ui.showErrorMessage(err, true)
			}
		}

		this.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
	}


}

module.exports = Channel