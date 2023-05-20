import tls from 'tls';
import net from 'net';
import util from 'util';
import EventEmitter from 'events';

import * as T from './TMITypes';
import winston from 'winston';

declare var logger: winston.Logger;

interface ITMIOptions {
	host?: string;
	port?: number;
	auto_reconnect?: boolean;
}

/**
 * This module connects to the twitch irc and parses messages
 * 
 * @class TMI
 * @extends {EventEmitter}
 * @param {Object} [options] Optional connections options
 * @fires TMI#ready
 * @fires TMI#error
 * @fires TMI#close
 * @fires TMI#incoming
 * @fires TMI#raw
 * @fires TMI#registered
 * @fires TMI#motd
 * @fires TMI#hostingyou
 * @fires TMI#autohostingyou
 * @fires TMI#action
 * @fires TMI#message
 * @fires TMI#whisper
 * @fires TMI#capack
 * @fires TMI#names
 * @fires TMI#join
 * @fires TMI#part
 * @fires TMI#mode+
 * @fires TMI#mode-
 * @fires TMI#mode
 * @fires TMI#notice
 * @fires TMI#usernotice
 * @fires TMI#clearuser
 * @fires TMI#clearchat
 * @fires TMI#userstate
 * @fires TMI#roomstate
 * @fires TMI#outgoing
 */
class TMI extends EventEmitter {

	options: ITMIOptions = {};
	buffer: string = '';
	clrf: string = '\r\n';
	plannedclose: boolean = false;

	connected: boolean = false;
	socket: net.Socket = null;
	reconnectWait: number = 0;
	namelists: Record<string, any> = {};

	capMembership: boolean = false;
	capCommands: boolean = false;
	capTags: boolean = false;

	motd: string = '';

	constructor(options?: ITMIOptions) {
		super();

		/**
		 * Connection options
		 * @member {Object}
		 * @property {String} host
		 * @property {Number} port
		 * @property {Boolean} auto_reconnect
		 */
		this.options = {
			'host': 'irc.chat.twitch.tv',
			'port': 6697,
			'auto_reconnect': true
		};
		if(typeof(options) == 'object') {
			Object.assign(this.options, options);
		}
	}

	connect() {
		const self = this;
		if(this.connected || (this.socket !== null && this.socket.connecting)) return;

		logger.info(`[TMI] Connecting to ${this.options.host}:${this.options.port}`);
		this.socket = tls.connect(this.options.port, this.options.host);

		this.socket.setTimeout(30000);
		this.socket.setEncoding('utf8');
		
		this.socket.once('connect', () => {
			self.connected = true;
		})
		this.socket.once('ready', function(){
			/**
			 * Is fired when connection is established
			 * @event TMI#ready
			 * @param {net.Socket}
			 * @see {@link https://nodejs.org/api/net.html#net_event_ready}
			 */
			self.emit('ready', self.socket);
		});
		this.socket.on('error', function(e: any){
			logger.error(e);
			if(typeof(e.code) === 'string' && e.code == 'ERR_TLS_CERT_ALTNAME_INVALID') {
				if(typeof(e.cert) === 'object') {
					if((e.cert.subject.CN as string).endsWith('.twitch.a2z.com')) {
						self.options.host = e.cert.subject.CN;
					}
				}
			}
			/**
			 * Is fired on any connection error
			 * @event TMI#err
			 * @param {Error}
			 */
			self.emit('err', e);
		});
			
		this.socket.on('timeout', () => {
			let checkTimeout = setTimeout(() => { self.socket.end(); }, 3000);
			self.once('pong', () => { clearTimeout(checkTimeout) });
			self.sendCLRF('PING :tmi.twitch.tv');
		});
		this.socket.once('close', function(had_error){
			logger.verbose('[TMI] Connection was closed');
			self.connected = false;
			/**
			 * Fired when connection is closing
			 * @event TMI#close
			 * @param {Boolean} had_error Did the socket close because of an error?
			 */
			self.emit('close', had_error);
			if((had_error || !self.plannedclose) && self.options.auto_reconnect) {
				/**
				 * Is fired when connection being retried automatically in n seconds
				 * @event TMI#reconnect
				 * @param {number} timeout Timeout before reconnection is tried
				 */
				self.emit('reconnect', self.reconnectWait);
				setTimeout(() => {
					self.connect();
				}, self.reconnectWait*1000);
				self.reconnectWait = (self.reconnectWait == 0 ? 1 : self.reconnectWait*2);
				if(self.reconnectWait > 5) self.reconnectWait = 5;
			}
		});
		this.socket.on('data', function(data){
			self.buffer += data;
			while(self.buffer.indexOf(self.clrf) >= 0) {
				let i = self.buffer.indexOf(self.clrf);
				let message = self.buffer.substring(0, i);
				self.buffer = self.buffer.substring(i + self.clrf.length);
				/**
				 * Is fired on any CRLF that is send
				 * @event TMI#incoming
				 * @param {String} message Undoctored message as it came in (without the CRLF)
				 */
				self.emit("incoming", message);
				self.slaughter(message);
			}
		});
	}
	
	disconnect() {
		if(typeof(this.socket) != "undefined" && this.socket !== null) {
			logger.info('[TMI] Closing connection');
			this.plannedclose = true;
			this.socket.end();
		}
	}
	auth(username: string, oauthkey: string) {
		let self = this;
		//this.once('motd', () => { self.capreq() });
		this.sendCLRF('PASS oauth:' + oauthkey);
		this.sendCLRF('NICK ' + username);
		self.capreq();
	}
	capreq() {
		this.capMembership = false;
		this.capCommands = false;
		this.capTags = false;
		this.sendCLRF('CAP REQ :twitch.tv/membership twitch.tv/commands twitch.tv/tags');
	}
	slaughter(msg: string) {
		let p = msg.substr(0, 1);
		let tagsString = '';
		let prefix = {'user': '', 'host': ''};
		// Message has IRCv3 tags
		if(p == '@') {
			tagsString = msg.substring(1, msg.indexOf(' ', 1));
			msg = msg.substr(msg.indexOf(' ', 1)+1);
			p = msg.substr(0, 1);
		}
		// Actual message
		if(p == ':') {
			let pre = msg.substring(1, msg.indexOf(' ', 1));
			let matches = pre.match(/^((.*?)!(.*?)@)?(.*?)$/);
			if(typeof(matches[3]) != 'string')
				matches[3] = '';
			prefix = {'user': matches[3], 'host': matches[4] };
			msg = msg.substr(msg.indexOf(' ', 1)+1);
		}
		let action = msg.substring(0, msg.indexOf(' ', 1));
		let attach = msg.substr(msg.indexOf(' ')+1);

		/**
		 * A more splitted message than {@link TMI#incoming}
		 * @event TMI#raw
		 * @param {T.TMIRaw} obj
		 * @param {String} obj.tags String of the tags
		 * @param {Object} obj.prefix String of the prefix
		 * @param {String} obj.prefix.user Username in the prefix
		 * @param {String} obj.prefix.host Host in the prefix
		 * @param {String} obj.action IRC action code
		 * @param {String} obj.attach Everything after the IRC action
		 */
		this.emit('raw', { tag: tagsString, prefix, action, attach });

		let tagArray = tagsString.split(';');
		let tags: Record<string, string> = {};
		for(let i = 0; i < tagArray.length; i++) {
			let sp = tagArray[i].split('=', 2);
			if(sp.length < 2) continue;
			let unescape = sp[1].replace(/\\(:|s|r|n|\\)/g, (match, m1) => { 
				switch(m1) {
					default: return m1;
					case ':': return ';';
					case 's': return ' ';
					case 'r': return '\r';
					case 'n': return '\n';
				}
			});
			tags[sp[0]] = unescape;
		}

		let params: Array<string> = [];
		let args: Array<string> = [];
		let channel: string = '';
		switch(true) {
			// Send an automatic answer for a ping request
			case (action == 'PING'):
				this.sendCLRF('PONG ' + attach);
				break;
			case (action == 'PONG'):
				this.emit('pong');
				break;
			// Server answer code 004 is the last of the welcome message with a successful login
			case (action == '004'):
				/**
				 * Fired when user was successfully logged in
				 * @event TMI#registered
				 */
				this.emit('registered');
				this.reconnectWait = 0;
				break;
			// Server answer code 372 is part message of the day
			case (action == '372'):
				params = attach.split(" :", 2);
				this.motd += params[1].trim();
				break;
			// Server answer code 376 is the last part of the message of the day
			case (action == '376'):
				/**
				 * Fired when the message of the day was sent, usually directly after the welcom message
				 * @event TMI#motd
				 * @param {String} motd Message of the day
				 */
				this.emit('motd', this.motd);
				break;
			// Normal chat message are sent to you via PRIVMSG action
			case (action == 'PRIVMSG'):
				params = attach.split(' :', 2);
				if(params.length >= 2) {
					// Determine if message is actually an action (/me)
					let actionprefix = new RegExp('^ ?\x01ACTION ');
					let to = params[0];
					if(to.substr(0, 1) == '#') to = to.substr(1);
					let msg = attach.substr(attach.indexOf(' :')+2);
					if(prefix.user == 'jtv') {
						if(msg.match(/is now hosting/)) {
							let viewers = 0;
							let match = msg.match(/( )([0-9]+)(\.| |$)/);
							if(match != null) {
								viewers = parseInt(match[2]);
							}
							/**
							 * Fires when someone is hosting the channel. Only the channel owner will receive these.
							 * @event TMI#hostingyou
							 * @param {T.TMIHost} obj
							 * @param {String} obj.channel Channel that the message was sent to
							 * @param {String} obj.user The user that hosts you
							 * @param {Number} obj.viewers How many viewers are being hosted
							 * @param {String} obj.message The system message
							 * @param {Object} obj.tags Tag object
							 */
							this.emit('hostingyou', { channel: to, user: msg.substr(0, msg.indexOf(' ')), viewers, message: msg, tags });
						} else if(msg.match(/is now auto hosting/)) {
							let viewers = 0;
							let match = msg.match(/( )([0-9]+)(\.| |$)/);
							if(match != null) {
								viewers = parseInt(match[2]);
							}
							/**
							 * Fires when someone is auto hosting the channel. Only the channel owner will receive these.
							 * @event TMI#autohostingyou
							 * @param {T.TMIHost} obj
							 * @param {String} obj.channel Channel that the message was sent to
							 * @param {String} obj.user The user that hosts you
							 * @param {Number} obj.viewers How many viewers are being hosted
							 * @param {String} obj.message The system message
							 * @param {Object} obj.tags Tag object
							 */
							this.emit('autohostingyou', { channel: to, user: msg.substr(0, msg.indexOf(' ')), viewers, message: msg, tags });
						}
					} else {
						if(msg.match(actionprefix)) {
							msg = msg.replace(actionprefix, '').replace('\x01', '');
							/**
							 * Fires when a user sends an action message. It's exactly like a normal message but is usually display in the user name color.
							 * @event TMI#action
							 * @param {T.TMIMessage} obj
							 * @param {Object} obj.prefix Message prefix - there is usually nothing interesting here
							 * @param {String} obj.prefix.user Username in the prefix
							 * @param {String} obj.prefix.host Host in the prefix
							 * @param {String} obj.user Username that sent the message
							 * @param {String} obj.channel Channel that the message was sent to
							 * @param {String} obj.message The message that was sent
							 * @param {T.TMITagsPrivmsg} obj.tags The message tags
							 * @see {@link https://dev.twitch.tv/docs/v5/guides/irc/#twitch-irc-capability-tags}
							 */
							this.emit('action', { prefix, user: prefix.user, channel: to, message: msg, tags });
						} else {
							/**
							 * Fires when a user sends an message
							 * @event TMI#message
							 * @param {T.TMIMessage} obj
							 * @param {Object} obj.prefix Message prefix - there is usually nothing interesting here
							 * @param {String} obj.prefix.user Username in the prefix
							 * @param {String} obj.prefix.host Host in the prefix
							 * @param {String} obj.user Username that sent the message
							 * @param {String} obj.channel Channel that the message was sent to
							 * @param {String} obj.message The message that was sent
							 * @param {T.TMITagsPrivmsg} obj.tags The message tags
							 * @see {@link https://dev.twitch.tv/docs/v5/guides/irc/#twitch-irc-capability-tags}
							 */
							this.emit('message', { prefix, user: prefix.user, channel: to, message: msg, tags });
						}
					}
				}
				break;
			// Whisper messages are sent via the WHISPER action
			case (action == 'WHISPER'):
				params = attach.split(' :', 2);
				if(params.length >= 2) {
					let to = params[0];
					let msg = attach.substr(attach.indexOf(' :')+2);
					/**
					 * Fires if a user whispers to the logged in user.
					 * @event TMI#whisper
					 * @param {T.TMIWhisper} obj
					 * @param {Object} obj.prefix Message prefix - there is usually nothing interesting here
					 * @param {String} obj.prefix.user Username in the prefix
					 * @param {String} obj.prefix.host Host in the prefix
					 * @param {String} obj.user Username that sent the message
					 * @param {String} obj.message Message the user sent
					 * @param {T.TMITags} obj.tags The message tags
					 */
					this.emit('whisper', { prefix, user: prefix.user, message: msg, tags });
				}
				break;

			// ACK answers for cap requests
			case (action == 'CAP'):
				if(attach.match(/twitch\.tv\/membership/))
					this.capMembership = true;
				if(attach.match(/twitch\.tv\/commands/))
					this.capCommands = true;
				if(attach.match(/twitch\.tv\/tags/))
					this.capTags = true;

				if(this.capMembership && this.capCommands && this.capTags) {
					/**
					 * Fires when all capabilies were acknowledged
					 * @event TMI#capack
					 */
					this.emit('capack');
				}
				break;

			// Server answer code 353 is used for listing user in a channel
			case (action == '353'):
				args = attach.split(' :');
				if(args.length == 2) {
					let a = args[0].split(' ');
					let channel = a[2].substr(1);
					if(!this.namelists.hasOwnProperty(channel) || typeof(this.namelists[channel]) == 'undefined')
						this.namelists[channel] = [];
					let names = args[1].split(' ');
					for(let i = 0; i < names.length; i++) {
						this.namelists[channel].push(names[i]);
					}
				}
				break;
			// Server answer code 366 is the end of user listing
			case (action == '366'):
				args = attach.split(' ', 3);
				if(args.length >= 2) {
					let channel = args[1].substr(1);
					if(!this.namelists.hasOwnProperty(channel) || typeof(this.namelists[channel]) == 'undefined')
						this.namelists[channel] = [];

					/**
					 * Fires when a channel name list were being sent
					 * @event TMI#names
					 * @param {String} channel The channel the list is for
					 * @param {Array<String>} namelist An array of names of users in the channel
					 */
					this.emit('names', channel, this.namelists[channel]);
					this.namelists[channel] = undefined;
				}
				break;
			// JOIN action is sent if a user joins a channel you're in
			case (action == 'JOIN'):
				if(attach.startsWith('#')) attach = attach.substr(1);
				/**
				 * Fires when someone joins a channel the user is in
				 * @event TMI#join
				 * @param {String} user The user that joined
				 * @param {String} channel The channel the user joined to
				 */
				this.emit('join', prefix.user, attach);
				break;
			// PART action is sent if a user leaves a channel you're in
			case (action == 'PART'):
				if(attach.startsWith('#')) attach = attach.substr(1);
				/**
				 * Fires when someone leaves a channel the user is in.
				 * @event TMI#part
				 * @param user The user that left the channel
				 * @param channel The channel the user left from
				 */
				this.emit('part', prefix.user, attach);
				break;
			// MODE action is sent if a users moderation rights are being changed
			// This shouldn't be used. The tags are far more detailed
			case (action == 'MODE'):
				args = attach.split(' ', 3);
				if(args.length == 3) {
					let channel = args[0];
					if(channel.substr(0, 1) == '#') channel = channel.substr(1);
					let mode = args[1];
					let user = args[2];
					if(mode.substr(0, 1) == '+')
						/**
						 * Fires when a user's mode was added
						 * @event TMI#mode+
						 * @param {String} channel The channel the mode was changed in
						 * @param {String} mode The mode that was added
						 * @param {String} user The user that received the mode
						 */
						this.emit('mode+', channel, mode, user);
					else
						/**
						 * Fires when a user's mode was removed
						 * @event TMI#mode-
						 * @param {String} channel The channel the mode was changed in
						 * @param {String} mode The mode that was removed
						 * @param {String} user The user that the mode was revoked from
						 */
						this.emit('mode-', channel, mode, user);

					
					/**
					 * Fires on every mode change
					 * @event TMI#mode
					 * @param {String} channel The channel the mode was changed in
					 * @param {String} mode The mode that was changed
					 * @param {String} user The user that the mode was change of
					 */
					this.emit('mode', channel, mode, user);
				}
				break;

			// NOTICE actions are information about actions that aren't nessesary to see
			case (action == 'NOTICE'):
				args = attach.split(' :', 2);
				if(args.length == 2) {
					let channel = args[0];
					if(channel.substr(0, 1) == '#') channel = channel.substr(1);
					let msg = args[1];
					/**
					 * Fires when the server sends a notice. These are general system messages.
					 * @event TMI#notice
					 * @param {String} channel The channel the notice was sent in
					 * @param {String} message The message that was sent
					 * @param {String} tags Tags of the message
					 */
					this.emit("notice", channel, msg, tags);

					if(channel == '*' && msg === 'Login authentication failed') {
						/**
						 * Fires when the server failed to authenticate user
						 * @event TMI#auth-fail
						 */
						this.emit("auth-fail");
						this.disconnect();
					}
				}
				break;
			// USERNOTICE sends subscriptions
			case (action == 'USERNOTICE'):
				channel = attach;
				if(channel.startsWith('#')) channel = channel.substr(1);
				let messageIndex = attach.indexOf(' :');
				let message = '';
				if(messageIndex >= 0) {
					message = attach.substr(messageIndex+2);
					channel = attach.substr(0, messageIndex);
					if(channel.startsWith('#')) channel = channel.substr(1);
				}
				/**
				 * Fires when the server sends a usernotice. This is used for sending subscriptions.
				 * @event TMI#usernotice
				 * @param {String} channel The channel the usernotice was sent to
				 * @param {Object} tags The message tags
				 * @param {String} message The message the user added to the sub share. Might be empty if no message was added.
				 */
				this.emit('usernotice', channel, tags, message);
				break;
			// CLEARCHAT is sent if a moderator is clearing the chat or timeouted/banned a user
			case (action == 'CLEARCHAT'):
				if(attach.indexOf(' :') >= 0) {
					let args = attach.split(' :', 2);
					let channel = args[0];
					if(channel.substr(0, 1) == '#') channel = channel.substr(1);
					let user = args[1];
					/**
					 * Fires when messages of a specific user was deleted.
					 * @event TMI#clearuser
					 * @param {String} channel The channel the messages were deleted in
					 * @param {String} user The user the messages were deleted from
					 * @param {String} tags The message tags
					 */
					this.emit('clearuser', channel, user, tags);
				} else {
					let channel = attach;
					/**
					 * Fires when the entire chat is being cleared
					 * @event TMI#clearchat
					 * @param {String} channel The channel that is being cleared
					 * @param {Object} tags The message tags
					 */
					this.emit('clearchat', channel, tags);
				}
				break;
			// CLEARMSG is sent if a moderator is deleting a single message
			case (action == 'CLEARMSG'):
				args = attach.split(' :', 2);
				channel = args[0];
				if(channel.substr(0, 1) == '#') channel = channel.substr(1);
				let user = tags['login'];
				let msgId = tags['target-msg-id'];
				/**
				 * Fires when messages of a specific message was deleted.
				 * @event TMI#clearmsg
				 * @param {String} channel The channel the messages were deleted in
				 * @param {String} user The user the messages were deleted from
				 * @param {String} msgId The message UUID that is being deleted
				 */
				this.emit('clearmsg', channel, user, msgId);
				break;

			// twitch.tv/tags
			case (action == 'USERSTATE'):
				channel = attach;
				if(channel.substr(0, 1) == '#') channel = channel.substr(1);
				/**
				 * Fires when the server sends a userstate. This is send on every message the user sends and when he joins a channel.
				 * @event TMI#userstate
				 * @param {String} channel The channel the tags are meant for
				 * @param {Object} tags The user tags for the logged in user
				 */
				this.emit('userstate', channel, tags);
				break;
			case (action == 'ROOMSTATE'):
				channel = attach;
				if(channel.substr(0, 1) == '#') channel = channel.substr(1);
				/**
				 * Fires when the server sends a roomstate. Usually when a user joins a channel to get the current sate the channel is in.
				 * @event TMI#roomstate
				 * @param {String} channel The channel the tags are meant for
				 * @param {Object} tags The channel tags
				 */
				this.emit('roomstate', channel, tags);
				break;
		}
	}

	/**
	 * Join a channel
	 */
	join(channel: string) {
		if(channel.substr(0, 1) == '#') channel = channel.substr(1);
		this.sendCLRF('JOIN #' + channel.toLowerCase());
	}

	/**
	 * Leave a channel
	 */
	part(channel: string, cb: () => void) {
		if(channel.substr(0, 1) == '#') channel = channel.substr(1);
		if(typeof(cb) == 'function') {
			this.once('part', cb);
		}
		this.sendCLRF('PART #' + channel.toLowerCase());
	}

	/**
	 * Send a message to a channel
	 */
	say(dest: string, msg: string) {
		if(dest.substring(0, 1) == '#') dest = dest.substring(1);
		this.sendCLRF('PRIVMSG #' + dest.toLowerCase() + ' :' + msg);
	}

	/**
	 * Send a raw command to the server
	 */
	sendCLRF(message: string) {
		if(typeof(this.socket) != 'undefined' && this.socket.writable) {
			this.socket.write(message + this.clrf, 'utf8');
			if(message.substring(0, 5) == 'PASS ') {
				let pwlength = (message.length-5);
				message = 'PASS ';
				for(let i = 0; i < pwlength; i++) message = message + '*';
			}
			/**
			 * Fires when a message is being sent to server
			 * @event TMI#outgoing
			 * @param {String} message The raw message that is being sent to the server (without CRLF)
			 */
			this.emit('outgoing', message);
		}
	}
}

export = TMI;