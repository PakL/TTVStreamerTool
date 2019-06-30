<channel>
	<canvas ref="logo" class="slideout"></canvas>
	<a ref="channelname" class="channelname label slidein"></a>
	<img ref="hiddenlogo">

	<style>
		channel {
			cursor: pointer;

			background-size: cover;
		}
		channel > img {
			display: none;
		}
		channel > canvas {
			width: 100px;
			height: 100px;
		}
		channel.wide > canvas {
			width: 206px;
		}
	</style>
	<script>
		export default {
			onBeforeMount() {
				this.logoImage = null
				this.thumbnailImage = null
				this.gameImage = null

				const self = this
				this.root.onclick = function() {
					Tool.ui.findPage('Cockpit').openChannel(self.props.chnl.id)
				}

				this.fadeLogo = 0
				this.fadeThumbnail = 0
				this.fadeGame = 0
			},
			onMounted() {
				this.refs = {
					logo: this.$('[ref=logo]'),
					channelname: this.$('[ref=channelname]'),
					hiddenlogo: this.$('[ref=hiddenlogo]')
				}
				this.u()
			},
			onUpdated() {
				this.fadeLogo = 0
				this.fadeThumbnail = 0
				this.fadeGame = 0
				this.u()
			},

			u() {
				const self = this
				this.logoImage = new Image
				this.logoImage.onload = () => { self.fadeLogo = new Date().getTime(); }
				this.logoImage.src = this.props.chnl.profile_image_url

				this.refs.hiddenlogo.setAttribute('src', this.props.chnl.profile_image_url)

				this.refs.channelname.innerText = this.props.chnl.display_name
				if(this.props.chnl.stream == null) {
					this.root.classList.remove('wide')
					this.refs.logo.width = '100'
					this.refs.logo.height = '100'

					this.fadeThumbnail = 1
					this.fadeGame = 1
				} else {
					this.root.classList.add('wide')
					this.thumbnailImage = new Image
					this.thumbnailImage.onload = () => { self.fadeThumbnail = new Date().getTime(); }
					this.thumbnailImage.src = this.props.chnl.stream.thumbnail_url.replace('{width}', '206').replace('{height}', '116') + '?cache=' + (new Date().getTime())

					if(this.props.chnl.stream.game.box_art_url.length > 0) {
						this.gameImage = new Image
						this.gameImage.onload = () => { self.fadeGame = new Date().getTime(); }
						this.gameImage.src = this.props.chnl.stream.game.box_art_url.replace('{width}', '38').replace('{height}', '50')
					} else {
						this.fadeGame = 1
					}

					this.refs.channelname.innerHTML = this.props.chnl.stream.title + '<br>' + (this.props.chnl.stream.game.name.length > 0 ? this.props.chnl.stream.game.name + '<br>' : '') + '<b>' + this.props.chnl.display_name + '</b>'
					this.refs.logo.width = '206'
					this.refs.logo.height = '100'
				}

				this.draw()
			},

			draw() {
				const self = this
				window.requestAnimationFrame(() => {
					let canvasContext = self.refs.logo.getContext('2d')
					canvasContext.imageSmoothingEnabled = true
					canvasContext.imageSmoothingQuality = 'high'
					canvasContext.fillStyle = '#000000'

					let opacityLogo = self.fadeLogo == 0 ? 0 : ((100 / 200 * (new Date().getTime() - self.fadeLogo)) / 100)
					opacityLogo = (opacityLogo > 1 ? 1 : opacityLogo)
					let opacityThumbnail = self.fadeThumbnail == 0 ? 0 : ((100 / 200 * (new Date().getTime() - self.fadeThumbnail)) / 100)
					opacityThumbnail = (opacityThumbnail > 1 ? 1 : opacityThumbnail)
					let opacityGame = self.fadeGame == 0 ? 0 : ((100 / 200 * (new Date().getTime() - self.fadeGame)) / 100)
					opacityGame = (opacityGame > 1 ? 1 : opacityGame)


					if(self.props.chnl.stream == null) {
						if(self.logoImage.complete) canvasContext.fillStyle = '#ffffff'
						canvasContext.fillRect(0, 0, 100, 100)
						canvasContext.globalAlpha = opacityLogo
						if(self.logoImage.complete) canvasContext.drawImage(self.logoImage, 0, 0, 100, 100)
					} else {
						if(self.logoImage.complete) canvasContext.fillStyle = '#ffffff'
						canvasContext.fillRect(0, 0, 206, 100)
						canvasContext.globalAlpha = opacityThumbnail
						if(self.thumbnailImage.complete)
							canvasContext.drawImage(self.thumbnailImage, 0, 8, 206, 100, 0, 0, 206, 100)
						canvasContext.globalAlpha = opacityGame
						if(self.gameImage !== null && self.gameImage.complete)
							canvasContext.drawImage(self.gameImage, 0, 50, 38, 50)
						canvasContext.globalAlpha = opacityLogo
						if(self.logoImage.complete)
							canvasContext.drawImage(self.logoImage, 156, 50, 50, 50)
					}

					if(opacityLogo < 1 || opacityThumbnail < 1 || opacityGame < 1) {
						self.draw()
					}
				})
			}
		}
	</script>
</channel>