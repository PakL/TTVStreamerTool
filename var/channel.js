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
	fetchData() {
		const self = this
		if(this.cockpit.openChannelId.length <= 0) return
		this.api.getStreamByUser(this.cockpit.openChannelId, { stream_type: 'live' }, (res, err) => {
			if(res != null && res.hasOwnProperty('stream')) {
				if(res.stream != null) {
					let emitonline = !self.streamobject.hasOwnProperty('_id')
					let oldstatus = ''
					let oldgame = ''
					if(self.channelobject.hasOwnProperty('_id')) {
						oldgame = self.channelobject.game
						oldstatus = self.channelobject.status
					}
					self.streamobject = res.stream
					self.channelobject = res.stream.channel

					/**
					 * Fires when the channel goes online.
					 * @event Channel#channelonline
					 */
					if(emitonline) self.emit('channelonline')
					/**
					 * Fires when the game of the channel changes
					 * @event Channel#gamechange
					 * @param {String} newgame The new game of the channel
					 */
					if(oldgame != self.channelobject.game) self.emit('gamechange', self.channelobject.game)
					/** 
					 * Fires when the channel status/title changes
					 * @event Channel#statuschange
					 * @param {String} newtitle The new title/status of the channel
					 */
					if(oldstatus != self.channelobject.status) self.emit('statuschange', self.channelobject.status)
					/**
					 * Fires on every data polling and brings you the current viewers count
					 * @event Channel#viewers
					 * @param {Number} viewers Number of current viewers
					 */
					self.emit('viewers', self.streamobject.viewers)
				} else {
					self.api.getChannel(this.cockpit.openChannelId, (res, err) => {
						if(res != null && res.hasOwnProperty('name')) {
							let emitoffline = (this.streamobject.hasOwnProperty('_id') || !this.channelobject.hasOwnProperty('_id'))
							let oldstatus = ''
							let oldgame = ''
							if(self.channelobject.hasOwnProperty('_id')) {
								oldgame = self.channelobject.game
								oldstatus = self.channelobject.status
							}
							self.streamobject = {}
							self.channelobject = res

							/**
							 * Fires when the channel goes offline.
							 * @event Channel#channeloffline
							 */
							if(emitoffline) self.emit('channeloffline')
							if(oldgame != self.channelobject.game) self.emit('gamechange', self.channelobject.game)
							if(oldstatus != self.channelobject.status) self.emit('statuschange', self.channelobject.status)
							self.emit('viewers', 0)
						} else if(err != null) {
							if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
							self.tool.ui.showErrorMessage(err, true)
						}

						self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
					})
					return
				}
			} else if(err != null) {
				if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
				self.tool.ui.showErrorMessage(err, true)
			}

			self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
		})

	}


}

module.exports = Channel