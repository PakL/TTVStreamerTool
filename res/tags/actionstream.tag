<actionstream>
	<div each={ actions } class="actionstream_action" >
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
		}
		@keyframes actionFlash {
			0% {
				transform: translateX(100%);}
			3% {
				transform: translateX(0);
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
		@keyframes actionMoveIn {
			0% {
				transform: translateX(100%);
			}
			3% {
				transform: translateX(0);
			}
		}
		actionstream > .actionstream_action {
			padding: 5px;
			margin: 5px;
			border: 1px solid #d3d3d3;
			border-radius: 5px;
			transform: translateX(0);
			animation-name: actionMoveIn;
			animation-iteration-count: 1;
			animation-timing-function: ease-out;
			animation-duration: 10s;
		}
		actionstream.flash > .actionstream_action {
			animation-name: actionFlash;
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
		this.nextid = 0

		/*this.on('updated', () => {
			self.root.scrollTop = self.root.scrollHeight
		})*/

		addAction(user, message, timestamp) {
			/*self.actions.push({
				id: self.nextid,
				color: user.color,
				nickname: user.name,
				message: message,
				timestamp: timestamp
			})
			self.nextid++*/

			let actionElement = document.createElement('div')
			actionElement.classList.add('actionstream_action')

			let actionNickname = document.createElement('span')
			actionNickname.classList.add('actionstream_nickname')
			actionNickname.style.color = user.color
			actionNickname.innerText = user.name
			actionElement.appendChild(actionNickname)

			let actionTimestamp = document.createElement('span')
			actionTimestamp.classList.add('actionstream_timestamp')
			actionTimestamp.innerText = timestamp
			actionElement.appendChild(actionTimestamp)

			let actionMessage = document.createElement('span')
			actionMessage.classList.add('actionstream_message')
			actionMessage.innerHTML = message
			actionElement.appendChild(actionMessage)

			if(self.root.childNodes.length <= 0) {
				self.root.appendChild(actionElement)
			} else {
				self.root.insertBefore(actionElement, self.root.childNodes[0])
			}

			if(self.root.childNodes.length > 200) {
				self.root.removeChild(self.root.childNodes[self.root.childNodes.length-1])
			}
			if(Tool.settings.flashActions && !self.root.classList.contains('flash')) {
				self.root.classList.add('flash')
			} else if(!Tool.settings.flashActions && self.root.classList.contains('flash')) {
				self.root.classList.remove('flash')
			}
			self.update()
		}
		clearActions() {
			//self.actions = []
			self.root.innerHTML = ''
			self.update()
		}
	</script>
</actionstream>