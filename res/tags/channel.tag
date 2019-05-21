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
		const self = this
		this.logoImage = null
		this.thumbnailImage = null
		this.gameImage = null
		u() {
			self.logoImage = new Image
			self.logoImage.onload = () => { self.draw() }
			self.logoImage.src = self.opts.chnl.profile_image_url

			self.refs.hiddenlogo.setAttribute('src', self.opts.chnl.profile_image_url)

			self.refs.channelname.innerText = self.opts.chnl.display_name
			if(self.opts.chnl.stream == null) {
				self.root.classList.remove('wide')
				self.refs.logo.width = '100'
				self.refs.logo.height = '100'
			} else {
				self.root.classList.add('wide')
				self.thumbnailImage = new Image
				self.thumbnailImage.onload = () => { self.draw() }
				self.thumbnailImage.src = self.opts.chnl.stream.thumbnail_url.replace('{width}', '206').replace('{height}', '116') + '?cache=' + (new Date().getTime())

				if(self.opts.chnl.stream.game.box_art_url.length > 0) {
					self.gameImage = new Image
					self.gameImage.onload = () => { self.draw() }
					self.gameImage.src = self.opts.chnl.stream.game.box_art_url.replace('{width}', '38').replace('{height}', '50')
				}

				self.refs.channelname.innerHTML = self.opts.chnl.stream.title + '<br>' + (self.opts.chnl.stream.game.name.length > 0 ? self.opts.chnl.stream.game.name + '<br>' : '') + '<b>' + self.opts.chnl.display_name + '</b>'
				self.refs.logo.width = '206'
				self.refs.logo.height = '100'
			}

			self.draw()
		}

		draw() {
			window.requestAnimationFrame(() => {
				let canvasContext = self.refs.logo.getContext('2d')
				canvasContext.imageSmoothingEnabled = true
				canvasContext.imageSmoothingQuality = 'high'
				canvasContext.fillStyle = '#000000'
				if(self.opts.chnl.stream == null) {
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

		this.on('mount', () => {
			self.u()
		})
		this.on('updated', () => {
			self.u()
		})

		this.root.onclick = function() {
			Tool.ui.findPage('Cockpit').openChannel(self.opts.chnl.id)
		}
	</script>
</channel>