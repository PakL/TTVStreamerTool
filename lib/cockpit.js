"use strict"

const UIPage = require('../mod/uipage')

class Cockpit extends UIPage {

	/**
	 * @param {ToolUI} toolui
	 */
	constructor(toolui) {
		super('Cockpit')

		this._visible = false
		this._ui = toolui
		this.openChannelId = ''
		this.isChannelOnline = true
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

		this.isGameSearching = false
		this.gameSearchTO = null
		this.lastGameSearchInput = ''
		this.lastGameSearchSearch = ''

		this.prevMinute = -1

		const self = this
		this.tool.on('load', () => {
			self.channelActionsElement = document.querySelector('#channelactions')
			self.channelViewersplotter = document.querySelector('#channel_viewers')
			self.followsElement = document.getElementById('myfollows')
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

			/** Channel events */
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

			/** Follower events */
			self.tool.follows.on('follow', (user, raw) => {
				self.channelActionsElement._tag.addAction(user, self.tool.i18n.__('is following this channel now'), timestamp(raw.created_at, true))
			})

			
			/** Subscription events */
			// All subscriptions are coming via chat now
			/*this.tool.subscriptions.on('subscription', (user, raw) => {
				self.channelActionsElement._tag.addAction(user, self.tool.i18n.__('subscribed to this channel'), timestamp(raw.created_at, true))
			})*/


			/** Chat stuff */
			self.chatelement = document.querySelector('#channelchat')
			self.userselement = document.querySelector('#channeluser')
			self.messagelement = document.querySelector('#chat_message')

			riot.mount(self.chatelement)
			riot.mount(self.userselement)
			riot.mount(document.querySelector('#ac_message_usernames'), { callback: userSuggestion })

			self.tool.chat.on('userstate', (channel, user, tags) => { self.userselement._tag.joinusr(user) })
			self.tool.chat.on('join', (channel, user) => { self.userselement._tag.joinusr(user, true) })
			self.tool.chat.on('part', (channel, user) => { self.userselement._tag.partusr(user.user) })
			self.tool.chat.on('names', (channel, users) => {
				self.messagelement.onkeyup = function(e){
					if(e.which == 13 && self.openChannelObject.hasOwnProperty('name')) {
						self.tool.chat.sendmsg(self.openChannelObject.name, self.messagelement.value)
						self.messagelement.value = ''
					}
				}
				for(var i = 0; i < users.length; i++) {
					self.userselement._tag.joinusr(users[i])
				}
			})
			self.tool.chat.on('usernotice', (channel, user, tags, msg) => {
				if(tags['msg-id'] == 'resub') {
					self.channelActionsElement._tag.addAction(user,  self.i18n.__('subscribed for the {{months}}. month in a row!', {months: tags['msg-param-months']}), timestamp(parseInt(tags['tmi-sent-ts']), true))
				}
				if(tags['msg-id'] == 'sub') {
					self.channelActionsElement._tag.addAction(user,  self.i18n.__('subscribed with {{plan}} to this channel', {plan: tags['msg-sub-plan-name']}), timestamp(parseInt(tags['tmi-sent-ts']), true))
				}
			})
			self.tool.chat.on('clearuser', (channel, user, tags) => {
				self.chatelement._tag.clearuser(user.user)
				if(tags.hasOwnProperty('ban-reason')) {
					let message = self.i18n.__('was banned from the channel.')
					let reason = self.i18n.__('There was no reason given.')
					if(tags['ban-reason'].length > 0) reason = '"' + tags['ban-reason'] + '"'
					if(tags.hasOwnProperty('ban-duration')) message = self.i18n.__('was timeouted for {{duration}} {{seconds||duration}}', { duration: tags['ban-duration'] })

					self.channelActionsElement._tag.addAction(user, message + '<br>' + reason, timestamp(new Date().getTime(), true))
				}
			})
			self.tool.chat.on('clearchat', (channel, tags) => { self.chatelement._tag.clearmessages() })
			self.tool.chat.on('hostingyou', (channel, user, viewers, msg, tags) => {
				let hostmessage = self.i18n.__('is hosting the channel')
				if(viewers > 0) {
					hostmessage = self.i18n.__('is hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
				}
				self.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true))
			})
			self.tool.chat.on('autohostingyou', (channel, user, viewers, msg, tags) => {
				let hostmessage = self.i18n.__('is auto hosting the channel')
				if(viewers > 0) {
					hostmessage = self.i18n.__('is auto hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
				}
				self.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true))
			})
			self.tool.chat.on('chatmessage', (ts, user, message, msg_raw, type) => {
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
				if(user.user.length > 0 && type == 0) {
					self.userselement._tag.joinusr(user)
				}
			})

			self.on('channelleft', () => {
				self.chatelement._tag.clearmessages()
				self.userselement._tag.clearUsers()
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

	open() {
		this._visible = true
		if(this.openChannelId.length > 0) {
			document.querySelector('#content_cockpit').style.display = 'block'
		} else {
			document.querySelector('#content_follows').style.display = 'block'
			
		}
	}

	close() {
		this._visible = false
		document.querySelector('#content_cockpit').style.display = 'none'
		document.querySelector('#content_follows').style.display = 'none'
	}

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
		this.tool.twitchapi.getUserFollows('', {'offset': this.followsOffset, 'sortby': 'last_broadcast', 'limit': (this.followChannels.length == 1 ? 9 : 10)}, (follows, err) => {
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

						this.emit('channelopen')
						
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
		this.emit('channelleft')
		/*latestFollow = 0
		latestSubscriptions = 0
		skipSubscriptions = false*/

		this.loadMoreFollows(true)
	}

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
/*




*/