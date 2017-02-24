let openChannelId = ''
let isChatConnected = false
let openChannelObject = {}

var hideAllContents = function() {
	var contents = document.querySelectorAll('#contents > div')
	for(var i = 0; i < contents.length; i++) {
		contents[i].style.display = 'none'
	}
}

var openChannel = function(channelid) {
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
			document.querySelector('#channel_status').value = openChannelObject.status
			document.querySelector('#channel_game').value = openChannelObject.game
			twitchapi.getChatBadgeSetsByChannel(channelid, (badges, error) => {
				stopLoading()
				if(badges != null && badges.hasOwnProperty('badge_sets')) {
					twitchchat.channelbadges = badges.badge_sets
					twitchchat.join(openChannelObject.name)
					var mi = getMenuItemById('menu_changechannel')
					if(mi != null)
						mi.enabled = true
				} else {
					showErrorMessage(error)
				}
			})
			
		} else {
			showErrorMessage(err)
		}
	})
}

var leaveChannel = function() {
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

	loadMoreFollows(true)
}