"use strict"

const EventEmitter = require('events')

class Follows extends EventEmitter {

	constructor(tool) {
		super()
		this.tool = tool

		this.latestFollow = 0
		this.timer = null
		
		const self = this
		this.tool.cockpit.on('channelopen', () => {
			self.fetchData()
		})
		this.tool.cockpit.on('channelleft', () => {
			self.latestFollow = 0
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
		
		this.api.getChannelFollowers(this.cockpit.openChannelId, { direction: 'desc' }, (res, err) => {
			if(res != null && res.hasOwnProperty('follows')) {
				let follows = res.follows
				follows.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
				for(let i = 0; i < follows.length; i++) {
					let f = follows[i]
					if(new Date(f.created_at).getTime() > self.latestFollow) {
						let dn = f.user.display_name
						if(!self.tool.settings.showLocalizedNames && !dn.match(/^[a-z0-9_\-]+$/i))
							dn = f.user.name
						let usr = {
							user: f.user.name,
							name: dn,
							color: self.tool.chat.userselement._tag.getUserColor(f.user.name)
						}

						self.emit('follow', usr, f)
						self.latestFollow = new Date(f.created_at).getTime()
					}
				}
			} else if(err != null) {
				if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
				self.tool.ui.showErrorMessage(err)
			}

			self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
		})
	}

}

module.exports = Follows