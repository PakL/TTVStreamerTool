const UIPage = require('./uipage')

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

		this._loadingChannels = false
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
		 * @see {@link https://dev.twitch.tv/docs/api/reference/#get-users}
		 */
		this.openChannelObject = {}

		this.channelModerator = false
		
		this.userDataObject = {}
		this.followersCursor = null

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
		this.emotesLoaded = false
		this.joinTimeout = null 

		this._leaveChannelButton = null

		const self = this
		this.tool.once('load', () => {
			self.collectDomElements()
			self.mountCustomTags()
			self.prepareInputElements()
			self.hookEvents()
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

	get icon() {
		return 'CannedChat'
	}

	get localizedName() {
		if(typeof(this.openChannelObject.display_name) === 'string') return this.openChannelObject.display_name
		return this._name
	}

	/**
	 * @private
	 */
	collectDomElements() {
		this.channelActionsElement = document.querySelector('#channelactions')
		this.channelViewersplotter = document.querySelector('#channel_viewers')
		this.followsElement = document.querySelector('#myfollows')
		this.channelOpenInputElement = document.querySelector('#openchannel_input')

		this.chatelement = document.querySelector('#channelchat')
		this.userselement = document.querySelector('#channeluser')
		this.messagelement = document.querySelector('#chat_message')
		this.emoticons = document.querySelector('#chat_message_emotes_emoticons')
		this.emoticons_container = document.querySelector('#chat_message_emotes')
		this.emoticons_button = document.querySelector('#chat_message_emotes_button')
		this.emoticons_search = document.querySelector('#chat_message_emotes_search')

		this.channelStatusElement = document.querySelector('#channel_status')
		this.acChannelGameElement = document.querySelector('#ac_channel_game')
		this.channelGameElement = document.querySelector('#channel_game')
		this.acMessageUsernamesElement = document.querySelector('#ac_message_usernames')
	}

	/**
	 * @private
	 */
	mountCustomTags() {
		riot.mount(this.channelActionsElement)
		riot.mount(this.channelViewersplotter)
		riot.mount(this.followsElement)

		const self = this
		riot.mount(this.acChannelGameElement)

		riot.mount(this.chatelement)
		riot.mount(this.userselement)
		riot.mount(this.acMessageUsernamesElement, { callback: userSuggestion })
		riot.mount(this.emoticons)
	}

	/**
	 * @private
	 */
	prepareInputElements() {
		const self = this
		this.channelOpenInputElement.onkeyup = async function(e) {
			if(e.which == 13)
				self.openChannelByName(self.channelOpenInputElement.value)
		}

		this.channelStatusElement.addEventListener('keyup', async (e) => {
			if(e.which == 13 && self.openChannelId.length > 0) {
				self.updateChannel(e.target, { status: e.target.value })
			}
		})
		this.channelGameElement.addEventListener('keyup', async (e) => {
			if(e.which == 13 && self.openChannelId.length > 0) {
				self.updateChannel(e.target, { game: e.target.value })
			}
		})

		this.acChannelGameElement._tag.setParentInput(this.channelGameElement, 'below', (s) => { return self.searchGame(s) }, (el, replace) => {
			el.value = replace.value
		})
		this.channelGameElement.addEventListener('blur', () => { self.acChannelGameElement._tag.setSuggestions([]) })

		this.emoticons_button.addEventListener('click', () => {
			if(self.emoticons_container.style.display != 'block') {
				self.emoticons_container.style.display = 'block'
				self.emoticons_search.focus()
			} else {
				self.emoticons_container.style.display = 'none'
			}
		})
		this.emoticons_button.style.cursor = 'pointer'
		document.querySelector('#chat_column_chat').addEventListener('click', (e) => {
			self.emoticons_container.style.display = "none"
		})
		this.emoticons_search.addEventListener('search', () => {
			self.emoticons._tag.filteremotes(self.emoticons_search.value)
		})
		this.emoticons_search.addEventListener('change', () => {
			self.emoticons._tag.filteremotes(self.emoticons_search.value)
		})
		this.emoticons_search.addEventListener('keyup', () => {
			self.emoticons._tag.filteremotes(self.emoticons_search.value)
		})
	}

	/**
	 * @private
	 */
	hookEvents() {
		const self = this

		/* Channel events */
		this.tool.channel.on('channelonline',	()	=> { self.onChannelOnline() })
		this.tool.channel.on('channeloffline',	()	=> { self.onChannelOffline() })
		this.tool.channel.on('gamechange',		(g)	=> { self.onGameChange(g) })
		this.tool.channel.on('statuschange',	(s)	=> { self.onStatusChange(s) })
		this.tool.channel.on('viewers',			(v)	=> { self.onViewers(v) })

		/* Follower events */
		this.tool.follows.on('follow',	(u, r)	=> { self.onFollow(u, r) })

		/* Chat stuff */
		this.tool.chat.on('userstate',	(c, u, t)	=> { self.onUserstate(c, u, t) })
		this.tool.chat.on('roomstate',	(c, t)		=> { self.onRoomstate(c, t) })
		
		this.tool.chat.on('join',			(c, u)					=> { self.onJoin(c, u) })
		this.tool.chat.on('part',			(c, u)					=> { self.onPart(c, u) })
		this.tool.chat.on('names',			(c, u)					=> { self.onNames(c, u) })
		this.tool.chat.on('usernotice',		(c, u, t, m)			=> { self.onUsernotice(c, u, t, m) })
		this.tool.chat.on('clearuser',		(c, u, t)				=> { self.onClearuser(c, u, t) })
		this.tool.chat.on('clearchat',		(c, t)					=> { self.onClearchat(c, t) })
		this.tool.chat.on('clearmsg',		(c, u, i)				=> { self.onClearmessage(c, u, i) })
		this.tool.chat.on('hostingyou', 	(c, u, v, m, t)			=> { self.onHostingyou(c, u, v, m, t) })
		this.tool.chat.on('autohostingyou',	(c, u, v, m, t)			=> { self.onAutohostingyou(c, u, v, m, t) })
		this.tool.chat.on('chatmessage',	(c, ts, u, m, mr, t, i)	=> { self.onChatmessage(c, ts, u, m, mr, t, i) })
		this.tool.chat.on('cheer',			(c, t, u, b)			=> { self.onCheer(c, t, u, b) })
	}

	/**
	 * Open the cockpit page
	 * 
	 * @override
	 */
	open() {
		const self = this
		this._visible = true

		if(!this.tool.settings.showViewerList) {
			document.querySelector('#content_cockpit').classList.add('hideViewerList')
		} else {
			document.querySelector('#content_cockpit').classList.remove('hideViewerList')
		}

		if(!this.tool.settings.showActionStream) {
			document.querySelector('#content_cockpit').classList.add('hideActionStream')
		} else {
			document.querySelector('#content_cockpit').classList.remove('hideActionStream')
		}

		if(!this.tool.settings.showViewersAmount) {
			document.querySelector('#content_cockpit').classList.add('hideViewers')
		} else {
			document.querySelector('#content_cockpit').classList.remove('hideViewers')
		}

		if(this.tool.settings.displayClassicChat) {
			document.querySelector('#channelchat').classList.add('classic')
		} else {
			document.querySelector('#channelchat').classList.remove('classic')
		}

		cockpitResizeInit()

		if(this.openChannelId.length > 0) {
			document.querySelector('#content_cockpit').style.display = 'block'
		} else {
			document.querySelector('#content_follows').style.display = 'block'
			window.addEventListener('resize', () => { self.onResize() })
			this.onResize()
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
		window.onresize = () => {}
		cockpitResetCleanup()
	}

	refreshPage() {
		if(this.openChannelId.length <= 0) {
			this.loadMoreFollows(true)
		}
	}

	/**
	 * Loads more Follows for the channel list.
	 * 
	 * @async
	 * @param {Boolean} reset If true empties the list and begins from the start
	 */
	async loadMoreFollows(reset) {
		if(this._loadingChannels) return
		const self = this
		this._loadingChannels = true;
		if(typeof(reset) != 'boolean') reset = false
		if(reset) {
			this.followsOffset = 0
			this.followChannels = []
			this.followsElement._tag.showButton()
			this._ui.startLoading(this)
			let chnl = null
			try {
				chnl = await this.tool.twitchhelix.getUsers()
			} catch(err) {
				this._ui.stopLoading(this)
				this._ui.showErrorMessage(err)
				return
			}

			this._ui.stopLoading(this)
			if(chnl != null && chnl.hasOwnProperty('data') && chnl.data.length > 0) {
				this.userDataObject = chnl.data[0]
				this.followersCursor = null
				this.followChannels.push(chnl.data[0])
				this._loadingChannels = false
				this.loadMoreFollows()
			} else {
				this._loadingChannels = false
				this._ui.showErrorMessage(new Error(self.tool.i18n.__('Unexpected response')))
			}
			return
		}

		this._ui.startLoading(this)
		let follows = null
		let streams = null
		let games = {}
		let total = 1
		try {
			let userFollows = await this.tool.twitchhelix.getUsersFollows(this.userDataObject.id, '', 100, this.followersCursor)
			if(userFollows != null && userFollows.hasOwnProperty('data')) {
				total = userFollows.total+1

				self.followersCursor = userFollows.pagination.cursor
				let followersIds = []
				for(var i in userFollows.data) {
					followersIds.push(userFollows.data[i].to_id)
				}

				if(followersIds.length > 0) {
					follows = await this.tool.twitchhelix.getUsers({ id: followersIds })
					streams = await this.tool.twitchhelix.getStreams({ user_id: followersIds })

					// Sometimes deleted users are not removed from follows and cannot be found
					let followersMissing = followersIds
					for(let i = 0; i < follows.data.length; i++) {
						let ind = followersMissing.indexOf(follows.data[i].id)
						if(ind >= 0) followersMissing.splice(ind, 1)
					}
					total -= followersMissing.length
				} else {
					total = this.followChannels.length
					follows = {data: []}
					streams = {data: []}
				}
			}

			
			let loadGames = []
			for(var s in streams.data) {
				if(loadGames.indexOf(streams.data[s].game_id) < 0)
					loadGames.push(streams.data[s].game_id)
			}
			if(loadGames.length > 0) {
				let gamesData = await this.tool.twitchhelix.getGames(loadGames)
				
				for(var g in gamesData.data) {
					games[gamesData.data[g].id] = gamesData.data[g]
				}
			}
		} catch(err) {
			this._loadingChannels = false
			this._ui.stopLoading(this)
			this._ui.showErrorMessage(err)
			return
		}

		this._ui.stopLoading(this)
		if(follows != null && follows.hasOwnProperty('data')) {
			for(var i in follows.data) {
				let stream = null
				for(var s in streams.data) {
					let strm = streams.data[s]
					if(strm.user_id == follows.data[i].id) {
						if(typeof(games[strm.game_id]) === 'undefined') {
							games[strm.game_id] = {id: strm.game_id, name: '', box_art_url: ''}
						}
						strm.game = games[strm.game_id]
						stream = strm
						break
					}
				}
				follows.data[i].stream = stream
				this.followChannels.push(follows.data[i])
			}
			this.followChannels.sort((a, b) => {
				if(a.id == this.userDataObject.id) return -1
				if(b.id == this.userDataObject.id) return 1

				if(a.stream == null && b.stream == null) return a.login.localeCompare(b.login)
				if(a.stream == null) return 1
				if(b.stream == null) return -1

				let atime = new Date(a.stream.started_at).getTime()
				let btime = new Date(b.stream.started_at).getTime()
				return btime - atime
			})

			this.followsElement._tag.update({ channels: this.followChannels })
			if(total <= this.followChannels.length) {
				this.followsElement._tag.hideButton()
			}
		} else {
			this._ui.showErrorMessage(new Error(this.tool.i18n.__('Unexpected response')))
		}
		this._loadingChannels = false
		this.onResize()
	}

	/**
	 * Hides the channel list and opens up the chat for a channel. Will show an error message if a channel is already open. Loads channel information, badges and connects to the irc channel.
	 * 
	 * @param {String} channelid Id of the channel you want to open
	 * @fires Cockpit#event:channelopen
	 * @async
	 */
	async openChannel(channelid) {
		const self = this
		if(this.openChannelId.length > 0) {
			this._ui.showErrorMessage(new Error(this.i18n.__('You need to leave the current channel first')))
			return
		}
		
		document.querySelector('#channel_status').value = this.i18n.__('Please wait...')
		document.querySelector('#channel_game').value = ''

		this.openChannelId = channelid
		if(this._visible) {
			this.close()
			this._visible = true
		}
		if(!this.tool.chat.connected) {
			this._ui.startLoading(this)
			this.openChannelId = ''
			this.tool.chat.on('connected', () => {
				self._ui.stopLoading(self)
				self.openChannel(channelid)
			})
			return
		}

		this._ui.startLoading(this)

		try {
			let channelObject = await this.tool.twitchhelix.getUsers({ id: channelid })
			if(channelObject != null && channelObject.hasOwnProperty('data') && channelObject.data.length > 0) {
				self.openChannelObject = channelObject.data[0]
				self.tool.chat.channelcheers = (await this.tool.twitchapi.getCheermotes(self.openChannelObject.id)).actions
			} else {
				throw new Error(this.tool.i18n.__('Channel was not found'))
			}
		} catch(error) {
			this._ui.stopLoading(this)
			this._ui.showErrorMessage(error)
			return
		}


		this._ui.stopLoading(this)

		if(self.openChannelObject.hasOwnProperty('login')) {
			// Join IRC channel
			self.tool.chat.join(self.openChannelObject.login, self.openChannelObject.id)
						
			/**
			 * Fires when everything is loaded and ready
			 * @event Cockpit#channelopen
			 */
			this.emit('channelopen')

			let leaveButton = document.createElement('li')
			let leaveButtonLink = document.createElement('a')
			let leaveButtonIcon = document.createElement('span')
			leaveButtonIcon.classList.add('ms-Icon')
			leaveButtonIcon.classList.add('ms-Icon--Leave')
			leaveButtonLink.setAttribute('title', self.i18n.__('Change channel'))
			leaveButtonLink.appendChild(leaveButtonIcon)
			leaveButtonLink.appendChild(document.createTextNode(self.i18n.__('Change channel')))
			leaveButton.appendChild(leaveButtonLink)

			self._leaveChannelButton = leaveButton
			self._leaveChannelButton.onclick = () => { self.leaveChannel() }
			document.querySelector('#nav-main-menu').appendChild(self._leaveChannelButton)
			this._ui.__proto__.constructor.applyRevealEffectToNavigation()
		}

		this.setupVideoplayer()
		if(this._visible) {
			this.open()
			this._ui.openPage(this.name)
		}
	}

	/**
	 * Leaves the channel and displays the follows list.
	 */
	leaveChannel(dontloadfollows) {
		if(this.openChannelId.length <= 0 || !this.openChannelObject.hasOwnProperty('login')) {
			return
		}
		let closeingChannel = this.openChannelObject.login

		this.openChannelId = ''
		this.isChannelOnline = true
		this.openChannelObject = {}
		this.channelModerator = false
		this.prevMinute = -1
		this.prevGame = ''


		
		let cockpit = document.querySelector('#content_cockpit')
		cockpit.classList.remove('online')
		cockpit.classList.remove('showPlayer')
		document.querySelector('#stream_video').innerText = this.tool.i18n.__('Click here to display stream player')


		if(this._visible) {
			this.close()
			this._visible = true
		}
		const self = this
		this._ui.startLoading(this)
		this.tool.chat.part(closeingChannel, () => {
			this._ui.stopLoading(this)
			self.channelActionsElement._tag.clearActions()
			self.channelViewersplotter._tag.clearPlotter()
			/**
			 * Fires when the user left the channel
			 * @event Cockpit#channelleft
			 */
			self.emit('channelleft')
	
			self.chatelement._tag.clearmessages()
			self.userselement._tag.clearUsers()
	
			if(self._leaveChannelButton != null) {
				self._leaveChannelButton.parentNode.removeChild(self._leaveChannelButton)
				self._leaveChannelButton = null
			}
	
			self.emotesLoaded = false

			if(this._visible) {
				this.open()
				this._ui.openPage(this.name)
			}
	
			if(typeof(dontloadfollows) != 'boolean' || !dontloadfollows)
				self.loadMoreFollows(true)
		})

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
				self.tool.twitchapi.searchGames(str, {}).then((res) => {
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
				}).catch((err) => {
					console.error(err)
				})
			}, 500)
		}
		return []
	}

	/**
	 * Loads the channel by name and opens it
	 * @async
	 * @private
	 * @param {String} channelname 
	 */
	async openChannelByName(channelname) {
		this._ui.startLoading(this)
		let usr = null
		try {
			usr = await this.tool.twitchapi.getUserByName(channelname)
		} catch(err) {
			this._ui.stopLoading(this)
			this._ui.showErrorMessage(err)
			return
		}

		this._ui.stopLoading(this)
		if(usr != null && usr.hasOwnProperty('users')) {
			if(usr.users != null && usr.users.length > 0) {
				this.openChannel(usr.users[0]._id)
			} else {
				this._ui.showErrorMessage(new Error(this.tool.i18n.__('No channel with this name was found.')))
			}
		} else {
			this._ui.showErrorMessage(new Error(this.tool.i18n.__('Unexpected response')))
		}
	}

	/**
	 * @private
	 * @param {HTMLInputElement} input 
	 * @param {Object} data 
	 */
	async updateChannel(input, data) {
		input.disabled = true
		try {
			let response = await this.tool.twitchapi.updateChannel(this.openChannelId, data)
			if(response != null) {
				if(data.hasOwnProperty('status') && response.hasOwnProperty('status')) {
					input.value = response.status
					this.tool.channel.updatedStatusViaCockpit(response.status)
				} else if(data.hasOwnProperty('game') && response.hasOwnProperty('game')) {
					input.value = response.game
					this.tool.channel.updatedGameViaCockpit(response.game)
				}
			}
		} catch(error) {
			this._ui.showErrorMessage(error)
		}
		input.disabled = false
	}

	setupVideoplayer() {
		let videoPlayer = document.querySelector('#stream_video')
		const self = this
		
		videoPlayer.onclick = () => {
			videoPlayer.onclick = () => {}
			let webview = document.createElement('webview')
			webview.setAttribute('src', 'playerframe.html?channel=' + self.openChannelObject.login + '&button=' + self.tool.i18n.__('Close stream player'))
			videoPlayer.innerHTML = ''
			videoPlayer.appendChild(webview)
			webview.addEventListener('new-window', (e) => {
				shell.openExternal(e.url)
			})
			webview.addEventListener('console-message', (log) => {
				if(log.message == 'close_player') {
					self.setupVideoplayer()
				}
			})
			document.querySelector('#content_cockpit').classList.add('showPlayer')

			
			cockpitResizeInit()
		}
		document.querySelector('#content_cockpit').classList.remove('showPlayer')
		videoPlayer.innerText = this.tool.i18n.__('Click here to display stream player')
		cockpitResizeInit()
	}

	onResize() {
		let tilesDiv = this.followsElement.querySelector('div')
		tilesDiv.style.width = 'fit-content'
		let tileCount = Math.floor(tilesDiv.offsetWidth / 106)
		tilesDiv.style.width = (tileCount * 106) + 'px'

		if(typeof(this.autoscrollOnResizeTimeout) === 'undefined') {
			this.autoscrollOnResizeTimeout = null
		}
		if(typeof(this.chatelement._tag) !== 'undefined') {
			if(this.autoscrollOnResizeTimeout !== null || this.chatelement._tag.autoscroll) {
				clearTimeout(this.autoscrollOnResizeTimeout)
				const self = this
				this.autoscrollOnResizeTimeout = window.setTimeout(() => {
					self.autoscrollOnResizeTimeout = null
					self.chatelement._tag.scoll_to_bottom()
				}, 500)
			}
		}
	}

	/********************
	 * Events
	 ********************/

	onChannelOnline() {
		this.channelActionsElement._tag.addAction(
			{
				name: this.openChannelObject.display_name,
				color: this.tool.chat.userselement._tag.getUserColor(this.openChannelObject.login)
			},
			this.tool.i18n.__('Channel is now online'),
			timestamp(new Date().getTime(), true),
			'PlugConnected'
		)
	}

	onChannelOffline() {
		this.channelActionsElement._tag.addAction(
			{
				name: this.openChannelObject.display_name,
				color: this.tool.chat.userselement._tag.getUserColor(this.openChannelObject.login)
			},
			this.tool.i18n.__('Channel is now offline'),
			timestamp(new Date().getTime(), true),
			'PlugDisconnected'
		)
	}
	
	onGameChange(game) {
		this.channelGameElement.value = game
		this.channelViewersplotter._tag.newColor()
		this.channelActionsElement._tag.addAction(
			{
				name: this.openChannelObject.display_name,
				color: this.tool.chat.userselement._tag.getUserColor(this.openChannelObject.login)
			},
			this.tool.i18n.__('Game information changed to «{{game}}»', { game: game }),
			timestamp(new Date().getTime(), true),
			'Soccer'
		)
	}

	onStatusChange(status) {
		this.channelStatusElement.value = status
		this.channelActionsElement._tag.addAction(
			{
				name: this.openChannelObject.display_name,
				color: this.tool.chat.userselement._tag.getUserColor(this.openChannelObject.login)
			},
			this.tool.i18n.__('Stream title changed to «{{status}}»', {status: status}),
			timestamp(new Date().getTime(), true),
			'Tag'
		)
	}

	onViewers(viewers) {
		let cMinute = new Date().getMinutes()
		if(cMinute != this.prevMinute) {
			this.channelViewersplotter._tag.plotViewersCount(viewers, timestamp(new Date().getTime()))
			this.prevMinute = cMinute
		} else {
			this.channelViewersplotter._tag.updateViewersCountOnly(viewers)
		}
	}

	onFollow(user, raw) {
		if(this.tool.settings.showFollowAlert) {
			this.channelActionsElement._tag.addAction(user, this.tool.i18n.__('is following this channel now'), timestamp(raw.followed_at, true), 'Heart')
		}
	}

	async onUserstate(channel, user, tags) {
		if(this.emotesLoaded) return
		if(channel != this.openChannelObject.login) return
		this.userselement._tag.joinusr(user)
		if(typeof(tags['mod']) === 'string') {
			if(tags.mod === '1') {
				this.channelModerator = true
			} else {
				this.channelModerator = false
			}
		}
		if(this.openChannelObject.login == this.tool.auth.username) {
			this.channelModerator = true
		}
		if(typeof(tags['emote-sets']) == "string") {
			try {
				this.emoticons_data = await this.tool.twitchapi.getChatEmoticonsBySet(tags['emote-sets'])
				this.emoticons._tag.setemotes(this.emoticons_data)
			} catch(e) {
				this._ui.showErrorMessage(e)
			}
			this.emotesLoaded = true
		}
	}
	
	onRoomstate(channel, tags) {
		if(channel != this.openChannelObject.login) return
		let modes = []
		if(typeof(tags['emote-only']) !== 'undefined' && tags['emote-only'] == '1') modes.push(this.i18n.__('Emotes only'))
		if(typeof(tags['followers-only']) !== 'undefined' && parseInt(tags['followers-only']) > 0) modes.push(this.i18n.__('Followers only'))
		if(typeof(tags['slow']) !== 'undefined' && tags['slow'] != '0') modes.push(this.i18n.__('Slow mode'))
		if(typeof(tags['subs-only']) !== 'undefined' && tags['subs-only'] == '1') modes.push(this.i18n.__('Subscribers only'))

		if(modes.length > 0) {
			let modesString = modes.join(', ')
			this.messagelement.setAttribute('placeholder', this.i18n.__('Write a message...') + ' (' + modesString + ')')
		} else {
			this.messagelement.setAttribute('placeholder', this.i18n.__('Write a message...'))
		}
	}

	onJoin(channel, user) {
		if(channel != this.openChannelObject.login) return
		this.userselement._tag.joinusr(user, true)
		if(this.joinTimeout != null) {
			clearTimeout(this.joinTimeout)
			this.joinTimeout = null
		}
		const self = this
		this.joinTimeout = setTimeout(() => {
			self.joinTimeout = null
			self.userselement._tag.update()
		}, 2000)
	}

	onPart(channel, user) {
		if(channel != this.openChannelObject.login) return
		this.userselement._tag.partusr(user.user)
	}

	onNames(channel, users) {
		if(channel != this.openChannelObject.login) return
		const self = this
		this.messagelement.onkeyup = function(e){
			if(e.which == 13 && self.openChannelObject.hasOwnProperty('login')) {
				self.tool.chat.sendmsg(self.openChannelObject.login, self.messagelement.value, self.emoticons_data)
				self.messagelement.value = ''
			}
		}
		for(var i = 0; i < users.length; i++) {
			this.userselement._tag.joinusr(users[i], true)
		}
		this.userselement._tag.update()
	}

	onUsernotice(channel, user, tags, msg) {
		if(channel != this.openChannelObject.login) return

		let plan = ''
		if(tags.hasOwnProperty('msg-param-sub-plan')) {
			switch(tags['msg-param-sub-plan']) {
				case 'Prime':
					plan = 'Twitch Prime'
					break;
				case '1000':
					plan = 'Tier 1'
					break;
				case '2000':
					plan = 'Tier 2'
					break;
				case '3000':
					plan = 'Tier 3'
					break;
			}
		}

		if(tags['msg-id'] == 'raid') {
			if(!this.tool.settings.showRaidAlert) return
			this.channelActionsElement._tag.addAction(user,  this.i18n.__('is raiding your channel with {{viewers}} viewers', {viewers: tags['msg-param-viewerCount']}), timestamp(parseInt(tags['tmi-sent-ts']), true), 'Group')
			this.checkWhatUserPlayed(user)
		}
		if(!this.tool.settings.showSubscriptionAlert) return
		if(tags['msg-id'] == 'resub') {
			if(tags['msg-param-should-share-streak'] == '1') {
				let streak = tags['msg-param-streak-months']
				this.channelActionsElement._tag.addAction(user,  this.i18n.__('subscribed with {{plan}} for {{months}} months and {{streak}} in a row!', {plan: plan, months: tags['msg-param-cumulative-months'], streak: streak}), timestamp(parseInt(tags['tmi-sent-ts']), true), 'FavoriteStar')
			} else {
				this.channelActionsElement._tag.addAction(user,  this.i18n.__('subscribed with {{plan}} for {{months}} months!', {plan: plan, months: tags['msg-param-cumulative-months']}), timestamp(parseInt(tags['tmi-sent-ts']), true), 'FavoriteStar')
			}
		}
		if(tags['msg-id'] == 'sub') {
			this.channelActionsElement._tag.addAction(user,  this.i18n.__('subscribed with {{plan}} to this channel', {plan: plan}), timestamp(parseInt(tags['tmi-sent-ts']), true), 'FavoriteStar')
		}
		if(tags['msg-id'] == 'subgift' || tags['msg-id'] == 'anonsubgift') {
			this.channelActionsElement._tag.addAction(user,  this.i18n.__('gifted {{recipient}} a {{plan}} subscription', {recipient: tags['msg-param-recipient-display-name'], plan: plan}), timestamp(parseInt(tags['tmi-sent-ts']), true), 'Giftbox')
		}
	}

	onClearuser(channel, user, tags) {
		if(channel != this.openChannelObject.login) return
		this.chatelement._tag.clearuser(user.user)

		let message = this.i18n.__('was banned from the channel.')
		let reason = this.i18n.__('There was no reason given.')
		if(tags.hasOwnProperty('ban-reason')) {
			if(tags['ban-reason'].length > 0) reason = '"' + tags['ban-reason'] + '"'
		}
		if(tags.hasOwnProperty('ban-duration')) {
			if(!this.tool.settings.showTimeoutAlert) return
			message = this.i18n.__('was timeouted for {{duration}} {{seconds||duration}}', { duration: tags['ban-duration'] })
		} else if(!this.tool.settings.showBanAlert) return

		this.channelActionsElement._tag.addAction(user, message + '<br>' + reason, timestamp(new Date().getTime(), true), (tags.hasOwnProperty('ban-duration') ? 'FlameSolid' :'NotImpactedSolid'))
	}

	onClearchat(channel, tags) {
		if(channel != this.openChannelObject.login) return
		this.chatelement._tag.clearmessages()
	}

	onClearmessage(channel, user, uuid) {
		this.chatelement._tag.clearmessage(uuid)

		if(channel != this.openChannelObject.login) return
		if(!this.tool.settings.showTimeoutAlert) return
		let message = this.i18n.__('A message was deleted.')
		this.channelActionsElement._tag.addAction(user, message, timestamp(new Date().getTime(), true), 'DRM')
	}

	onHostingyou(channel, user, viewers, msg, tags) {
		if(!this.tool.settings.showHostAlert) return
		let hostmessage = this.i18n.__('is hosting the channel')
		if(viewers > 0) {
			hostmessage = this.i18n.__('is hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
		}
		this.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true), 'Group')
		this.checkWhatUserPlayed(user)
	}

	onAutohostingyou(channel, user, viewers, msg, tags) {
		if(!this.tool.settings.showHostAlert) return
		let hostmessage = this.i18n.__('is auto hosting the channel')
		if(viewers > 0) {
			hostmessage = this.i18n.__('is auto hosting the channel with {{viewernum}} {{viewers||viewernum}}', { viewernum: viewers })
		}
		this.channelActionsElement._tag.addAction(user, hostmessage, timestamp(new Date().getTime(), true), 'Group')
	}

	onChatmessage(channel, ts, user, message, msg_raw, type, uuid) {
		if(channel != this.openChannelObject.login) {
			user.name = '(#' + channel +') ' + user.name
			type += 20
		}
		this.chatelement._tag.addmessage({
			'id': uuid,
			'timestamp': ts,
			'badges_html': user.badges,
			'nickname': user.name,
			'message': msg_raw,
			'message_html': message,
			'user': user.user,
			'color': user.color,
			'type': type
		})
		if(user.user.length > 0 && type == 0 && channel == this.openChannelObject.login) {
			this.userselement._tag.joinusr(user)
		}
	}

	onCheer(channel, ts, user, bits) {
		if(!this.tool.settings.showCheerAlert) return
		let cheermessage = this.i18n.__('just cheered with {{num_bits}} {{bits||num_bits}}', {num_bits: bits})
		this.channelActionsElement._tag.addAction(user, cheermessage, ts, 'DiamondSolid')
	}

	async checkWhatUserPlayed(user)
	{
		try {
			let stream = await this.tool.twitchhelix.getStreams({ user_login: user.user, first: 1 })
			if(stream !== null && typeof(stream.data) !== 'undefined' && stream.data.length > 0) {
				let game_id = stream.data[0].game_id
				let game = await this.tool.twitchhelix.getGames(game_id)
				if(game !== null && typeof(game.data) !== 'undefined' && game.data.length > 0) {
					this.channelActionsElement._tag.addAction(user, this.i18n.__('was playing {{game}} last', { game: game.data[0].name }), timestamp(new Date().getTime(), true), 'Soccer')
				}
			}
		} catch(e) {}
	}

}
module.exports = Cockpit