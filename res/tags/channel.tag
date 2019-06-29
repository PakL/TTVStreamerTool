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
				this.u()
			},

			u() {
				const self = this
				this.logoImage = new Image
				this.logoImage.onload = () => { self.draw() }
				this.logoImage.src = this.props.chnl.profile_image_url

				this.refs.hiddenlogo.setAttribute('src', this.props.chnl.profile_image_url)

				this.refs.channelname.innerText = this.props.chnl.display_name
				if(this.props.chnl.stream == null) {
					this.root.classList.remove('wide')
					this.refs.logo.width = '100'
					this.refs.logo.height = '100'
				} else {
					this.root.classList.add('wide')
					this.thumbnailImage = new Image
					this.thumbnailImage.onload = () => { self.draw() }
					this.thumbnailImage.src = this.props.chnl.stream.thumbnail_url.replace('{width}', '206').replace('{height}', '116') + '?cache=' + (new Date().getTime())

					if(this.props.chnl.stream.game.box_art_url.length > 0) {
						this.gameImage = new Image
						this.gameImage.onload = () => { self.draw() }
						this.gameImage.src = this.props.chnl.stream.game.box_art_url.replace('{width}', '38').replace('{height}', '50')
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
					if(self.props.chnl.stream == null) {
						if(self.logoImage.complete) canvasContext.fillStyle = '#ffffff'
						canvasContext.fillRect(0, 0, 100, 100)
						if(self.logoImage.complete) canvasContext.drawImage(self.logoImage, 0, 0, 100, 100)
					} else {
						if(self.logoImage.complete) canvasContext.fillStyle = '#ffffff'
						canvasContext.fillRect(0, 0, 206, 100)
						if(self.thumbnailImage.complete)
							canvasContext.drawImage(self.thumbnailImage, 0, 8, 206, 100, 0, 0, 206, 100)
						if(self.gameImage !== null && self.gameImage.complete)
							canvasContext.drawImage(self.gameImage, 0, 50, 38, 50)
						if(self.logoImage.complete)
							canvasContext.drawImage(self.logoImage, 156, 50, 50, 50)
					}
				})
			}
		}
	</script>
</channel>