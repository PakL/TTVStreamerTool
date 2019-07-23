<clipembed>
	<img src={ preview_image } alt="">
	<span class="title">{ title }</span>
	<span class="channel_game">{ channel_game }</span>
	<span class="clipmaker">{ clipmaker }</span>
	<div></div>

	<style>
		clipembed {
			display: block;
			
			margin: 3px;
			padding: 3px;
			background: #242424;
			box-shadow: 0 1px 3px rgba(0,0,0, 0.6);
			border-radius: 3px;
			max-width: 100%;
			line-height: 1.5em;
			font-size: 0.8em;
			cursor: pointer;
		}
		clipembed > img {
			float: left;
			width: 86px;
			height: 45px;
			margin-right: 5px;
		}
		clipembed > span {
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		clipembed > span.title {
			font-size: 1.2em;
		}
		clipembed > span.channel_game {
			line-height: 1.3em;
			opacity: 0.6;
		}
		clipembed > span.clipmaker {
			line-height: 1.3em;
			opacity: 0.6;
		}
		clipembed > div {
			clear: both;
		}
	</style>
	<script>
		export default {
			onBeforeMount() {
				this.id = this.props.id
				this.preview_image = 'https://clips-media-assets2.twitch.tv/404-preview-86x45.jpg'
				this.title = Tool.i18n.__('Loading, please wait...')
				this.channel_game = '-'
				this.clipmaker = '-'

				this.makeAccessible()
			},

			onMounted() {
				const self = this
				this.root.onclick = () => { openLinkExternal('https://clips.twitch.tv/' + encodeURIComponent(self.id) ) }
				(async function() {
					let clip = null
					try {
						let clips = await Tool.twitchhelix.getClips({ id: self.id })
						if(clips.data.length > 0) {
							clip = clips.data[0]
							self.preview_image = clip.thumbnail_url
							self.title = clip.title
							self.clipmaker = Tool.i18n.__('Clipped by {{user}}', {user: clip.creator_name}) + ' — ' + Tool.i18n.__('{{viewsnum}} {{views||viewsnum}}', {viewsnum: clip.view_count})
							self.channel_game = clip.broadcaster_name
						} else {
							self.title = Tool.i18n.__('An error occured')
						}
					} catch(e) {
						self.title = Tool.i18n.__('An error occured')
						console.error(e)
						self.update()
						return
					}

					try {
						if(clip !== null) {
							let games = await Tool.twitchhelix.getGames(clip.game_id)
							if(games.data.length > 0) {
								self.channel_game = Tool.i18n.__('{{broadcaster}} played {{game}}', {broadcaster: clip.broadcaster_name, game: games.data[0].name})
							}
						}
					} catch(e) {
						console.error(e)
					}
					self.update()
				})()
			}
		}
	</script>
</clipembed>