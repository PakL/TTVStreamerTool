<channel>
	<img ref="logo" class="slideout" alt="" />
	<a ref="channelname" class="channelname label slidein"></a>

	<style>
		channel {
			cursor: pointer;

			background-size: cover;
		}
		channel > img {
			width: 100%;
			height: auto;
		}
		channel > img.offline {
			filter: grayscale(1);
		}
	</style>
	<script>
		const self = this
		u() {
			self.refs.logo.setAttribute('src', self.opts.chnl.profile_image_url)
			self.refs.channelname.innerText = self.opts.chnl.display_name
			if(self.opts.chnl.stream == null) {
				self.refs.logo.classList.add('offline')
			} else {
				self.refs.logo.classList.remove('offline')
			}
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