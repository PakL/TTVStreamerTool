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
		this.fetching = false
		this.stopfetching = false
		
		const self = this
		this.tool.cockpit.on('channelopen', () => {
			this.channelobject = {}
			this.streamobject =  {}
			this.stopfetching = false
			this.lastminute = -1
			if(!this.fetching) {
				self.fetchData()
			}
		})
		this.tool.cockpit.on('channelleft', () => {
			this.stopfetching = true
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
	 * Fetches data every 5 seconds. Do not call this manually.
	 * 
	 * @async
	 * @private
	 */
	async fetchData() {
		const self = this
		if(this.cockpit.openChannelId.length <= 0) return
		this.fetching = true
		this.timer = null

		let stream = null
		let channel = null
		try {
			stream = await this.helix.getStreams({ user_id: this.cockpit.openChannelId })
		} catch (err) {
			if(err.hasOwnProperty('message')) err.message += '\n' + this.tool.i18n.__('Click here to dismiss this message')
			this.tool.ui.showErrorMessage(err, true)
		}

		if(stream == null) {
			if(!this.stopfetching) {
				this.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
				this.fetching = false
			}
			return
		}

		if(stream.hasOwnProperty('data') && stream.data.length > 0) {
			let emitonline = !this.streamobject.hasOwnProperty('id')
			let oldstatus = ''
			let oldgame = ''
			let oldgameid = 0
			if(this.channelobject.hasOwnProperty('_id')) {
				oldgame = this.channelobject.game
				oldstatus = this.channelobject.status
			} else if(this.streamobject.hasOwnProperty('id')) {
				oldgame = this.streamobject.gamename
				oldstatus = this.streamobject.title
				oldgameid = this.streamobject.game_id
			}
			this.streamobject = stream.data[0]
			this.streamobject.gamename = ''
			this.channelobject = {}

			if(oldgameid == this.streamobject.game_id) {
				this.streamobject.gamename = oldgame
			} else {
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
			}


			if(!this.stopfetching) {
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
			}
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

				if(!this.stopfetching) {
					/**
					 * Fires when the channel goes offline.
					 * @event Channel#channeloffline
					 */
					if(emitoffline) this.emit('channeloffline')
					if(oldgame != this.channelobject.game) this.emit('gamechange', this.channelobject.game)
					if(oldstatus != this.channelobject.status) this.emit('statuschange', this.channelobject.status)
					this.emit('viewers', 0)
				}
			} else {
				let err =  this.tool.i18n.__('Unexpected response') + '\n' + this.tool.i18n.__('Click here to dismiss this message')
				this.tool.ui.showErrorMessage(err, true)
			}
		}

		if(!this.stopfetching) {
			this.timer = setTimeout(() => { self.fetchData() }, (5000 - (new Date().getTime() % 5000)))
			this.fetching = false
		}
	}

	async updatedStatusViaCockpit(status)
	{
		let changed = false
		if(this.channelobject.hasOwnProperty('status')) {
			if(this.channelobject.status != status) {
				this.channelobject.status = status
				changed = true
			}
		}
		if(this.streamobject.hasOwnProperty('title')) {
			if(this.streamobject.title != status) {
				this.streamobject.title = status
				changed = true
			}
		}
		if(changed) {
			this.emit('statuschange', status)
		}
	}

	async updatedGameViaCockpit(game)
	{
		if(this.channelobject.hasOwnProperty('game')) {
			if(this.channelobject.game != game) {
				this.channelobject.game = game
				this.emit('gamechange', this.channelobject.game)
			}
		} else if(this.streamobject.hasOwnProperty('game_id')) {
			if(!this.streamobject.hasOwnProperty('gamename') || this.streamobject.gamename != game) {
				let gameReq = null
				try {
					gameReq = await this.helix.getGames([], [game])
				} catch (err) {
					console.error(err)
				}
				if(gameReq !== null && gameReq.hasOwnProperty('data') && gameReq.data.length > 0) {
					this.streamobject.game_id = game.data[0].id
					this.streamobject.gamename = game.data[0].name
				} else {
					this.streamobject.game_id = 0
					this.streamobject.gamename = ''
				}
				this.emit('gamechange', this.streamobject.gamename)
			}
		}
	}


}

module.exports = Channel