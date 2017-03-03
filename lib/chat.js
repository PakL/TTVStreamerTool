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
		this.actionsElement = document.querySelector('#channelactions')
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
			self.userselement._tag.joinusr(self.getUserObjByTags(self.username, tags))
		})

		this.irc.on('join', (user, to) => {
			self.userselement._tag.joinusr({ user: user, sort: 0, badges: '', name: user, color: getColor(user), nooverwrite: true })
		})
		this.irc.on('part', (user, to) => {
			self.userselement._tag.partusr(user)
		})
		this.irc.on('names', (to, users) => {
			self.showmsg('', '', to, 'Verbunden mit Chat in Kanal ' + to, {color: '#999999'}, 1)
			self.messagelement.onkeyup = function(e){
				if(e.which == 13) {
					self.sendmsg(self.currentchannel, self.messagelement.value)
					self.messagelement.value = ''
				}
			}
			for(var i = 0; i < users.length; i++) {
				self.userselement._tag.joinusr({ user: users[i], sort: 0, badges: '', name: users[i], color: getColor(users[i]), nooverwrite: true })
			}
		})

		this.irc.on('message', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags) })
		this.irc.on('action', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags, 1) })
		this.irc.on('notice', (to, msg, tags) => {
			tags.color = '#999999'
			self.showmsg('', '', to, msg, tags, true)
		})
		this.irc.on('usernotice', (to, tags, msg) => {
			var usr = self.getUserObjByTags(tags.login, tags)
			var tagsSystem = tags
			tagsSystem.emotes = ''
			self.showmsg('', '', to, tags['system-msg'], tagsSystem, 2)
			if(msg.length > 0) {
				self.showmsg('', '', to, msg, tags, 3)
			}
			if(tags['msg-id'] == 'resub') {
				self.actionsElement._tag.addAction(usr, 'hat zum ' + tags['msg-param-months'] + '. in Folge Monat subscribed!', timestamp(intval(tags['tmi-sent-ts']), true))
			}
		})

		this.irc.on('clearuser', (to, user) => {
		})
		this.irc.on('clearchat', (to) => {
		})
		this.irc.on('error', (err) => {
			showErrorMessage(err.message)
		})
	}

	getUserObjByTags(user, tags) {
		var display_name = user
		if(typeof(tags['display-name']) == 'string' && tags['display-name'].length > 0)
			display_name = tags['display-name']

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

		this.chatelement._tag.addmessage({
			'timestamp': ts,
			'badges_html': userobj.badges,
			'nickname': userobj.name,
			'message': org_msg,
			'message_html': msg,
			'user': user,
			'color': userobj.color,
			'type': type
		})
		if(user.length > 0) {
			this.userselement._tag.joinusr(userobj)
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
riot.mount(document.querySelector('#channelactions'))