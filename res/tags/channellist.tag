<channellist>
	<div>
		<channel each={ chnl in channels } chnl={ chnl } class="metro-tile" />
	</div>
	<button ref="loadmore"></button>

	<style>
		channellist {
			display: block;
			line-height: 0;
			text-align: center;
		}
		channellist > div {
			text-align: left;
			margin: auto;
			width: fit-content;
		}
		channellist > button {
			display: block;
			/*padding: 5px 20px;*/
			font-size: 1.2em;
			margin: 10px auto;
		}
	</style>
	<script>
		export default {
			onBeforeMount() {
				this.channels = []
				if(typeof(this.props.channels) != 'undefined') {
					this.channels = this.props.channels
				}
				this.makeAccessible()
			},
			onMounted() {
				this.refs = {
					loadmore: this.$('[ref=loadmore]')
				}
				this.refs.loadmore.innerText = Tool.i18n.__('Load more')
			},

			onBeforeUpdate(props, state) {
				this.channels = state.channels
			},

			onUpdated() {
				this.refs.loadmore.onclick = function() {
					this.refs.loadmore.onclick = () => {}
					Tool.ui.findPage('Cockpit').loadMoreFollows()
				}

				refreshTileColors()
			},

			hideButton() {
				this.refs.loadmore.style.display = 'none'
			},
			showButton() {
				this.refs.loadmore.style.display = 'block'
			}
		}
	</script>
</channellist>