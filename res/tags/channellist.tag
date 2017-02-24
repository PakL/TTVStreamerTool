<channellist>
	<channel each={ chnl in channels } chnl={ chnl } />
	<button ref="loadmore">Mehr laden</button>

	<style>
		channellist > button {
			display: block;
			padding: 5px 20px;
			font-size: 1.2em;
			margin: 10px auto;
		}
	</style>
	<script>
		const self = this

		this.channels = []
		if(typeof(this.opts.channels) != 'undefined') {
			this.channels = this.opts
		}

		this.on('updated', () => {
			self.refs.loadmore.onclick = function() {
				self.refs.loadmore.onclick = () => {}
				loadMoreFollows()
			}
			if(self.channels.length % 10 > 0) {
				self.refs.loadmore.style.display = 'none'
			} else {
				self.refs.loadmore.style.display = 'block'
			}
		})
	</script>
</channellist>