<actionstream>
	<div class="actionstream_action" each={ actions }>
		<span class="actionstream_nickname" style="color:{color}">{ nickname }</span>
		<span class="actionstream_timestamp">{ timestamp }</span>
		<span class="actionstream_message"><raw content={ message } /></span>
	</div>

	<style>
		actionstream {
			display: block;
			height: 100%;
			overflow-y: auto;
			overflow-x: hidden;
			transform: scaleY(-1);
		}
		@keyframes actionMoveIn {
			0% {
				transform: scaleY(-1) translateX(100%);
			}
			3% {
				transform: scaleY(-1) translateX(0);
				background: #1e1e1e;
			}
			4% { background: #ffffff; }
			10% { background: #1e1e1e; }
			11% { background: #ffffff; }
			20% { background: #1e1e1e; }
			21% { background: #ffffff; }
			30% { background: #1e1e1e; }
			31% { background: #ffffff; }
			40% { background: #1e1e1e; }
			41% { background: #ffffff; }
			50% { background: #1e1e1e; }
			51% { background: #ffffff; }
			60% { background: #1e1e1e; }
			61% { background: #ffffff; }
			70% { background: #1e1e1e; }
			71% { background: #ffffff; }
			80% { background: #1e1e1e; }
			81% { background: #ffffff; }
			90% { background: #1e1e1e; }
			91% { background: #ffffff; }
			100% { background: #1e1e1e; }
		}
		actionstream > .actionstream_action {
			padding: 5px;
			margin: 5px;
			border: 1px solid #d3d3d3;
			border-radius: 5px;
			animation-name: actionMoveIn;
			animation-iteration-count: 1;
			animation-timing-function: ease-out;
			animation-duration: 10s;
			transform: scaleY(-1) translateX(0);
		}
		actionstream > .actionstream_action > .actionstream_nickname {
			font-weight: bold;
			display: block;
			font-size: 1.2em;
		}
		actionstream > .actionstream_action > .actionstream_timestamp {
			float: right;
			font-size: 0.8em;
			color: #b2b2b2;
		}
	</style>
	<script>
		const self = this
		this.actions = []

		this.on('updated', () => {
			self.root.scrollTop = self.root.scrollHeight
		})

		addAction(user, message, timestamp) {
			self.actions.push({
				color: user.color,
				nickname: user.name,
				message: message,
				timestamp: timestamp
			})
			self.update()
		}
		clearActions() {
			self.actions = []
			self.update()
		}
	</script>
</actionstream>