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

	get helix() {
		return this.tool.twitchhelix
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
			stream = await this.helix.getStreams({ user_id: this.cockpit.openChannelId })
		} catch (err) {
			if(err.hasOwnProperty('message')) err.message += '\n' + this.tool.i18n.__('Click here to dismiss this message')
			this.tool.ui.showErrorMessage(err, true)
		}

		if(stream == null) {
			this.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
			return
		}

		if(stream.hasOwnProperty('data') && stream.data.length > 0) {
			let emitonline = !this.streamobject.hasOwnProperty('id')
			let oldstatus = ''
			let oldgame = ''
			if(this.channelobject.hasOwnProperty('_id')) {
				oldgame = this.channelobject.game
				oldstatus = this.channelobject.status
			} else if(this.streamobject.hasOwnProperty('id')) {
				oldgame = this.streamobject.gamename
				oldstatus = this.streamobject.title
			}
			this.streamobject = stream.data[0]
			this.streamobject.gamename = ''
			this.channelobject = {}

			let game = null
			try {
				game = await this.helix.getGames(this.streamobject.game_id)
			} catch (err) {
				this.streamobject.gamename = oldgame
				console.error(err)
			}
			if(game !== null && game.hasOwnProperty('data') && game.data.length > 0) {
				this.streamobject.gamename = game.data[0].name
			}


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
			if(oldgame != this.streamobject.gamename) this.emit('gamechange', this.streamobject.gamename)
			/** 
			 * Fires when the channel status/title changes
			 * @event Channel#statuschange
			 * @param {String} newtitle The new title/status of the channel
			 */
			if(oldstatus != this.streamobject.title) this.emit('statuschange', this.streamobject.title)
			/**
			 * Fires on every data polling and brings you the current viewers count
			 * @event Channel#viewers
			 * @param {Number} viewers Number of current viewers
			 */
			this.emit('viewers', this.streamobject.viewer_count)
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
				} else if(this.streamobject.hasOwnProperty('id')) {
					oldgame = this.streamobject.gamename
					oldstatus = this.streamobject.title
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