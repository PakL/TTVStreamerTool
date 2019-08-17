const TwitchChat = require('../lib/twitchchat')
const EventEmitter = require('events')
const {BrowserWindow} = require('electron').remote
const request = require('request')

/**
 * This module makes more useable events out of the irc interface
 * 
 * @class Chat
 * @extends {EventEmitter}
 * @param {TTVTool} tool
 * @fires Chat#connected
 * @fires Chat#userstate
 * @fires Chat#join
 * @fires Chat#part
 * @fires Chat#names
 * @fires Chat#clearuser
 * @fires Chat#clearchat
 * @fires Chat#usernotice
 * @fires Chat#hostingyou
 * @fires Chat#autohostingyou
 * @fires Chat#chatmessage
 * @fires Chat#sendmessage
 */
class Chat extends EventEmitter {
	constructor(tool) {
		super()
		const self = this
		
		this.setMaxListeners(100)

		this.tool = tool

		this.sendingmessage = ''
		this.username = ''
		this.authtoken = ''

		this.channel = {}
		this.channelbadges = {}
		this.botbadge = {}
		this.channelemotes = {}
		this.channelcheers = {}
		this.currentchannel = ''

		this.chatelement = null
		this.userselement = null
		this.messagelement = null
		this.actionsElement = null
		this.usertags = {}

		/**
		 * Is the irc connection established and the user logged in. You can listen to the {@link Chat#event:connected|connected} event in case of false.
		 */
		this.connected = false

		/**
		 * The irc connection
		 * @type {TwitchChat}
		 */
		this.irc = new TwitchChat()
		this.irc.on('connect', () => {
			self.irc.auth(self.username, self.authtoken)
		})
		this.irc.on('registered', () => {
			self.connected = true
			/**
			 * Fires when the connection is established and a user is logged in
			 * @event Chat#connected
			 */
			self.emit('connected')
		})
		this.irc.on('capack', () => {
			if(self.tool.cockpit.openChannelId.length > 0) {
				self.join(self.tool.cockpit.openChannelObject.login)
			}
		})
		this.irc.on('reconnect', (timeout) => {
			if(self.tool.cockpit.openChannelId.length > 0) {
				if(timeout == 0) {
					self.showmsg('', '', self.tool.cockpit.openChannelObject.login, self.tool.i18n.__('Connection to TMI was lost. Reconnecting...'), {}, 1)
				} else {
					self.showmsg('', '', self.tool.cockpit.openChannelObject.login, self.tool.i18n.__('Connection to TMI was lost. Next reconnection attempt in {{timeout}} seconds...', {timeout: timeout}), {}, 1)
				}
			}
		})
		this.irc.on('outgoing', (msg) => {
			console.log(`[IRC] < ${msg}`)
		})
		this.irc.on('incoming', (msg) => {
			console.log(`[IRC] > ${msg}`)
		})
		this.irc.on('roomstate', (to, tags) => {
			/**
			 * Fires when the server sends a roomstate and defines the state the joined channel is in
			 * @event Chat#roomstate
			 * @param {String} channel The channel the roomstate was sent to
			 * @param {Object} tags The tags of the roomstate
			 * @see {@link TwitchChat#event:userstate}
			 */
			self.emit('roomstate', to, tags)
		})
		this.irc.on('userstate', (to, tags) => {
			self.usertags[to] = tags
			/**
			 * Fires when the server sends a userstate and defines the state the logged in user is in for this channel (contains badges, permission and such)
			 * @event Chat#userstate
			 * @param {String} channel The channel the userstate was sent to
			 * @param {Chat~userObject} user The user object of the logged in user
			 * @param {Object} tags The tags of the userstate
			 * @see {@link TwitchChat#event:userstate}
			 */
			self.emit('userstate', to, self.getUserObjByTags(self.username, tags), tags)
		})

		this.irc.on('join', (user, to) => {
			/**
			 * Fires when someone joines the channel
			 * @event Chat#join
			 * @param {String} channel
			 * @param {Chat~userObject} user The user object of the joining user. Is definitely incomplete since twitch sends no tags with the join action
			 */
			self.emit('join', to, { user: user, sort: 0, badges: '', name: user, color: getColor(user), nooverwrite: true })
		})
		this.irc.on('part', (user, to) => {
			/**
			 * Fires when someone leaves the channel
			 * @event Chat#part
			 * @param {String} channel
			 * @param {Chat~userObject} user The user object of the leaving user. Is definitely incomplete since twitch sends no tags with the part action
			 */
			self.emit('part', to, { user: user, sort: 0, badges: '', name: user, color: getColor(user), nooverwrite: true })
			
		})
		this.irc.on('names', (to, users) => {
			self.showmsg('', '', to, self.tool.i18n.__('Connected to chat in channel {{channel}}', {channel: '#'+to}), {color: '#999999'}, 1)
			let usersObjects = []
			for(var i = 0; i < users.length; i++) {
				usersObjects.push({ user: users[i], sort: 0, badges: '', name: users[i], color: getColor(users[i]), nooverwrite: true })
			}
			/**
			 * Fires when the logged in user joines a channel. Twitch sends all user in a channel if the number is under 100. So this array might be empty
			 * @event Chat#names
			 * @param {String} channel The channel this user list belongs to
			 * @param {Array<Chat~userObject>} userobjects An array of userobjects that are in this channel
			 */
			self.emit('names', to, usersObjects)
		})

		this.irc.on('message', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags) })
		this.irc.on('action', (prefix, user, to, msg, tags) => { self.showmsg(prefix, user, to, msg, tags, 1) })
		this.irc.on('whisper', (prefix, user, from, msg, tags) => {
			self.showmsg('', user, from, msg, tags, 4)
		})
		this.irc.on('notice', (to, msg, tags) => {
			tags.color = '#999999'
			if(typeof(tags['msg-id']) === 'string' && tags['msg-id'] == 'host_on') {
				let hostchannel = msg.match(/^Now hosting ([0-9a-z\-_]+)\.$/i)
				if(hostchannel) {
					tags.channellink = hostchannel[1]
				}
			}
			self.showmsg('', '', to, msg, tags, 1)
		})
		this.irc.on('usernotice', (to, tags, msg) => {
			var usr = self.getUserObjByTags(tags.login, tags)
			var tagsSystem = Object.assign({}, tags)
			tagsSystem.emotes = ''
			if(!self.tool.settings.filterSubscriptions) {
				if(tags['msg-id'] != 'rewardgift') {
					self.showmsg('', '', to, tags['system-msg'], tagsSystem, 2)
				}
				if(msg.length > 0) {
					self.showmsg('', '', to, msg, tags, 3)
				}
			}

			/**
			 * Fires when a user shares is (re)subscription. There might be up to two {@link Chat#event:chatmessage|chatmessage} events emitted before this.
			 * @event Chat#usernotice
			 * @param {String} channel The channel this usernotice was sent to
			 * @param {Chat~userObject} user The userobject of the subscriber
			 * @param {Object} tags All tags of the message
			 * @param {String} message The message the user added to his sub share. Might be empty.
			 */
			self.emit('usernotice', to, usr, tags, msg)
		})

		this.irc.on('clearuser', (to, user, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			/**
			 * Fires when messages of a specific user was deleted.
			 * @event Chat#clearuser
			 * @param {String} channel The channel the messages were deleted in
			 * @param {Chat~userObject} user The user the messages were deleted from
			 * @param {String} tags The message tags
			 */
			this.emit('clearuser', to, usr, tags)
		})
		this.irc.on('clearchat', (to, tags) => {
			/**
			 * Fires when the entire chat is being cleared
			 * @event Chat#clearchat
			 * @param {String} channel The channel that is being cleared
			 * @param {Object} tags The message tags
			 */
			this.emit('clearchat', to, tags)
		})
		this.irc.on('clearmsg', (to, user, msgId) => {
			var usr = self.getUserObjByTags(user, {})
			/**
			 * Fires when a specific messages was deleted.
			 * @event Chat#clearuser
			 * @param {String} channel The channel the message were deleted in
			 * @param {Chat~userObject} user The user the message were deleted from
			 * @param {String} msgId The message id of the deleted message
			 */
			this.emit('clearmsg', to, usr, msgId)
		})
		this.irc.on('hostingyou', (to, user, viewers, msg, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			self.showmsg('', '', to, msg, self.usertags[to], 2)

			/**
			 * Fires when someone is hosting the channel. Only the channel owner will receive these.
			 * @event Chat#hostingyou
			 * @param {String} channel Channel that the message was sent to
			 * @param {Chat~userObject} user The user that hosts you
			 * @param {Number} viewers How many viewers are being hosted
			 * @param {String} message The system message
			 * @param {Object} tags Tag object
			 */
			self.emit('hostingyou', to, usr, viewers, msg, tags)
		})
		this.irc.on('autohostingyou', (to, user, viewers, msg, tags) => {
			var usr = self.getUserObjByTags(user, tags)
			self.showmsg('', '', to, msg, self.usertags[to], 2)

			/**
			 * Fires when someone is hosting the channel. Only the channel owner will receive these.
			 * @event Chat#autohostingyou
			 * @param {String} channel Channel that the message was sent to
			 * @param {Chat~userObject} user The user that hosts you
			 * @param {Number} viewers How many viewers are being hosted
			 * @param {String} message The system message
			 * @param {Object} tags Tag object
			 */
			self.emit('autohostingyou', to, usr, viewers, msg, tags)
		})
		this.irc.on('error', (err) => {
			console.error(err)
			self.disconnect()
		})

		this.tool.auth.on('complete', () => {
			self.auth(self.tool.auth.username, self.tool.twitchapi.token)
		})
		this.tool.once('load', () => {
			self.chatelement = document.querySelector('#channelchat')
			self.userselement = document.querySelector('#channeluser')
			self.messagelement = document.querySelector('#chat_message')
			self.actionsElement = document.querySelector('#channelactions')
			
			request.get('https://api.frankerfacez.com/v1/badge/bot', { timeout: 10000 }, (err, resp, body) => {
				if(!err && resp.statusCode === 200) {
					try {
						let badge = JSON.parse(body)
						if(typeof(badge.badge) !== 'undefined' && typeof(badge.users) !== 'undefined') {
							self.botbadge = badge
						}
					} catch(e) {}
				}
			})
		})
		this.tool.on('exit', () => { self.disconnect() })
	}

	/**
	 * Set the username and auth token and connects to the irc
	 * 
	 * @param {String} username The username that is being logged in as
	 * @param {String} authtoken The twitch api token to login with
	 */
	auth(username, authtoken) {
		this.username = username
		this.authtoken = authtoken
		this.irc.connect()
	}

	isBot(username)
	{
		if(typeof(this.botbadge.badge) !== 'undefined' && typeof(this.botbadge.users) !== 'undefined') {
			if(this.botbadge.users[this.botbadge.badge.id].indexOf(username.toLowerCase()) >= 0) {
				return true
			}
		}
		return false
	}

	getBotBadge(ismod)
	{
		if(typeof(ismod) !== 'boolean') ismod = false
		if(typeof(this.botbadge.badge) !== 'undefined') {
			let burl = this.botbadge.badge.image
			if(burl.startsWith('//')) burl = 'https:' + burl
			return '<img src="' + burl + '" title="' + this.botbadge.badge.title + (ismod ? ' Moderator' : '') + '" style="background:' + (ismod ? '#34ae0a' : this.botbadge.badge.color) + '">'
		}
		return ''
	}

	/**
	 * Generate an user object from the username and the tags, that were given with a message
	 * 
	 * @param {String} user A username
	 * @param {Object} tags The twitch irc tags that were given
	 * @returns {Chat~userObject} Always returns a complete object, but properties might be empty or incomplete because of missing tags
	 */
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
		var hasBotBadge = false
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
			if(bver[0] == 'moderator' && this.isBot(user)) {
				badges += this.getBotBadge(true)
				hasBotBadge = true
			} else if(typeof(this.channelbadges[bver[0]]) != 'undefined' && typeof(this.channelbadges[bver[0]].versions[bver[1]]) != 'undefined') {
				badges += '<img src="' + this.channelbadges[bver[0]].versions[bver[1]].image_url_1x + '" title="' + this.channelbadges[bver[0]].versions[bver[1]].title + '">'
			}
		}
		if(!hasBotBadge && this.isBot(user)) {
			badges = this.getBotBadge(false) + badges
		}

		return { user: user, name: display_name, color: color, sort: sort, badges: badges }
	}

	/**
	 * Prepares a message and emits the chatmessage event. It replaces emotes, checks for highlights and creates a user object by the tags
	 * 
	 * @param {(null|Object)} prefix Might be the prefix object
	 * @param {String} prefix.user Username in the prefix
	 * @param {String} prefix.host Host in the prefix
	 * @param {String} user Username of the user that sent the message. Might be empty
	 * @param {String} to Channel that the message was sent to
	 * @param {String} msg The messages that was sent
	 * @param {Object} tags The message tags
	 * @param {Number} type The type of message that was sent.
	 *                      0 - Default user message
	 *                      1 - Action message (message font color similar to user name color)
	 *                      2 - Server message (darker background, no username)
	 *                      3 - Important user message (darker background)
	 *                      4 - Whisper message
	 *                      5 - Highlight message
	 * @fires Chat#chatmessage
	 */
	showmsg(prefix, user, to, msg, tags, type) {
			
		var self = this
		var org_msg = msg

		if(typeof(tags) == 'undefined') tags = {}
		if(typeof(type) != 'number') type = 0
		
		var emotes = ''
		var bits = 0
		if(typeof(tags.emotes) == 'string')
			emotes = tags.emotes
		if(typeof(tags.bits) === 'string')
			bits = parseInt(tags.bits)


		msg = replaceEmoticons(msg, emotes, this.channelcheers, bits)
		
		if(typeof(tags.channellink) === 'string') {
			msg = msg.replace(tags.channellink, '<a onclick="Tool.cockpit.leaveChannel(true);Tool.cockpit.openChannelByName(\'' + tags.channellink + '\')">' + tags.channellink + '</a>')
		}

		var ts = ''
		if(tags.hasOwnProperty('sent-ts')) {
			ts = timestamp(parseInt(tags['sent-ts']))
		} else {
			ts = timestamp()
		}

		var userobj = this.getUserObjByTags(user, tags)

		if(bits > 0) {
			/**
			 * @event Chat#cheer
			 * @param {String} channel The channel the message was sent to
			 * @param {String} timestamp The time the message was sent (or received depending on available data)
			 * @param {Chat~userObject} userobj The userobject of the sender
			 * @param {Number} bits The number of total bits that where cheered with the message
			 */
			this.emit('cheer', to, ts, userobj, bits)
		}

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

		var uuid = ''
		if(typeof(tags.id) === 'string') {
			uuid = tags.id
		}

		/**
		 * @event Chat#chatmessage
		 * @param {String} channel The channel the message was sent to
		 * @param {String} timestamp The time the message was sent (or received depending on available data)
		 * @param {Chat~userObject} userobj The userobject of the sender
		 * @param {String} message The HTML message with replaces emoticons and useable links.
		 * @param {String} org_message The original message, how it was sent from the server
		 * @param {Number} type The type of message that is being displayed; See {@link Chat#showmsg} for help on the possible numbers
		 * @param {Number} uuid The uuid of the message (might be empty)
		 */
		this.emit('chatmessage', to, ts, userobj, msg, org_msg, type, uuid)
	}

	/**
	 * Join a channel
	 * 
	 * @param {String} channel The channel that should be joined
	 */
	join(channel) {
		//if(this.currentchannel.length > 0) return
		this.irc.join(channel)
		//this.currentchannel = channel
	}

	/**
	 * Leave a channel
	 * 
	 * @param {String} channel The channel that should be left
	 * @param {Function} cb A callback that is called when the channel was left
	 */
	part(channel, cb) {
		//this.messagelement.onkeyup = function(){}
		this.irc.part(channel, cb)
		//this.currentchannel = ''
	}

	/**
	 * Opens the official popout viewercard with moderation tools
	 * 
	 * @param {String} channel 
	 * @param {String} user 
	 */
	openViewercard(channel, user)
	{
		let viewerCard = new BrowserWindow({
			autoHideMenuBar: true,
			width: 330,
			height: 450,
			minWidth: 300,
			minHeight: 400,
			fullscreenable: false,
			minimizable: false,
			maximizable: false,
			icon: 'res/icon.ico',
			title: 'Viewercard',
			show: true,
			webPreferences: {nodeIntegration: false}
		})
		viewerCard.webContents.on('did-finish-load', () => {
			viewerCard.webContents.executeJavaScript('document.querySelector("html").classList.add("tw-root--theme-dark");')
		})
		viewerCard.loadURL('https://www.twitch.tv/popout/' + encodeURIComponent(channel) + '/viewercard/' + encodeURIComponent(user))
	}

	/**
	 * Send a message to a channel
	 * 
	 * @param {String} channel Channel the message is being send to
	 * @param {String} message The message that is being send. Must not contain CR or LF symbols or everything breaks.
	 * @param {Object} [emotes] A twitch api object with the for the user available emoticon sets. This is just for display for the user. The twitch server may decide which emotes the user has and are being displayed.
	 * @todo Filter CR and LF symbols from channel or message
	 */
	sendmsg(channel, message, emotes) {
		if(message.length <= 0) return

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
		if(message.toLowerCase().startsWith('/user ')) {
			let u = message.substr(6)
			this.openViewercard(channel, u)
			return
		}
		if(message.toLowerCase().startsWith('/marker ') || message.toLowerCase() == '/marker') {
			if(typeof(this.tool.cockpit.openChannelObject.login) === 'string' && channel.toLowerCase() == this.tool.cockpit.openChannelObject.login.toLowerCase()) {
				let post = {
					user_id: this.tool.cockpit.openChannelObject.id
				}
				if(message.length > 8) {
					post.description = message.substr(8)
				}
				const self = this
				this.tool.twitchhelix.createStreamMarker(post).then((resp) => {
					if(typeof(resp.data) !== 'undefined' && resp.data.length > 0) {
						let sec = resp.data[0].position_seconds
						let min = Math.floor(sec / 60); sec -= (min * 60)
						let hou = Math.floor(min / 60); min -= (hou * 60)
						let time = (hou > 0 ? hou + ':' : '') + min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0')
						self.showmsg('', '', channel, self.tool.i18n.__('Marker was created at {{time}}', {'time': time}), {color: '#999999'}, 1)
					} else {
						self.showmsg('', '', channel, self.tool.i18n.__('No marker was created'), {color: '#999999'}, 1)
					}
				}).catch((err) => {
					self.tool.ui.showErrorMessage(err)
				})
			}
			return
		}

		let msgtags = this.usertags[channel]
		msgtags.emotes = findEmoticons(message, emotes)
		var userobj = this.getUserObjByTags(this.username, msgtags)
		/**
		 * This event is fired when a message is being sent by the user. If a message is not prevented a chatmessage event will follow.
		 * Use this event only if you're trying to prevent certain messages from being sent.
		 * 
		 * @event Chat#sendmessage
		 * @param {Object} event An preventable sendmessage event object.
		 * @param {Boolean} event.prevent Setting this boolean prevents the message from being sent
		 * @param {Object} event.messageobj An object with information about the message that is set to be sent
		 * @param {String} event.messageobj.channel The channel that the message is being sent to
		 * @param {String} event.messageobj.message The message that is being sent (if not prevented). Changing this will *not* change the message that is being sent
		 * @param {String} event.messageobj.tags An emulated tags segment, that the message might have
		 * @param {String} event.messageobj.user An user object of the sender
		 */
		let event = { prevent: false, messageobj: Object.assign({}, { channel: channel, message: message, tags: msgtags, user: userobj }) }
		this.emit('sendmessage', event)

		if(event.prevent) return
		this.irc.say(channel, message)
		var type = 0
		if(message.toLowerCase().startsWith('/w ')) {
			type = 4
			message = message.substr(3)
			msgtags.emotes = findEmoticons(message, emotes)
			message = '-> ' + message.substring(0, message.indexOf(' ')) + ':' + message.substring(message.indexOf(' '))
		}
		if(message.toLowerCase().startsWith('/me ')) {
			type = 1
			message = message.substr(4)
			msgtags.emotes = findEmoticons(message, emotes)
		}
		if(!message.startsWith('/')) {
			this.showmsg('', this.username, channel, message, msgtags, type)
		}
	}

	/**
	 * Planned disconnect from the twitch irc
	 */
	disconnect() {
		this.irc.disconnect()
	}
}

/**
 * A user object that is used to give more information about a user
 * @typedef {Object} Chat~userObject
 * @property {String} user Twitch user name
 * @property {String} name Twitch display name
 * @property {String} color Hex color string prepended by a #
 * @property {Number} sort Number to sort the user in a list by
 * @property {String} badges HTML string with badges the user has
 * @property {Boolean} [nooverwrite=false] If set to true it sends the signal that data is definitely not complete. Can be omitted
 */

module.exports = Chat