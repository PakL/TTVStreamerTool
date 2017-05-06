"use strict"

const EventEmitter = require('events')

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

	get api() {
		return this.tool.twitchapi
	}

	get cockpit() {
		return this.tool.cockpit
	}

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

					if(emitonline) self.emit('channelonline')
					if(oldgame != self.channelobject.game) self.emit('gamechange', self.channelobject.game)
					if(oldstatus != self.channelobject.status) self.emit('statuschange', self.channelobject.status)
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

							if(emitoffline) self.emit('channeloffline')
							if(oldgame != self.channelobject.game) self.emit('gamechange', self.channelobject.game)
							if(oldstatus != self.channelobject.status) self.emit('statuschange', self.channelobject.status)
							self.emit('viewers', 0)
						} else if(err != null) {
							if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
							self.tool.ui.showErrorMessage(err)
						}

						self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
					})
					return
				}
			} else if(err != null) {
				if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
				self.tool.ui.showErrorMessage(err)
			}

			self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
		})

	}


}

module.exports = Channel