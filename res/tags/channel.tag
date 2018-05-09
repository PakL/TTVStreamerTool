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
	</style>
	<script>
		const self = this
		this.on('mount', () => {
			//console.log(self.opts)
			self.refs.logo.setAttribute('src', self.opts.chnl.profile_image_url)
			self.refs.channelname.innerText = self.opts.chnl.display_name
		})
		//this.root.style.backgroundImage = 'url('+self.opts.chnl.logo+')'
		this.root.onclick = function() {
			Tool.ui.findPage('Cockpit').openChannel(self.opts.chnl.id)
		}
	</script>
</channel>