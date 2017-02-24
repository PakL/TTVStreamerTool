let followsOffset = 0
let followsElement = document.getElementById('myfollows')
let followChannels = []

var loadMoreFollows = function(reset) {
	if(typeof(reset) != 'boolean') reset = false
	if(reset) {
		followsOffset = 0
		followChannels = []
		startLoading()
		twitchapi.getChannel('', (res, err) => {
			stopLoading()
			if(res != null && res.hasOwnProperty('_id')) {
				followChannels.push(res)
				loadMoreFollows()
			} else {
				showErrorMessage(err)
			}
		})
		return
	}
	startLoading()
	twitchapi.getUserFollows('', {'offset': followsOffset, 'sortby': 'last_broadcast', 'limit': (followChannels.length == 1 ? 9 : 10)}, (follows, err) => {
		stopLoading()
		if(follows != null && follows.hasOwnProperty('follows')) {
			followsOffset += follows.follows.length
			for(var i in follows.follows) {
				followChannels.push(follows.follows[i].channel)
			}
			followsElement._tag.update({ channels: followChannels })
		} else {
			showErrorMessage(err)
		}
	})
}

riot.mount(followsElement)