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
				self.thumbnailImage.src = self.opts.chnl.stream.thumbnail_url.replace('{width}', '206').replace('{height}', 116)
				self.refs.logo.width = '206'
				self.refs.logo.height = '100'
			}
		}

		draw() {
			window.requestAnimationFrame(() => {
				let canvasContext = self.refs.logo.getContext('2d')
				canvasContext.imageSmoothingEnabled = true
				canvasContext.imageSmoothingQuality = 'high'
				canvasContext.fillStyle = '#ffffff'
				if(self.opts.chnl.stream == null) {
					canvasContext.fillRect(0, 0, 100, 100)
					canvasContext.drawImage(self.logoImage, 0, 0, 100, 100)
				} else {
					canvasContext.fillRect(0, 0, 206, 100)
					canvasContext.drawImage(self.thumbnailImage, 0, 8, 206, 100, 0, 0, 206, 100)
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