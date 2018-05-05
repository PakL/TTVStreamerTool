"use strict"

const EventEmitter = require('events')

/**
 * This module polls channel followers on a regular basis and emits events on changes
 * 
 * @class Follows
 * @extends {EventEmitter}
 * @param {TTVTool} tool
 * @fires Follows#follow
 */
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
		
		let followers = null
		try {
			followers = await this.api.getChannelFollowers(this.cockpit.openChannelId, { direction: 'desc' })
		} catch(err) {
			if(err.hasOwnProperty('message')) err.message += '\n' + this.tool.i18n.__('Click here to dismiss this message')
			this.tool.ui.showErrorMessage(err, true)
		}

		if(followers != null && followers.hasOwnProperty('follows')) {
			let follows = followers.follows
			follows.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
			for(let i = 0; i < follows.length; i++) {
				let f = follows[i]
				if(new Date(f.created_at).getTime() > this.latestFollow) {
					let dn = f.user.display_name
					if(!this.tool.settings.showLocalizedNames && !dn.match(/^[a-z0-9_\-]+$/i))
						dn = f.user.name
					let usr = {
						user: f.user.name,
						name: dn,
						color: this.tool.chat.userselement._tag.getUserColor(f.user.name)
					}

					/**
					 * Fires when a new follower appears in the list
					 * @event Follows#follow
					 * @param {Follows~userObject} user The user with username, display name and color
					 * @param {Object} raw The raw follow object from the api
					 */
					this.emit('follow', usr, f)
					this.latestFollow = new Date(f.created_at).getTime()
				}
			}
		}

		this.timer = setTimeout(() => { this.fetchData() }, (30000 - (new Date().getTime() % 30000)))
	}

}

/**
 * An abstraction of the {@link Chat~userObject} but with less properties
 * @typedef {Object} Follows~userObject
 * @property {String} user Twitch user name
 * @property {String} name Twitch display name
 * @property {String} color Hex color string prepended by a #
 */

module.exports = Follows