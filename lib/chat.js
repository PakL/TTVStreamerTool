"use strict"
const TwitchChat = require('../mod/twitchchat')
const EventEmitter = require('events')

const debug = true

class Chat extends EventEmitter {
	constructor(tool) {
		super()
		const self = this
		this.tool = tool

		this.sendingmessage = ''
		this.username = ''
		this.authtoken = ''

		this.channel = {}
		this.channelbadges = {}
		this.channelemotes = {}
		this.currentchannel = ''

		this.chatelement = null
		this.userselement = null
		this.messagelement = null
		this.actionsElement = null
		this.usertags = {}

		this.connected = false

		this.irc = new TwitchChat()
		this.irc.on('connect', () => {
			self.irc.auth(self.username, self.authtoken)
		})
		this.irc.on('registered', () => {
			self.connected = true
			self.emit('connected')
		})
		this.irc.on('outgoing', (msg) => {
			if(!self.connected || debug) {
				console.log(`[IRC] < ${msg}`)
			}
		})
		this.irc.on('incoming', (msg) => {
			if(!self.connected || debug) {
				console.log(`[IRC] > ${msg}`)
			}
		})
		this.irc.on('userstate', (to, tags) => {
			self.usertags[to] = tags
			self.emit('userstate', to, self.getUserObjByTags(self.username, tags), tags)
		})

		this.irc.on('join', (user, to) => {
			self.emit('join', to, { user: user, sort: 0, badges: '', name: user, color: getColor(user), nooverwrite: true })
		})
		this.irc.on('part', (user, to) => {
			self.emit('part', to, { user: user, sort: 0, badges: '', name: user, color: getColor(user), nooverwrite: true })
			
		})
		this.irc.on('names', (to, users) => {
			self.showmsg('', '', to, self.tool.i18n.__('Connected to chat in channel {{channel}}', {channel: '#'+to}), {color: '#999999'}, 1)
			let usersObjects = []
			for(var i = 0; i < users.length; i++) {
				usersObjects.push({ user: users[i], sort: 0, badges: '', name: users[i], color: getColor(users[i]), nooverwrite: true })
			}
			self.emit('names', to, usersObjects)
		})

		this.irc.on('message', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags) })
		this.irc.on('action', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags, 1) })
		this.irc.on('whisper', (prefix, user, from, msg, tags) => {
			self.showmsg('', user, from, msg, tags, 4)
		})
		this.irc.on('notice', (to, msg, tags) => {
			tags.color = '#999999'
			self.showmsg('', '', to, msg, tags, 1)
		})
		this.irc.on('usernotice', (to, tags, msg) => {
			var usr = self.getUserObjByTags(tags.login, tags)
			var tagsSystem = tags
			tagsSystem.emotes = ''
			self.showmsg('', '', to, tags['system-msg'], tagsSystem, 2)
			if(msg.length > 0) {
				self.showmsg('', '', to, msg, tags, 3)
			}

			self.emit('usernotice', to, usr, tags, msg)
		})

		this.irc.on('clearuser', (to, user, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			this.emit('clearuser', to, usr, tags)
		})
		this.irc.on('clearchat', (to, tags) => {
			this.emit('clearchat', to, tags)
		})
		this.irc.on('hostingyou', (to, user, viewers, msg, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			self.showmsg('', '', to, msg, self.usertags[to], 2)

			self.emit('hostingyou', to, usr, viewers, msg, tags)
		})
		this.irc.on('autohostingyou', (to, user, viewers, msg, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			self.showmsg('', '', to, msg, self.usertags[to], 2)

			self.emit('autohostingyou', to, usr, viewers, msg, tags)
		})
		this.irc.on('error', (err) => {
			showErrorMessage(err.message)
		})

		this.tool.auth.on('complete', () => {
			self.auth(self.tool.auth.username, self.tool.twitchapi.token)
		})
		this.tool.on('load', () => {
			self.chatelement = document.querySelector('#channelchat')
			self.userselement = document.querySelector('#channeluser')
			self.messagelement = document.querySelector('#chat_message')
			self.actionsElement = document.querySelector('#channelactions')
			
		})
		this.tool.on('exit', () => { self.disconnect() })
	}

	auth(username, authtoken) {
		this.username = username
		this.authtoken = authtoken
		this.irc.connect()
	}

	getUserObjByTags(user, tags) {
		var display_name = user
		if(typeof(tags['display-name']) == 'string' && tags['display-name'].length > 0) {
			display_name = tags['display-name']
			if(!this.tool.settings.showLocalizedNames && !display_name.match(/^[a-z0-9_\-]+$/i)) {
				display_name = user
			}
		}

		var color = '#000000'
		
		if(typeof(tags.color) == 'string' && tags.color.length > 0) {
			color = tags.color
			if(!isGoodYIQ(color)) {
				color = makeColorLighter(color)
			}
		} else
			color = getColor(user)

		var badges = ''
		var sort = 0
		if(typeof(tags.badges) != 'string')
			tags.badges = ''

		var bsplit = tags.badges.split(',')
		for(var i = 0; i < bsplit.length; i++) {
			if(bsplit[i].length <= 0) continue
			var bver = bsplit[i].split('/')
			switch(bver[0]) {
				case 'admin':
					sort += 9999
					break
				case 'broadcaster':
					sort += 9998
					break
				case 'global_mod':
					sort += 5000
					break
				case 'moderator':
					sort += 4000
					break;
				case 'subscriber':
					sort += 10
					break;
			}
			if(typeof(this.channelbadges[bver[0]]) != 'undefined' && typeof(this.channelbadges[bver[0]].versions[bver[1]]) != 'undefined') {
				badges += '<img src="' + this.channelbadges[bver[0]].versions[bver[1]].image_url_1x + '" title="' + this.channelbadges[bver[0]].versions[bver[1]].title + '">'
			}
		}

		return { user: user, name: display_name, color: color, sort: sort, badges: badges }
	}

	showmsg(prefix, user, to, msg, tags, type) {
			
		var self = this
		var org_msg = msg

		if(typeof(tags) == 'undefined') tags = []
		if(typeof(type) != 'number') type = 0
		
		var emotes = ''
		if(typeof(tags.emotes) == 'string')
			emotes = tags.emotes
		msg = replaceEmoticons(msg, emotes)

		var ts = ''
		if(tags.hasOwnProperty('sent-ts')) {
			ts = timestamp(parseInt(tags['sent-ts']))
		} else {
			ts = timestamp()
		}

		var userobj = this.getUserObjByTags(user, tags)

		if(type == 0) {
			let highlights = this.tool.settings.highlights
			for(var i = 0; i < highlights.length; i++) {
				if(highlights[i].regex) {
					try {
						var r = new RegExp(highlights[i].phrase, (highlights[i].casesensitive ? '' : 'i'))
						if(org_msg.match(r) != null) {
							type = 5
							break;
						}
					} catch(e) {}
				} else {
					if(
						(highlights[i].casesensitive && org_msg.indexOf(highlights[i].phrase) >= 0) ||
						(!highlights[i].casesensitive && org_msg.toLowerCase().indexOf(highlights[i].phrase.toLowerCase()) >= 0)
					) {
						type = 5
						break;
					}
				}
			}
		}

		this.emit('chatmessage', to, ts, userobj, msg, org_msg, type)
	}

	join(channel) {
		//if(this.currentchannel.length > 0) return
		this.irc.join(channel)
		//this.currentchannel = channel
	}
	part(channel, cb) {
		//this.messagelement.onkeyup = function(){}
		this.irc.part(channel, cb)
		//this.currentchannel = ''
	}

	sendmsg(channel, message, emotes) {
		if(typeof(emotes) != "object") emotes = {emoticon_sets:{}}
		this.sendingmessage = message
		if(message.toLowerCase().startsWith('/join ')) {
			this.join(message.substr(6))
			return
		}
		if(message.toLowerCase().startsWith('/part ')) {
			this.part(message.substr(6))
			return
		}
		this.irc.say(channel, message)
		var type = 0
		if(message.toLowerCase().startsWith('/w ')) {
			type = 4
			message = message.substr(3)
			message = '-> ' + message.substring(0, message.indexOf(' ')) + ':' + message.substring(message.indexOf(' '))
		}
		if(message.toLowerCase().startsWith('/me ')) {
			type = 1
			message = message.substr(4)
		}
		if(!message.startsWith('/')) {
			let msgtags = this.usertags[channel]
			msgtags.emotes = findEmoticons(message, emotes)
			this.showmsg('', this.username, channel, message, msgtags, type)
		}
	}

	disconnect() {
		this.irc.disconnect()
	}
}

module.exports = Chat