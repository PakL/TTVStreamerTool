<channel>
	<img src={ opts.chnl.logo } alt="" />
	<a class="channelname">{ opts.chnl.display_name }</a>

	<style>
		channel {
			width: 140px;
			padding: 10px;
			display: inline-block;
			text-align: center;
			cursor: pointer;
		}
		channel > img {
			width: 120px;
			height: 120px;
			border-radius: 50%;
		}
	</style>
	<script>
		const self = this
		this.root.onclick = function() {
			openChannel(self.opts.chnl._id)
		}
	</script>
</channel>