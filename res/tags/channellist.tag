<channellist>
	<channel each={ chnl in channels } chnl={ chnl } class="metro-tile" />
	<button ref="loadmore"></button>

	<style>
		channellist {
			display: block;
			line-height: 0;
			text-align: center;
		}
		channellist > button {
			display: block;
			/*padding: 5px 20px;*/
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

		this.on('mount', () => {
			self.refs.loadmore.innerText = Tool.i18n.__('Load more')
		})

		this.on('updated', () => {
			self.refs.loadmore.onclick = function() {
				self.refs.loadmore.onclick = () => {}
				Tool.ui.findPage('Cockpit').loadMoreFollows()
			}

			refreshTileColors()
		})

		hideButton() {
			self.refs.loadmore.style.display = 'none'
		}
		showButton() {
			self.refs.loadmore.style.display = 'block'
		}
	</script>
</channellist>