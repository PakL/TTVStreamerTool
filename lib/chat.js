"use strict"
const TwitchChat = require('./mod/twitchchat')

class Chat {
	constructor(username, authtoken) {
		var self = this
		this.sendingmessage = ''
		this.username = username
		this.authtoken = authtoken

		this.channel = {}
		this.channelbadges = {}
		this.channelemotes = {}
		this.currentchannel = ''

		this.chatelement = document.querySelector('#channelchat')
		this.userselement = document.querySelector('#channeluser')
		this.messagelement = document.querySelector('#chat_message')
		this.usertags = {}

		this.irc = new TwitchChat()
		this.irc.on('connect', () => {
			self.irc.auth(self.username, self.authtoken)
		})
		this.irc.on('registered', () => {
			isChatConnected = true
		})
		this.irc.on('outgoing', (msg) => {
			console.log(`[IRC] < ${msg}`)
		})
		this.irc.on('incoming', (msg) => {
			console.log(`[IRC] > ${msg}`)
		})
		this.irc.on('userstate', (to, tags) => {
			self.usertags = tags

			var user = self.username
			var display_name = user
			if(typeof(tags['display-name']) == 'string' && tags['display-name'].length > 0)
				display_name = tags['display-name']

			var badges = ''
			var sort = 0
			if(typeof(tags.badges) != 'string')
				tags.badges = ''

			var color = '#000000'
			
			if(typeof(tags.color) == 'string' && tags.color.length > 0)
				color = tags.color
			else
				color = getColor(display_name)

			var bsplit = tags.badges.split(",")
			for(var i = 0; i < bsplit.length; i++) {
				if(bsplit[i].length <= 0) continue
				var bver = bsplit[i].split("/")
				switch(bver[0]) {
					default:
						sort += 1
						break
					case "admin":
						sort += 100
						break
					case "broadcaster":
						sort += 99
						break
					case "global_mod":
						sort += 7
						break
					case "moderator":
						sort += 6
						break;
					case "subscriber":
						sort += 3
						break;
				}
				if(typeof(self.channelbadges[bver[0]]) != "undefined" && typeof(self.channelbadges[bver[0]].versions[bver[1]]) != "undefined") {
					badges += "<img src=\"" + self.channelbadges[bver[0]].versions[bver[1]].image_url_1x + "\" title=\"" + self.channelbadges[bver[0]].versions[bver[1]].title + "\">";
				}
			}

			self.userselement._tag.joinusr({ "user": user, "sort": sort, "badges": badges, "name": display_name, "color": color })
		})

		this.irc.on('join', (user, to) => {
			this.userselement._tag.joinusr({ "user": user, "sort": 0, "badges": '', "name": user, "color": getColor(user) })
		})
		this.irc.on('part', (user, to) => {
			this.userselement._tag.partusr(user)
		})
		this.irc.on('names', (to, users) => {
			self.showmsg('', '', to, 'Verbunden mit Chat in Kanal ' + to, {color: '#CCCCCC'}, true)
			self.messagelement.onkeyup = function(e){
				if(e.which == 13) {
					self.sendmsg(self.currentchannel, self.messagelement.value)
					self.messagelement.value = ''
				}
			}
		})

		this.irc.on('message', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags) })
		this.irc.on('action', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags, true) })
		this.irc.on('notice', (to, msg, tags) => {
			tags.color = '#CCCCCC'
			self.showmsg('', '', to, msg, tags, true)
		})
		this.irc.on('usernotice', (to, tags) => {
			tags.color = '#CCCCCC'
			self.showmsg('', '', to, tags['system-msg'], tags, true)
		})

		this.irc.on('clearuser', (to, user) => {
		})
		this.irc.on('clearchat', (to) => {
		})
		this.irc.on('error', (err) => {
			showErrorMessage(err.message)
		})
	}

	showmsg(prefix, user, to, msg, tags, action) {
			
		var self = this
		var org_msg = msg

		if(typeof(tags) == 'undefined') tags = []
		if(typeof(action) != 'boolean') action = false

		var display_name = user
		if(typeof(tags['display-name']) == 'string' && tags['display-name'].length > 0)
			display_name = tags['display-name']

		var color = '#000000'
		
		if(typeof(tags.color) == 'string' && tags.color.length > 0)
			color = tags.color
		else
			color = getColor(display_name)
		
		var emotes = ''
		if(typeof(tags.emotes) == 'string')
			emotes = tags.emotes
		msg = replaceEmoticons(msg, emotes)

		var badges = ''
		var sort = 0
		if(typeof(tags.badges) != 'string')
			tags.badges = ''

		var bsplit = tags.badges.split(",")
		for(var i = 0; i < bsplit.length; i++) {
			if(bsplit[i].length <= 0) continue
			var bver = bsplit[i].split("/")
			switch(bver[0]) {
				default:
					sort += 1
					break
				case "admin":
					sort += 100
					break
				case "broadcaster":
					sort += 99
					break
				case "global_mod":
					sort += 7
					break
				case "moderator":
					sort += 6
					break;
				case "subscriber":
					sort += 3
					break;
			}
			if(typeof(this.channelbadges[bver[0]]) != "undefined" && typeof(this.channelbadges[bver[0]].versions[bver[1]]) != "undefined") {
				badges += "<img src=\"" + this.channelbadges[bver[0]].versions[bver[1]].image_url_1x + "\" title=\"" + this.channelbadges[bver[0]].versions[bver[1]].title + "\">";
			}
		}

		var ts = ''
		if(tags.hasOwnProperty('sent-ts')) {
			ts = timestamp(parseInt(tags['sent-ts']))
		} else {
			ts = timestamp()
		}

		this.chatelement._tag.addmessage({
			'timestamp': ts,
			'badges_html': badges,
			'nickname': display_name,
			'message': org_msg,
			'message_html': msg,
			'user': user,
			'color': color,
			'action': action
		})
		if(user.length > 0) {
			this.userselement._tag.joinusr({ "user": user, "sort": sort, "badges": badges, "name": display_name, "color": color })
		}
	}

	join(channel) {
		if(this.currentchannel.length > 0) return
		this.irc.join(channel)
		this.currentchannel = channel
	}
	part(channel, cb) {
		this.messagelement.onkeyup = function(){}
		this.irc.part(channel, cb)
		this.currentchannel = ''
	}

	sendmsg(channel, message) {
		this.sendingmessage = message
		this.irc.say(channel, message)
		this.showmsg('', this.username, channel, message, this.usertags)
	}

	disconnect() {
		this.irc.disconnect()
	}
}
riot.mount(document.querySelector('#channelchat'))
riot.mount(document.querySelector('#channeluser'))