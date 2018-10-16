"use strict"
const net = require('net')
const util = require('util')
const events = require('events')

/**
 * This module connects to the twitch irc and parses messages
 * 
 * @class TwitchChat
 * @extends {EventEmitter}
 * @param {Object} [options] Optional connections options
 * @fires TwitchChat#connect
 * @fires TwitchChat#error
 * @fires TwitchChat#close
 * @fires TwitchChat#incoming
 * @fires TwitchChat#raw
 * @fires TwitchChat#registered
 * @fires TwitchChat#motd
 * @fires TwitchChat#hostingyou
 * @fires TwitchChat#autohostingyou
 * @fires TwitchChat#action
 * @fires TwitchChat#message
 * @fires TwitchChat#whisper
 * @fires TwitchChat#capack
 * @fires TwitchChat#names
 * @fires TwitchChat#join
 * @fires TwitchChat#part
 * @fires TwitchChat#mode+
 * @fires TwitchChat#mode-
 * @fires TwitchChat#mode
 * @fires TwitchChat#notice
 * @fires TwitchChat#usernotice
 * @fires TwitchChat#clearuser
 * @fires TwitchChat#clearchat
 * @fires TwitchChat#userstate
 * @fires TwitchChat#roomstate
 * @fires TwitchChat#outgoing
 */
class TwitchChat extends events.EventEmitter {

	constructor(options) {
		super()
		const self = this
		/**
		 * Buffers chunk until line break comes
		 * @private
		 * @member {String}
		 */
		this.buffer = ''
		/**
		 * String that contains a standard CRLF
		 * @static
		 * @private
		 * @member {String}
		 */
		this.clrf = '\r\n'
		/**
		 * Is connection closing planned?
		 * @private
		 * @member {Boolean}
		 */
		this.plannedclose = false

		/**
		 * Connection options
		 * @member {Object}
		 * @property {String} host
		 * @property {Number} port
		 * @property {Boolean} auto_reconnect
		 */
		this.options = {
			'host': 'irc.chat.twitch.tv',
			'port': 6667,
			'auto_reconnect': true
		}
		if(typeof(options) == 'object') {
			for(var i in options) {
				if(options.hasOwnProperty(i))
					this.options[i] = options[i]
			}
		}
		/**
		 * IRC connection
		 * @member {net.Socket}
		 */
		this.socket = new net.Socket()
		this.socket.setEncoding('utf8')
		this.socket.on('connect', function(){
			/**
			 * Is fired when connection is established
			 * @event TwitchChat#connect
			 * @param {net.Socket}
			 * @see {@link https://nodejs.org/api/net.html#net_class_net_socket}
			 */
			self.emit('connect', self.socket)
		})
		this.socket.on('error', function(e){
			/**
			 * Is fired on any connection error
			 * @event TwitchChat#error
			 * @param {Error}
			 */
			self.emit('error', e)
		})
		this.socket.on('close', function(had_error){
			/**
			 * Fired when connection is closing
			 * @event TwitchChat#close
			 * @param {Boolean} had_error Did the socket close because of an error?
			 */
			self.emit('close', had_error)
			if((had_error || !self.plannedclose) && self.options.auto_reconnect) {
				self.emit('notice', 'TTVStreamerTool', 'Connection to TMI was lost. Reconnection attempt in 3 seconds...', {})
				// Wait 3 seconds before reconnecting to minimize looping CPU load
				setTimeout(() => {
					self.socket.connect(self.options.port, self.options.host)
				}, 3000)
			}
		})
		this.socket.on('data', function(data){
			self.buffer += data
			while(self.buffer.indexOf(self.clrf) >= 0) {
				var i = self.buffer.indexOf(self.clrf)
				var message = self.buffer.substring(0, i)
				self.buffer = self.buffer.substring(i + self.clrf.length)
				/**
				 * Is fired on any CRLF that is send
				 * @event TwitchChat#incoming
				 * @param {String} message Undoctored message as it came in (without the CRLF)
				 */
				self.emit("incoming", message)
				self.slaughter(message)
			}
		})

		this.namelists = {}

		events.EventEmitter.call(this)
	}

	connect() {
		this.socket.connect(this.options.port, this.options.host)
	}
	
	disconnect() {
		if(typeof(this.socket) != "undefined") {
			this.plannedclose = true
			this.socket.end()
		}
	}
	auth(username, oauthkey) {
		var self = this
		this.once('motd', () => { self.capreq() })
		this.sendCLRF('PASS oauth:' + oauthkey)
		this.sendCLRF('NICK ' + username)
	}
	capreq() {
		this.capMembership = false
		this.capCommands = false
		this.capTags = false
		this.sendCLRF('CAP REQ :twitch.tv/membership')
		this.sendCLRF('CAP REQ :twitch.tv/commands')
		this.sendCLRF('CAP REQ :twitch.tv/tags')
	}
	slaughter(msg) {
		var p = msg.substr(0, 1)
		var tags = ''
		var prefix = {'user': '', 'host': ''}
		// Message has IRCv3 tags
		if(p == '@') {
			tags = msg.substring(1, msg.indexOf(' ', 1))
			msg = msg.substr(msg.indexOf(' ', 1)+1)
			p = msg.substr(0, 1)
		}
		// Actual message
		if(p == ':') {
			prefix = msg.substring(1, msg.indexOf(' ', 1))
			var matches = prefix.match(/^((.*?)!(.*?)@)?(.*?)$/)
			if(typeof(matches[3]) != 'string')
				matches[3] = ''
			prefix = {'user': matches[3], 'host': matches[4] }
			msg = msg.substr(msg.indexOf(' ', 1)+1)
		}
		var action = msg.substring(0, msg.indexOf(' ', 1));
		var attach = msg.substr(msg.indexOf(' ')+1);

		/**
		 * A more splitted message than {@link TwitchChat#incoming}
		 * @event TwitchChat#raw
		 * @param {String} tags String of the tags
		 * @param {Object} prefix String of the prefix
		 * @param {String} prefix.user Username in the prefix
		 * @param {String} prefix.host Host in the prefix
		 * @param {String} action IRC action code
		 * @param {String} attach Everything after the IRC action
		 */
		this.emit('raw', tags, prefix, action, attach);

		var tags = tags.split(';');
		var ntags = {};
		for(var i = 0; i < tags.length; i++) {
			var sp = tags[i].split('=', 2);
			if(sp.length < 2) continue;
			var unescape = sp[1].replace(/\\(:|s|r|n|\\)/g, (match, m1) => { 
				switch(m1) {
					default: return m1
					case ':': return ';'
					case 's': return ' '
					case 'r': return '\r'
					case 'n': return '\n'
				}
			});
			ntags[sp[0]] = unescape;
		}
		tags = ntags;

		switch(true) {
			// Send an automatic answer for a ping request
			case (action == 'PING'):
				this.sendCLRF('PONG ' + attach)
				break
			// Server answer code 004 is the last of the welcome message with a successful login
			case (action == '004'):
				/**
				 * Fired when user was successfully logged in
				 * @event TwitchChat#registered
				 */
				this.emit('registered')
				break
			// Server answer code 372 is part message of the day
			case (action == '372'):
				var params = attach.split(" :", 2)
				this.motd += params[1].trim()
				break
			// Server answer code 376 is the last part of the message of the day
			case (action == '376'):
				/**
				 * Fired when the message of the day was sent, usually directly after the welcom message
				 * @event TwitchChat#motd
				 * @param {String} motd Message of the day
				 */
				this.emit('motd', this.motd)
				break
			// Normal chat message are sent to you via PRIVMSG action
			case (action == 'PRIVMSG'):
				var params = attach.split(' :', 2)
				if(params.length >= 2) {
					// Determine if message is actually an action (/me)
					var actionprefix = new RegExp('^ ?\x01ACTION ')
					var to = params[0]
					if(to.substr(0, 1) == '#') to = to.substr(1)
					var msg = attach.substr(attach.indexOf(' :')+2)
					if(prefix.user == 'jtv') {
						if(msg.match(/is now hosting/)) {
							var viewers = 0
							var match = msg.match(/( )([0-9]+)(\.| |$)/)
							if(match != null) {
								viewers = parseInt(match[2])
							}
							/**
							 * Fires when someone is hosting the channel. Only the channel owner will receive these.
							 * @event TwitchChat#hostingyou
							 * @param {String} channel Channel that the message was sent to
							 * @param {String} user The user that hosts you
							 * @param {Number} viewers How many viewers are being hosted
							 * @param {String} message The system message
							 * @param {Object} tags Tag object
							 */
							this.emit('hostingyou', to, msg.substr(0, msg.indexOf(' ')), viewers, msg, tags)
						} else if(msg.match(/is now auto hosting/)) {
							var viewers = 0
							var match = msg.match(/( )([0-9]+)(\.| |$)/)
							if(match != null) {
								viewers = parseInt(match[2])
							}
							/**
							 * Fires when someone is auto hosting the channel. Only the channel owner will receive these.
							 * @event TwitchChat#autohostingyou
							 * @param {String} channel Channel that the message was sent to
							 * @param {String} user The user that hosts you
							 * @param {Number} viewers How many viewers are being hosted
							 * @param {String} message The system message
							 * @param {Object} tags Tag object
							 */
							this.emit('autohostingyou', to, msg.substr(0, msg.indexOf(' ')), viewers, msg, tags)
						}
					} else {
						if(msg.match(actionprefix)) {
							msg = msg.replace(actionprefix, '').replace('\x01', '')
							/**
							 * Fires when a user sends an action message. It's exactly like a normal message but is usually display in the user name color.
							 * @event TwitchChat#action
							 * @param {Object} prefix Message prefix - there is usually nothing interesting here
							 * @param {String} prefix.user Username in the prefix
							 * @param {String} prefix.host Host in the prefix
							 * @param {String} user Username that sent the message
							 * @param {String} channel Channel that the message was sent to
							 * @param {String} message The message that was sent
							 * @param {Object} tags The message tags
							 * @see {@link https://dev.twitch.tv/docs/v5/guides/irc/#twitch-irc-capability-tags}
							 */
							this.emit('action', prefix, prefix.user, to, msg, tags)
						} else {
							/**
							 * Fires when a user sends an message
							 * @event TwitchChat#message
							 * @param {Object} prefix Message prefix - there is usually nothing interesting here
							 * @param {String} prefix.user Username in the prefix
							 * @param {String} prefix.host Host in the prefix
							 * @param {String} user Username that sent the message
							 * @param {String} channel Channel that the message was sent to
							 * @param {String} message The message that was sent
							 * @param {Object} tags The message tags
							 * @see {@link https://dev.twitch.tv/docs/v5/guides/irc/#twitch-irc-capability-tags}
							 */
							this.emit('message', prefix, prefix.user, to, msg, tags)
						}
					}
				}
				break
			// Whisper messages are sent via the WHISPER action
			case (action == 'WHISPER'):
				var params = attach.split(' :', 2)
				if(params.length >= 2) {
					var to = params[0]
					var msg = attach.substr(attach.indexOf(' :')+2)
					/**
					 * Fires if a user whispers to the logged in user.
					 * @event TwitchChat#whisper
					 * @param {Object} prefix Message prefix - there is usually nothing interesting here
					 * @param {String} prefix.user Username in the prefix
					 * @param {String} prefix.host Host in the prefix
					 * @param {String} user Username that sent the message
					 * @param {String} message Message the user sent
					 * @param {Object} tags The message tags
					 */
					this.emit('whisper', prefix, prefix.user, prefix.user, msg, tags)
				}
				break

			// ACK answers for cap requests
			case (action == 'CAP'):
				if(attach == '* ACK :twitch.tv/membership')
					this.capMembership = true
				if(attach == '* ACK :twitch.tv/commands')
					this.capCommands = true
				if(attach == '* ACK :twitch.tv/tags')
					this.capTags = true

				if(this.capMembership && this.capCommands && this.capTags) {
					/**
					 * Fires when all capabilies were acknowledged
					 * @event TwitchChat#capack
					 */
					this.emit('capack')
				}
				break

			// Server answer code 353 is used for listing user in a channel
			case (action == '353'):
				var args = attach.split(' :')
				if(args.length == 2) {
					var a = args[0].split(' ')
					var channel = a[2].substr(1)
					if(!this.namelists.hasOwnProperty(channel) || typeof(this.namelists[channel]) == 'undefined')
						this.namelists[channel] = []
					var names = args[1].split(' ')
					for(var i = 0; i < names.length; i++) {
						this.namelists[channel].push(names[i])
					}
				}
				break
			// Server answer code 366 is the end of user listing
			case (action == '366'):
				var args = attach.split(' ', 3)
				if(args.length >= 2) {
					var channel = args[1].substr(1)
					if(!this.namelists.hasOwnProperty(channel) || typeof(this.namelists[channel]) == 'undefined')
						this.namelists[channel] = []

					/**
					 * Fires when a channel name list were being sent
					 * @event TwitchChat#names
					 * @param {String} channel The channel the list is for
					 * @param {Array<String>} namelist An array of names of users in the channel
					 */
					this.emit('names', channel, this.namelists[channel])
					this.namelists[channel] = undefined
				}
				break
			// JOIN action is sent if a user joins a channel you're in
			case (action == 'JOIN'):
				if(attach.startsWith('#')) attach = attach.substr(1)
				/**
				 * Fires when someone joins a channel the user is in
				 * @event TwitchChat#join
				 * @param {String} user The user that joined
				 * @param {String} channel The channel the user joined to
				 */
				this.emit('join', prefix.user, attach)
				break
			// PART action is sent if a user leaves a channel you're in
			case (action == 'PART'):
				if(attach.startsWith('#')) attach = attach.substr(1)
				/**
				 * Fires when someone leaves a channel the user is in.
				 * @event TwitchChat#part
				 * @param user The user that left the channel
				 * @param channel The channel the user left from
				 */
				this.emit('part', prefix.user, attach)
				break
			// MODE action is sent if a users moderation rights are being changed
			// This shouldn't be used. The tags are far more detailed
			case (action == 'MODE'):
				var args = attach.split(' ', 3)
				if(args.length == 3) {
					var channel = args[0]
					if(channel.substr(0, 1) == '#') channel = channel.substr(1)
					var mode = args[1]
					var user = args[2]
					if(mode.substr(0, 1) == '+')
						/**
						 * Fires when a user's mode was added
						 * @event TwitchChat#mode+
						 * @param {String} channel The channel the mode was changed in
						 * @param {String} mode The mode that was added
						 * @param {String} user The user that received the mode
						 */
						this.emit('mode+', channel, mode, user)
					else
						/**
						 * Fires when a user's mode was removed
						 * @event TwitchChat#mode-
						 * @param {String} channel The channel the mode was changed in
						 * @param {String} mode The mode that was removed
						 * @param {String} user The user that the mode was revoked from
						 */
						this.emit('mode-', channel, mode, user)

					
					/**
					 * Fires on every mode change
					 * @event TwitchChat#mode
					 * @param {String} channel The channel the mode was changed in
					 * @param {String} mode The mode that was changed
					 * @param {String} user The user that the mode was change of
					 */
					this.emit('mode', channel, mode, user)
				}
				break

			// NOTICE actions are information about actions that aren't nessesary to see
			case (action == 'NOTICE'):
				var args = attach.split(' :', 2)
				if(args.length == 2) {
					var channel = args[0]
					if(channel.substr(0, 1) == '#') channel = channel.substr(1)
					var msg = args[1]
					/**
					 * Fires when the server sends a notice. These are general system messages.
					 * @event TwitchChat#notice
					 * @param {String} channel The channel the notice was sent in
					 * @param {String} message The message that was sent
					 * @param {String} tags Tags of the message
					 */
					this.emit("notice", channel, msg, tags)
				}
				break
			// USERNOTICE sends subscriptions
			case (action == 'USERNOTICE'):
				channel = attach
				if(channel.startsWith('#')) channel = channel.substr(1)
				var messageIndex = attach.indexOf(' :')
				var message = ''
				if(messageIndex >= 0) {
					message = attach.substr(messageIndex+2)
					channel = attach.substr(0, messageIndex)
					if(channel.startsWith('#')) channel = channel.substr(1)
				}
				/**
				 * Fires when the server sends a usernotice. This is used for sending subscriptions.
				 * @event TwitchChat#usernotice
				 * @param {String} channel The channel the usernotice was sent to
				 * @param {Object} tags The message tags
				 * @param {String} message The message the user added to the sub share. Might be empty if no message was added.
				 */
				this.emit('usernotice', channel, tags, message)
				break
			// CLEARCHAT is sent if a moderator is clearing the chat or timeouted/banned a user
			case (action == 'CLEARCHAT'):
				if(attach.indexOf(' :') >= 0) {
					var args = attach.split(' :', 2)
					var channel = args[0]
					if(channel.substr(0, 1) == '#') channel = channel.substr(1)
					var user = args[1]
					/**
					 * Fires when messages of a specific user was deleted.
					 * @event TwitchChat#clearuser
					 * @param {String} channel The channel the messages were deleted in
					 * @param {String} user The user the messages were deleted from
					 * @param {String} tags The message tags
					 */
					this.emit('clearuser', channel, user, tags)
				} else {
					var channel = attach;
					/**
					 * Fires when the entire chat is being cleared
					 * @event TwitchChat#clearchat
					 * @param {String} channel The channel that is being cleared
					 * @param {Object} tags The message tags
					 */
					this.emit('clearchat', channel, tags)
				}
				break

			// twitch.tv/tags
			case (action == 'USERSTATE'):
				var channel = attach
				if(channel.substr(0, 1) == '#') channel = channel.substr(1)
				/**
				 * Fires when the server sends a userstate. This is send on every message the user sends and when he joins a channel.
				 * @event TwitchChat#userstate
				 * @param {String} channel The channel the tags are meant for
				 * @param {Object} tags The user tags for the logged in user
				 */
				this.emit('userstate', channel, tags)
				break
			case (action == 'ROOMSTATE'):
				var channel = attach
				if(channel.substr(0, 1) == '#') channel = channel.substr(1)
				/**
				 * Fires when the server sends a roomstate. Usually when a user joins a channel to get the current sate the channel is in.
				 * @event TwitchChat#roomstate
				 * @param {String} channel The channel the tags are meant for
				 * @param {Object} tags The channel tags
				 */
				this.emit('roomstate', channel, tags)
				break
		}
	}

	/**
	 * Join a channel
	 * 
	 * @param {String} channel The channel that should be joined
	 */
	join(channel) {
		if(channel.substr(0, 1) == '#') channel = channel.substr(1)
		this.sendCLRF('JOIN #' + channel.toLowerCase())
	}

	/**
	 * Leave a channel
	 * 
	 * @param {String} channel The channel that should be left
	 * @param {Function} cb A callback that is called when the channel was left
	 */
	part(channel, cb) {
		if(channel.substr(0, 1) == '#') channel = channel.substr(1)
		this.sendCLRF('PART #' + channel.toLowerCase())
		if(typeof(cb) == 'function') {
			this.once('part', cb)
		}
	}

	/**
	 * Send a message to a channel
	 * 
	 * @param {String} dest The channel that the channel is sent to
	 * @param {String} msg The message that is being sent
	 */
	say(dest, msg) {
		if(dest.substr(0, 1) == '#') dest = dest.substr(1)
		this.sendCLRF('PRIVMSG #' + dest.toLowerCase() + ' :' + msg)
	}

	/**
	 * Send a raw command to the server
	 * 
	 * @param {String} message The command or message that is being sent
	 */
	sendCLRF(message) {
		if(typeof(this.socket) != 'undefined') {
			this.socket.write(message + this.clrf, 'utf8')
			if(message.substr(0, 5) == 'PASS ') {
				var pwlength = (message.length-5)
				message = 'PASS '
				for(var i = 0; i < pwlength; i++) message = message + '*'
			}
			/**
			 * Fires when a message is being sent to server
			 * @event TwitchChat#outgoing
			 * @param {String} message The raw message that is being sent to the server (without CRLF)
			 */
			this.emit('outgoing', message)
		}
	}
}

module.exports = TwitchChat