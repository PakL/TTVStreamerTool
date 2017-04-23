let openChannelId = ''
let isChatConnected = false
let isChannelOnline = true
let openChannelObject = {}

let hideAllContents = function() {
	var contents = document.querySelectorAll('#contents > div')
	for(var i = 0; i < contents.length; i++) {
		contents[i].style.display = 'none'
	}
}

let openChannel = function(channelid) {
	if(openChannelId.length > 0) {
		showErrorMessage(new Error(i18n.__('You need to leave the current channel first')))
		return
	}
	
	document.querySelector('#channel_status').value = i18n.__('Please wait...')
	document.querySelector('#channel_game').value = ''

	openChannelId = channelid
	hideAllContents()
	document.querySelector('#content_cockpit').style.display = 'block'
	if(!isChatConnected) {
		if(twitchchat != null) {
			startLoading()
			twitchchat.irc.on('registered', () => {
				stopLoading()
				openChannel(channelid)
			})
		}
		return
	}

	startLoading()
	twitchapi.getChannel(channelid, (res, err) => {
		if(res != null && res.hasOwnProperty('name')) {
			openChannelObject = res
			twitchapi.getChatBadgeSetsByChannel(channelid, (badges, error) => {
				stopLoading()
				if(badges != null && badges.hasOwnProperty('badge_sets')) {
					twitchchat.channelbadges = badges.badge_sets
					twitchchat.join(openChannelObject.name)
					var mi = getMenuItemById('menu_changechannel')
					if(mi != null)
						mi.enabled = true
					
					if(periodicAPICallTimeout != null) {
						clearTimeout(periodicAPICallTimeout)
					}

					requestPeriodicAPIData()
				} else {
					showErrorMessage(error)
				}
			})
			
		} else {
			showErrorMessage(err)
		}
	})
}

let leaveChannel = function() {
	if(openChannelId.length <= 0 || !openChannelObject.hasOwnProperty('name')) {
		return
	}
	twitchchat.part(openChannelObject.name)
	openChannelId = ''
	isChannelOnline = true
	openChannelObject = {}
	prevMinute = -1
	prevGame = ''

	var mi = getMenuItemById('menu_changechannel')
	if(mi != null)
		mi.enabled = false

	hideAllContents()
	document.querySelector('#content_follows').style.display = 'block'
	document.querySelector('#channelchat')._tag.clearmessages()
	document.querySelector('#channeluser')._tag.clearUsers()
	document.querySelector('#channelactions')._tag.clearActions()
	document.querySelector('#channel_viewers')._tag.clearPlotter()
	latestFollow = 0
	latestSubscriptions = 0
	skipSubscriptions = false

	loadMoreFollows(true)
}

const channelOpenInputElement = document.querySelector('#openchannel_input')
channelOpenInputElement.onkeyup = function(e) {
	if(e.which == 13) {
		startLoading()
		twitchapi.getUserByName(channelOpenInputElement.value, (res, err) => {
			stopLoading()
			if(res != null && res.hasOwnProperty('users')) {
				if(res.users != null && res.users.length > 0) {
					openChannel(res.users[0]._id)
				} else {
					showErrorMessage(new Error(i18n.__('No channel with this name was found.')))
				}
			} else {
				showErrorMessage(err)
			}
		})
	}
}

let latestFollow = 0
let latestSubscriptions = 0
let skipSubscriptions = false
let periodicAPICallTimeout = null
let periodicAPICalling = false

const channelActionsElement = document.querySelector('#channelactions')
const channelViewersplotter = document.querySelector('#channel_viewers')
riot.mount(channelViewersplotter)

let requestPeriodicAPIData = function() {
	periodicAPICallTimeout = null
	if(openChannelId.length > 0 && !periodicAPICalling) {
		periodicAPICalling = true

		periodicFollowers()
	}
}

let periodicFollowers = function() {
	if(!periodicAPICalling) return

	twitchapi.getChannelFollowers(openChannelId, { direction: 'desc' }, (res, err) => {
		if(res != null && res.hasOwnProperty('follows')) {
			var follows = res.follows
			follows.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
			for(var i = 0; i < follows.length; i++) {
				var f = follows[i]
				if(new Date(f.created_at).getTime() > latestFollow) {
					var dn = f.user.display_name
					if(__showlocalizednames != 'true' && !dn.match(/^[a-z0-9_\-]+$/i))
						dn = f.user.name
					var usr = {
						user: f.user.name,
						name: dn,
						color: twitchchat.userselement._tag.getUserColor(f.user.name)
					}
					
					channelActionsElement._tag.addAction(usr, i18n.__('is following this channel now'), timestamp(f.created_at, true))
					latestFollow = new Date(f.created_at).getTime()
				}
			}

		} else {
			if(err.hasOwnProperty('message')) err.message += '\n' + i18n.__('Click here to dismiss this message')
			showErrorMessage(err)
		}
		
		periodicSubscriber()
	})
}

let periodicSubscriber = function() {
	if(!periodicAPICalling) return

	if(skipSubscriptions) {
		periodicStream()
		return
	}

	twitchapi.getChannelSubscribers(openChannelId, { direction: 'desc' }, (res, err) => {
		if(res != null && res.hasOwnProperty('subscriptions')) {
			var subscriptions = res.subscriptions
			subscriptions.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
			for(var i = 0; i < subscriptions.length; i++) {
				var s = subscriptions[i]
				if(new Date(s.created_at).getTime() > latestSubscriptions) {
					var dn = d.user.display_name
					if(__showlocalizednames != 'true' && !dn.match(/^[a-z0-9_\-]+$/i))
						dn = f.user.name
					var usr = {
						user: s.user.name,
						name: dn,
						color: twitchchat.userselement._tag.getUserColor(s.user.name)
					}
					
					channelActionsElement._tag.addAction(usr, i18n.__('subscribed to this channel'), timestamp(s.created_at, true))
					latestSubscriptions = new Date(s.created_at).getTime()
				}
			}
		} else {
			if(err.message.match(/API request failed for (.+?) with status code (403|422)/i)) {
				skipSubscriptions = true
			} else {
				if(err.hasOwnProperty('message')) err.message += '\n' + i18n.__('Click here to dismiss this message')
				showErrorMessage(err)
			}
		}

		periodicStream()
	})
}

let prevMinute = -1
let prevGame = ''
let periodicStream = function() {
	if(!periodicAPICalling) return

	twitchapi.getStreamByUser(openChannelId, { stream_type: 'live' }, (res, err) => {
		if(res != null && res.hasOwnProperty('stream')) {
			if(res.stream != null) {
				if(!isChannelOnline) {
					isChannelOnline = true
					channelActionsElement._tag.addAction({ name: openChannelObject.display_name, color: document.querySelector('#channeluser')._tag.getUserColor(openChannelObject.name) }, i18n.__('Channel is now online'), timestamp(new Date().getTime(), true))
				}
				if(document.querySelector('#channel_status') !== document.activeElement)
					document.querySelector('#channel_status').value = res.stream.channel.status
				if(document.querySelector('#channel_game') !== document.activeElement)
					document.querySelector('#channel_game').value = res.stream.game
				if(prevGame != res.stream.game) {
					channelViewersplotter._tag.newColor()
					prevGame = res.stream.game
				}
				var cMinute = new Date().getMinutes()
				if(cMinute != prevMinute) {
					channelViewersplotter._tag.plotViewersCount(res.stream.viewers, timestamp(new Date().getTime()))
					prevMinute = cMinute
				}
			} else if(isChannelOnline) {
				
				isChannelOnline = false
				twitchapi.getChannel(openChannelId, (res, err) => {
					if(res != null && res.hasOwnProperty('name')) {
						openChannelObject = res

						if(document.querySelector('#channel_status') !== document.activeElement)
							document.querySelector('#channel_status').value = openChannelObject.status
						if(document.querySelector('#channel_game') !== document.activeElement)
							document.querySelector('#channel_game').value = openChannelObject.game

						channelActionsElement._tag.addAction({ name: openChannelObject.display_name, color: document.querySelector('#channeluser')._tag.getUserColor(openChannelObject.name) }, i18n.__('Channel is now offline'), timestamp(new Date().getTime(), true))
						
					}

					periodicAPICalling = false
					periodicAPICallTimeout = setTimeout(() => { requestPeriodicAPIData() }, (30000 - (new Date().getTime() % 30000)))
				})


				return
			}
		} else {
			if(err.hasOwnProperty('message')) err.message += '\n' + i18n.__('Click here to dismiss this message')
			showErrorMessage(err)
		}

		periodicAPICalling = false
		periodicAPICallTimeout = setTimeout(() => { requestPeriodicAPIData() }, (30000 - (new Date().getTime() % 30000)))
	})
}


let isGameSearching = false
let gameSearchTO = null
let lastGameSearchInput = ''
let lastGameSearchSearch = ''
let searchGame = function(str) {
	lastGameSearchInput = str
	if(str.length > 3 && !isGameSearching) {
		if(gameSearchTO != null) clearTimeout(gameSearchTO)
		gameSearchTO = setTimeout(() => {
			isGameSearching = true
			lastGameSearchSearch = lastGameSearchInput
			twitchapi.searchGames(str, {}, (res, error) => {
				isGameSearching = false
				if(res != null && res.hasOwnProperty('games')) {
					if(res.games == null) res.games = []
					var games = []
					for(var i = 0; i < res.games.length; i++) {
						games.push({ display: res.games[i].name, value: res.games[i].name })
					}
					document.querySelector('#ac_channel_game')._tag.setSuggestions(games)
					if(lastGameSearchInput != lastGameSearchSearch) {
						searchGame(lastGameSearchInput)
					}
				}
			})
		}, 500)
	}
	return []
}

riot.mount(document.querySelector('#ac_channel_game'), { callback: () => {
	document.querySelector('#ac_channel_game')._tag.setParentInput(document.querySelector('#channel_game'), 'below', searchGame, (el, replace) => {
		el.value = replace.value
	})
	document.querySelector('#channel_game').addEventListener('blur', () => { document.querySelector('#ac_channel_game')._tag.setSuggestions([]) })
}})
document.querySelector('#channel_status').addEventListener('keyup', (e) => {
	if(e.which == 13 && openChannelId.length > 0) {
		e.target.disabled = true
		twitchapi.updateChannel(openChannelId, { status: e.target.value }, (res, error) => {
			e.target.disabled = false
			if(res != null && error == null && res.hasOwnProperty('status')) {
				e.target.value = res.status
			} else {
				showErrorMessage(error)
			}
		})
	}
})
document.querySelector('#channel_game').addEventListener('keyup', (e) => {
	if(e.which == 13 && openChannelId.length > 0) {
		e.target.disabled = true
		twitchapi.updateChannel(openChannelId, { game: e.target.value }, (res, error) => {
			e.target.disabled = false
			if(res != null && res.hasOwnProperty('game')) {
				e.target.value = res.game
			} else {
				showErrorMessage(error)
			}
		})
	}
})