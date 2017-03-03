let openChannelId = ''
let isChatConnected = false
let openChannelObject = {}

let hideAllContents = function() {
	var contents = document.querySelectorAll('#contents > div')
	for(var i = 0; i < contents.length; i++) {
		contents[i].style.display = 'none'
	}
}

let openChannel = function(channelid) {
	if(openChannelId.length > 0) {
		showErrorMessage(new Error('Du musst zuerst den aktuellen Channel verlassen'))
		return
	}

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

	var mi = getMenuItemById('menu_changechannel')
	if(mi != null)
		mi.enabled = false

	hideAllContents()
	document.querySelector('#content_follows').style.display = 'block'
	document.querySelector('#channelchat')._tag.clearmessages()
	document.querySelector('#channeluser')._tag.clearUsers()
	document.querySelector('#channelactions')._tag.clearActions()
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
					showErrorMessage(new Error('Keinen Kanal mit diesem Namen gefunden.'))
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
let requestPeriodicAPIData = function() {
	periodicAPICallTimeout = null
	if(openChannelId.length > 0 && !periodicAPICalling) {
		periodicAPICalling = true

		periodicStream()
	}
}

let periodicStream = function() {
	if(!periodicAPICalling) return

	twitchapi.getStreamByUser(openChannelId, { stream_type: 'live' }, (res, err) => {
		if(res != null && res.hasOwnProperty('stream')) {
			if(res.stream != null) {
				document.querySelector('#channel_status').value = res.stream.channel.status
				document.querySelector('#channel_game').value = res.stream.game
			} else {
				document.querySelector('#channel_status').value = 'Kanal ist offline'
				document.querySelector('#channel_game').value = ''
			}

			periodicFollowers()
		} else {
			showErrorMessage(err)
		}
	})
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
					var usr = {
						user: f.user.name,
						name: f.user.display_name,
						color: twitchchat.userselement._tag.getUserColor(f.user.name)
					}
					
					channelActionsElement._tag.addAction(usr, 'folgt dem Kanal jetzt', timestamp(f.created_at, true))
					latestFollow = new Date(f.created_at).getTime()
				}
			}

			periodicSubscriber()
		} else {
			showErrorMessage(err)
		}
	})
}

let periodicSubscriber = function() {
	if(!periodicAPICalling) return

	if(skipSubscriptions) {
		periodicAPICalling = false
		periodicAPICallTimeout = setTimeout(() => { requestPeriodicAPIData() }, (30000 - (new Date().getTime() % 30000)))
	}

	twitchapi.getChannelSubscribers(openChannelId, { direction: 'desc' }, (res, err) => {
		if(res != null && res.hasOwnProperty('subscriptions')) {
			var subscriptions = res.subscriptions
			subscriptions.sort(function(a, b){ return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() })
			for(var i = 0; i < subscriptions.length; i++) {
				var s = subscriptions[i]
				if(new Date(s.created_at).getTime() > latestSubscriptions) {
					var usr = {
						user: s.user.name,
						name: s.user.display_name,
						color: twitchchat.userselement._tag.getUserColor(s.user.name)
					}
					
					channelActionsElement._tag.addAction(usr, 'hat dem Kanal subscribed', timestamp(s.created_at, true))
					latestSubscriptions = new Date(s.created_at).getTime()
				}
			}


			periodicAPICalling = false
			periodicAPICallTimeout = setTimeout(() => { requestPeriodicAPIData() }, (30000 - (new Date().getTime() % 30000)))
		} else {
			if(err.message.match(/API request failed for (.+) with status code 401/i)) {
				skipSubscriptions = true
				periodicAPICalling = false
				periodicAPICallTimeout = setTimeout(() => { requestPeriodicAPIData() }, (30000 - (new Date().getTime() % 30000)))
			} else {
				showErrorMessage(err)
			}
		}
	})
}