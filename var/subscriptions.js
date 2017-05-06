"use strict"

const EventEmitter = require('events')

class Subscriptions extends EventEmitter {

	constructor(tool) {
		super()
		this.tool = tool

		this.skipSubscriptions = false
		this.latestSubscriber = 0
		this.timer = null
		
		const self = this
		this.tool.cockpit.on('channelopen', () => {
			self.fetchData()
		})
		this.tool.cockpit.on('channelleft', () => {
			self.skipSubscriptions = false
			self.latestSubscriber = 0
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
		
		this.api.getChannelSubscribers(this.cockpit.openChannelId, { direction: 'desc' }, (res, err) => {
			if(res != null && res.hasOwnProperty('subscriptions')) {
				let subscriptions = res.subscriptions
				subscriptions.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
				for(let i = 0; i < subscriptions.length; i++) {
					let s = subscriptions[i]
					if(new Date(s.created_at).getTime() > self.latestSubscriber) {
						let dn = d.user.display_name
						if(!self.tool.settings.showLocalizedNames && !dn.match(/^[a-z0-9_\-]+$/i))
							dn = f.user.name
						let usr = {
							user: s.user.name,
							name: dn,
							color: self.tool.chat.userselement._tag.getUserColor(s.user.name)
						}

						self.emit('subscription', usr, s)
						self.latestSubscriber = new Date(s.created_at).getTime()
					}
				}
			} else if(err != null) {
				if(err.message.match(/API request failed for (.+?) with status code (403|422)/i)) {
					self.skipSubscriptions = true
				} else {
					if(err.hasOwnProperty('message')) err.message += '\n' + self.tool.i18n.__('Click here to dismiss this message')
					self.tool.ui.showErrorMessage(err)
				}
			}

			if(!self.skipSubscriptions)
				self.timer = setTimeout(() => { self.fetchData() }, (30000 - (new Date().getTime() % 30000)))
		})
	}

}

module.exports = Subscriptions