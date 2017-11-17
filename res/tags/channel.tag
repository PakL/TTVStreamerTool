<channel>
	<img class="slideout" src={ opts.chnl.logo } alt="" />
	<a class="channelname label slidein">{ opts.chnl.display_name }</a>

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
		//this.root.style.backgroundImage = 'url('+self.opts.chnl.logo+')'
		this.root.onclick = function() {
			Tool.ui.findPage('Cockpit').openChannel(self.opts.chnl._id)
		}
	</script>
</channel>