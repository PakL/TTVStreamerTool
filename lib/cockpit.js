"use strict"

const UIPage = require('../mod/uipage')

/**
 * This is the main page. It contains the channel selection and chat
 * 
 * @class Cockpit
 * @extends {UIPage}
 * @param {ToolUI} toolui
 * @fires Cockpit#channelopen
 * @fires Cockpit#channelleft
 */
class Cockpit extends UIPage {

	constructor(toolui) {
		super('Cockpit')

		this._visible = false
		this._ui = toolui
		/**
		 * The id of the currently open channel. Might be empty if no channel is open.
		 * @member {String}
		 */
		this.openChannelId = ''
		/**
		 * Is true when the channel is online. false when not. Is true if no channel is open.
		 * @member {Boolean}
		 */
		this.isChannelOnline = true
		/**
		 * The twitch api object of the currently open channel. Has no properties when no channel is open.
		 * @member {Object}
		 * @see {@link https://dev.twitch.tv/docs/v5/reference/channels/#get-channel-by-id}
		 */
		this.openChannelObject = {}

		
		this.followsOffset = 0
		this.followsElement = null
		this.followChannels = []

		this.channelActionsElement = null
		this.channelViewersplotter = null
		this.channelOpenInputElement = null

		this.chatelement = null
		this.userselement = null
		this.messagelement = null

		this.emoticons = null
		this.emoticons_data = {emoticon_sets:{}}
		this.emoticons_container = null
		this.emoticons_button = null
		this.emoticons_search = null

		this.isGameSearching = false
		this.gameSearchTO = null
		this.lastGameSearchInput = ''
		this.lastGameSearchSearch = ''

		this.prevMinute = -1

		this._leaveChannelButton = null

		const self = this
		this.tool.on('load', () => {
			self.channelActionsElement = document.querySelector('#channelactions')
			self.channelViewersplotter = document.querySelector('#channel_viewers')
			self.followsElement = document.querySelector('#myfollows')
			riot.mount(self.channelActionsElement)
			riot.mount(self.channelViewersplotter)
			riot.mount(self.followsElement)

			self.channelOpenInputElement = document.querySelector('#openchannel_input')
			self.channelOpenInputElement.onkeyup = function(e) {
				if(e.which == 13) {
					self._ui.startLoading()
					self.tool.twitchapi.getUserByName(self.channelOpenInputElement.value, (res, err) => {
						self._ui.stopLoading()
						if(res != null && res.hasOwnProperty('users')) {
							if(res.users != null && res.users.length > 0) {
								self.openChannel(res.users[0]._id)
							} else {
								self._ui.showErrorMessage(new Error(self.tool.i18n.__('No channel with this name was found.')))
							}
						} else {
							self._ui.showErrorMessage(err)
						}
					})
				}
			}

			riot.mount(document.querySelector('#ac_channel_game'), { callback: () => {
				document.querySelector('#ac_channel_game')._tag.setParentInput(document.querySelector('#channel_game'), 'below', (s) => { return self.searchGame(s) }, (el, replace) => {
					el.value = replace.value
				})
				document.querySelector('#channel_game').addEventListener('blur', () => { document.querySelector('#ac_channel_game')._tag.setSuggestions([]) })
			}})
			document.querySelector('#channel_status').addEventListener('keyup', (e) => {
				if(e.which == 13 && self.openChannelId.length > 0) {
					e.target.disabled = true
					self.tool.twitchapi.updateChannel(self.openChannelId, { status: e.target.value }, (res, error) => {
						e.target.disabled = false
						if(res != null && error == null && res.hasOwnProperty('status')) {
							e.target.value = res.status
						} else {
							self._ui.showErrorMessage(error)
						}
					})
				}
			})
			document.querySelector('#channel_game').addEventListener('keyup', (e) => {
				if(e.which == 13 && self.openChannelId.length > 0) {
					e.target.disabled = true
					self.tool.twitchapi.updateChannel(self.openChannelId, { game: e.target.value }, (res, error) => {
						e.target.disabled = false
						if(res != null && res.hasOwnProperty('game')) {
							e.target.value = res.game
						} else {
							self._ui.showErrorMessage(error)
						}
					})
				}
			})

			/* Channel events */
			self.tool.channel.on('channelonline', () => {
				self.channelActionsElement._tag.addAction({ name: self.openChannelObject.display_name, color: self.tool.chat.userselement._tag.getUserColor(self.openChannelObject.name) }, self.tool.i18n.__('Channel is now online'), timestamp(new Date().getTime(), true))
			})
			self.tool.channel.on('channeloffline', () => {
				self.channelActionsElement._tag.addAction({ name: self.openChannelObject.display_name, color: self.tool.chat.userselement._tag.getUserColor(self.openChannelObject.name) }, self.tool.i18n.__('Channel is now offline'), timestamp(new Date().getTime(), true))
			})
			self.tool.channel.on('gamechange', (game) => {
				document.querySelector('#channel_game').value = game
				self.channelViewersplotter._tag.newColor()
				self.channelActionsElement._tag.addAction({ name: self.openChannelObject.display_name, color: self.tool.chat.userselement._tag.getUserColor(self.openChannelObject.name) }, self.tool.i18n.__('Game information changed to «{{game}}»', {game: game}), timestamp(new Date().getTime(), true))
			})
			self.tool.channel.on('statuschange', (status) => {
				document.querySelector('#channel_status').value = status
				self.channelActionsElement._tag.addAction({ name: self.openChannelObject.display_name, color: self.tool.chat.userselement._tag.getUserColor(self.openChannelObject.name) }, self.tool.i18n.__('Stream title changed to «{{status}}»', {status: status}), timestamp(new Date().getTime(), true))
			})
			self.tool.channel.on('viewers', (viewers) => {
				let cMinute = new Date().getMinutes()
				if(cMinute != self.prevMinute) {
					self.channelViewersplotter._tag.plotViewersCount(viewers, timestamp(new Date().getTime()))
					self.prevMinute = cMinute
				}
			})

			/* Follower events */
			self.tool.follows.on('follow', (user, raw) => {
				if(self.tool.settings.showFollowAlert) {
					self.channelActionsElement._tag.addAction(user, self.tool.i18n.__('is following this channel now'), timestamp(raw.created_at, true))
				}
			})

			
			/* Subscription events */
			// All subscriptions are coming via chat now
			/*this.tool.subscriptions.on('subscription', (user, raw) => {
				self.channelActionsElement._tag.addAction(user, self.tool.i18n.__('subscribed to this channel'), timestamp(raw.created_at, true))
			})*/


			/* Chat stuff */
			self.chatelement = document.querySelector('#channelchat')
			self.userselement = document.querySelector('#channeluser')
			self.messagelement = document.querySelector('#chat_message')
			self.emoticons = document.querySelector('#chat_message_emotes_emoticons')
			self.emoticons_container = document.querySelector('#chat_message_emotes')
			self.emoticons_button = document.querySelector('#chat_message_emotes_button')
			self.emoticons_search = document.querySelector('#chat_message_emotes_search')

			riot.mount(self.chatelement)
			riot.mount(self.userselement)
			riot.mount(document.querySelector('#ac_message_usernames'), { callback: userSuggestion })
			riot.mount(self.emoticons)

			self.tool.chat.once('userstate', (channel, user, tags) => {
				if(channel != self.openChannelObject.name) return
				self.userselement._tag.joinusr(user)
				if(typeof(tags['emote-sets']) == "string") {
					self.tool.twitchapi.getChatEmoticonsBySet(tags['emote-sets'], (data, err) => {
						if(err == null && data != null && data.hasOwnProperty('emoticon_sets')) {
							self.emoticons_data = data
							self.emoticons._tag.setemotes(data)
						}
					})
				}
			})
			
			self.joinTimeout = null // Joins come in bundles, so we just wait a second before updating
			self.tool.chat.on('join', (channel, user) => {
				if(channel != self.openChannelObject.name) return
				self.userselement._tag.joinusr(user, true)
				if(self.joinTimeout != null) {
					clearTimeout(self.joinTimeout)
					self.joinTimeout = null
				}
				self.joinTimeout = setTimeout(() => {
					self.joinTimeout = null
					self.userselement._tag.update()
				}, 2000)
			})
			self.tool.chat.on('part', (channel, user) => {
				if(channel != self.openChannelObject.name) return
				self.userselement._tag.partusr(user.user)
			})
			self.tool.chat.on('names', (channel, users) => {
				if(channel != self.openChannelObject.name) return
				self.messagelement.onkeyup = function(e){
					if(e.which == 13 && self.openChannelObject.hasOwnProperty('name')) {
						self.tool.chat.sendmsg(self.openChannelObject.name, self.messagelement.value, self.emoticons_data)
						self.messagelement.value = ''
					}
				}
				for(var i = 0; i < users.length; i++) {
					self.userselement._tag.joinusr(users[i], true)
				}
				self.userselement._tag.update()
			})
			self.tool.chat.on('usernotice', (channel, user, tags, msg) => {
				if(channel != self.openChannelObject.name) return
				if(tags['msg-id'] == 'resub') {
					if(!self.tool.settings.showSubscriptionAlert) return
					self.channelActionsElement._tag.addAction(user,  self.i18n.__('subscribed for the {{months}}. month in a row!', {months: tags['msg-param-months']}), timestamp(parseInt(tags['tmi-sent-ts']), true))
				}
				if(tags['msg-id'] == 'sub') {
					if(!self.tool.settings.showSubscriptionAlert) return
					self.channelActionsElement._tag.addAction(user,  self.i18n.__('subscribed with {{plan}} to this channel', {plan: tags['msg-param-sub-plan-name']}), timestamp(parseInt(tags['tmi-sent-ts']), true))
				}
				if(tags['msg-id'] == 'raid') {
					if(!self.tool.settings.showRaidAlert) return
					self.channelActionsElement._tag.addAction(user,  self.i18n.__('is raiding your channel with {{viewers}} viewers', {viewers: tags['msg-param-viewerCount']}), timestamp(parseInt(tags['tmi-sent-ts']), true))
				}
			})
			self.tool.chat.on('clearuser', (channel, user, tags) => {
				if(channel != self.openChannelObject.name) return
				self.chatelement._tag.clearuser(user.user)
				if(tags.hasOwnProperty('ban-reason')) {
					let message = self.i18n.__('was banned from the channel.')
					let reason = self.i18n.__('There was no reason given.')
					if(tags['ban-reason'].length > 0) reason = '"' + tags['ban-reason'] + '"'
					if(tags.hasOwnProperty('ban-duration')) {
						if(!self.tool.settings.showTimeoutAlert) return
						message = self.i18n.__('was timeouted for {{duration}} {{seconds||duration}}', { duration: tags['ban-duration'] })
					} else if(!self.tool.settings.showBanAlert) return

					self.channelActionsElement._tag.addAction(user, message + '<br>' + reason, timestamp(new Date().getTime(), true))
				}
			})
			self.tool.chat.on('clearchat', (channel, tags) => {
				if(channel != self.openChannelObject.name) return
				self.chatelement._tag.clearmessages()
			})
			self.tool.chat.on('hostingyou', (channel, user, viewers, msg, tags) => {
				if(!self.tool.settings.showHostAlert) return
				let hostmessage = self.i18n.__('is hosting the channel')
				if(viewers > 0) {
					hostmessage = self.i18n.__('is hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
				}
				self.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true))
			})
			self.tool.chat.on('autohostingyou', (channel, user, viewers, msg, tags) => {
				if(!self.tool.settings.showHostAlert) return
				let hostmessage = self.i18n.__('is auto hosting the channel')
				if(viewers > 0) {
					hostmessage = self.i18n.__('is auto hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
				}
				self.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true))
			})
			self.tool.chat.on('chatmessage', (channel, ts, user, message, msg_raw, type) => {
				if(channel != self.openChannelObject.name) {
					user.name = '(#' + channel +') ' + user.name
					type += 20
				}
				self.chatelement._tag.addmessage({
					'timestamp': ts,
					'badges_html': user.badges,
					'nickname': user.name,
					'message': msg_raw,
					'message_html': message,
					'user': user.user,
					'color': user.color,
					'type': type
				})
				if(user.user.length > 0 && type == 0 && channel == self.openChannelObject.name) {
					self.userselement._tag.joinusr(user)
				}
			})

			self.on('channelleft', () => {
				self.chatelement._tag.clearmessages()
				self.userselement._tag.clearUsers()
			})

			self.emoticons_button.addEventListener('click', () => {
				if(self.emoticons_container.style.display != 'block') {
					self.emoticons_container.style.display = 'block'
					self.emoticons_search.focus()
				} else {
					self.emoticons_container.style.display = 'none'
				}
			})
			self.emoticons_button.style.cursor = 'pointer'
			document.querySelector('#chat_column').addEventListener('click', (e) => {
				self.emoticons_container.style.display = "none"
			})
			self.emoticons_search.addEventListener('keyup', () => {
				self.emoticons._tag.filteremotes(self.emoticons_search.value)
			})
		})
		this.tool.auth.on('complete', () => {
			self.loadMoreFollows(true)
		})
	}

	get i18n() {
		return this._ui.i18n
	}

	get tool() {
		return this._ui.tool
	}

	/**
	 * Open the cockpit page
	 * 
	 * @override
	 */
	open() {
		this._visible = true
		if(this.openChannelId.length > 0) {
			document.querySelector('#content_cockpit').style.display = 'block'
		} else {
			document.querySelector('#content_follows').style.display = 'block'
		}

		if(!this.tool.settings.showViewerList) {
			document.querySelector('#chat_column').style.width = '70%'
			document.querySelector('#chat_users_column').style.display = 'none'
			document.querySelector('#chat_message_column').style.width = '70%'
		} else {
			document.querySelector('#chat_column').style.width = ''
			document.querySelector('#chat_users_column').style.display = ''
			document.querySelector('#chat_message_column').style.width = ''
		}
	}

	/**
	 * Closes the cockpit page
	 * 
	 * @override
	 */
	close() {
		this._visible = false
		document.querySelector('#content_cockpit').style.display = 'none'
		document.querySelector('#content_follows').style.display = 'none'
	}

	/**
	 * Loads more Follows for the channel list.
	 * 
	 * @param {Boolean} reset If true empties the list and begins from the start
	 */
	loadMoreFollows(reset) {
		const self = this
		if(typeof(reset) != 'boolean') reset = false
		if(reset) {
			this.followsOffset = 0
			this.followChannels = []
			this._ui.startLoading()
			this.tool.twitchapi.getChannel('', (res, err) => {
				self._ui.stopLoading()
				if(res != null && res.hasOwnProperty('_id')) {
					self.followChannels.push(res)
					self.loadMoreFollows()
				} else {
					self._ui.showErrorMessage(err)
				}
			})
			return
		}
		this._ui.startLoading()
		this.tool.twitchapi.getUserFollows('', {'offset': this.followsOffset, 'sortby': 'last_broadcast', 'limit': (this.followChannels.length == 1 ? 39 : 40)}, (follows, err) => {
			self._ui.stopLoading()
			if(follows != null && follows.hasOwnProperty('follows')) {
				self.followsOffset += follows.follows.length
				for(var i in follows.follows) {
					self.followChannels.push(follows.follows[i].channel)
				}
				self.followsElement._tag.update({ channels: self.followChannels })
			} else {
				self._ui.showErrorMessage(err)
			}
		})
	}

	/**
	 * Hides the channel list and opens up the chat for a channel. Will show an error message if a channel is already open. Loads channel information, badges and connects to the irc channel.
	 * 
	 * @param {String} channelid Id of the channel you want to open
	 * @fires Cockpit#event:channelopen
	 */
	openChannel(channelid) {
		const self = this
		if(this.openChannelId.length > 0) {
			showErrorMessage(new Error(this.i18n.__('You need to leave the current channel first')))
			return
		}
		
		document.querySelector('#channel_status').value = this.i18n.__('Please wait...')
		document.querySelector('#channel_game').value = ''

		this.openChannelId = channelid
		if(this._visible) {
			this.close()
			this.open()
		}
		if(!this.tool.chat.connected) {
			this._ui.startLoading()
			this.openChannelId = ''
			this.tool.chat.on('connected', () => {
				self._ui.stopLoading()
				self.openChannel(channelid)
			})
			return
		}

		this._ui.startLoading()
		this.tool.twitchapi.getChannel(channelid, (res, err) => {
			if(res != null && res.hasOwnProperty('name')) {
				self.openChannelObject = res
				self.tool.twitchapi.getChatBadgeSetsByChannel(channelid, (badges, error) => {
					self._ui.stopLoading()
					if(badges != null && badges.hasOwnProperty('badge_sets')) {
						self.tool.chat.channelbadges = badges.badge_sets
						self.tool.chat.join(self.openChannelObject.name)

						/**
						 * Fires when everything is loaded and ready
						 * @event Cockpit#channelopen
						 */
						this.emit('channelopen')

						let leaveButton = document.createElement('li')
						let leaveButtonLink = document.createElement('a')
						let leaveButtonIcon = document.createElement('span')
						leaveButtonIcon.classList.add('icon-exit')
						leaveButtonLink.appendChild(leaveButtonIcon)
						leaveButtonLink.appendChild(document.createTextNode(self.i18n.__('Change channel')))
						leaveButton.appendChild(leaveButtonLink)

						self._leaveChannelButton = leaveButton
						self._leaveChannelButton.onclick = () => { self.leaveChannel() }
						document.querySelector('#nav-main-menu').appendChild(self._leaveChannelButton)
						
						/*if(periodicAPICallTimeout != null) {
							clearTimeout(periodicAPICallTimeout)
						}

						requestPeriodicAPIData()*/
					} else {
						self._ui.showErrorMessage(error)
					}
				})
				
			} else {
				self._ui.showErrorMessage(err)
			}
		})
	}

	/**
	 * Leaves the channel and displays the follows list.
	 */
	leaveChannel() {
		if(this.openChannelId.length <= 0 || !this.openChannelObject.hasOwnProperty('name')) {
			return
		}
		this.tool.chat.part(this.openChannelObject.name)
		this.openChannelId = ''
		this.isChannelOnline = true
		this.openChannelObject = {}
		this.prevMinute = -1
		this.prevGame = ''


		if(this._visible) {
			this.close()
			this.open()
		}

		this.channelActionsElement._tag.clearActions()
		this.channelViewersplotter._tag.clearPlotter()
		/**
		 * Fires when the user left the channel
		 * @event Cockpit#channelleft
		 */
		this.emit('channelleft')
		/*latestFollow = 0
		latestSubscriptions = 0
		skipSubscriptions = false*/

		if(this._leaveChannelButton != null) {
			this._leaveChannelButton.parentNode.removeChild(this._leaveChannelButton)
			this._leaveChannelButton = null
		}

		this.loadMoreFollows(true)
	}

	/**
	 * Searches for a game and shows a suggestion list for the game entry field.
	 * 
	 * @param {String} str Needle to search for
	 * @returns {Array} This array is always empty
	 * @memberof Cockpit
	 */
	searchGame(str) {
		const self = this
		this.lastGameSearchInput = str
		if(str.length > 3 && !this.isGameSearching) {
			if(this.gameSearchTO != null) clearTimeout(this.gameSearchTO)
			this.gameSearchTO = setTimeout(() => {
				self.isGameSearching = true
				self.lastGameSearchSearch = self.lastGameSearchInput
				self.tool.twitchapi.searchGames(str, {}, (res, error) => {
					self.isGameSearching = false
					if(res != null && res.hasOwnProperty('games')) {
						if(res.games == null) res.games = []
						let games = []
						for(let i = 0; i < res.games.length; i++) {
							games.push({ display: res.games[i].name, value: res.games[i].name })
						}
						document.querySelector('#ac_channel_game')._tag.setSuggestions(games)
						if(self.lastGameSearchInput != self.lastGameSearchSearch) {
							self.searchGame(self.lastGameSearchInput)
						}
					}
				})
			}, 500)
		}
		return []
	}
}
module.exports = Cockpit