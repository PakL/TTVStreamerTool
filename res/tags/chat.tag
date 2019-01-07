<chat>
	<div></div>
	<div class="emote-stream"></div>

	<style>
		chat {
			position: relative;
			display: block;
			height: 100%;
			overflow: auto;
			overflow-x: hidden;
		}
		chat > div {
			display: table;
			width: 100%;
			
			user-select: text;
			-webkit-user-select: text;
		}

		chat > div > .filtered {
			display: table-row;
			background: #777;
			color: #000;
		}
		chat > div > .filtered > span {
			display: table-cell;
			padding: 3px 0;
			padding-right: 5px;
		}
		chat > div > .filtered > span:first-child {
			vertical-align: top;
			padding-right: 5px;
			width: 40px;
			padding-left: 5px;
		}

		@keyframes emotesMove {
			0% {
				transform: translateX(-100%);
			}
			100% {
				transform: translateX(0);
			}
		}
		chat > div.emote-stream {
			display: block;
			padding-left: 5px;
			padding-right: 5px;
			height: 38px;
			overflow: hidden;
			line-height: 38px;
			white-space: nowrap;
		}
		chat > div.emote-stream > span {
			display: inline-block;
			transform: translateX(0);
			animation-name: emotesMove;
			animation-iteration-count: 1;
			animation-timing-function: ease-out;
			animation-duration: 0.2s;
		}
		chat > div.emote-stream img {
			vertical-align: bottom;
		}
	</style>
	<script>
		const self = this
		this.messages = []
		if(typeof(this.opts.messages) == 'object') {
			this.messages = this.opts.messages
		}

		this.isupdating = false
		this.autoscroll = true
		this.nowautoscrollring = false

		this.messageDrop = null
		this.nextAutoscroll = false

		this.emoteStream = null

		this.filteredMessages = {}
		
		this.on('mount', () => {
			self.messageDrop = self.root.querySelector('div')
			self.emoteStream = self.root.querySelector('.emote-stream')
		})

		this.root.addEventListener("scroll", () => {
			if(self.nowautoscrollring) {
				self.nowautoscrollring = false
				return
			}
			//console.log('user scroll')
			self.autoscroll = true
			if(!self.scrolled_to_bottom()) {
				self.autoscroll = false
			}
		})

		this.on('update', () => {
			self.isupdating = true
		})
		this.on('updated', () => {
			window.requestAnimationFrame(() => {
				self.isupdating = false
				self.scoll_to_bottom()
			})
		})
		shouldUpdate() {
			if(self.isupdating) return false
			return true
		}

		scoll_to_bottom() {
			window.requestAnimationFrame(() => {
				if(self.autoscroll) {
					self.nowautoscrollring = true
					self.root.scrollTop = self.root.scrollHeight
				}
			})
		}

		scrolled_to_bottom() {
			if((self.root.offsetHeight + self.root.scrollTop) >= self.root.childNodes[0].offsetHeight) {
				return true;
			}
			return false;
		}

		unfilter(e) {
			let el = e.target
			while(!el.classList.contains('filtered')) {
				el = el.parentNode
				if(el.tagName.toUpperCase() == 'BODY') return
			}
			let ts = el.dataset.timestamp

			for(let i = 0; i < self.filteredMessages[ts].length; i++) {
				self.addmessage(self.filteredMessages[ts][i], true)
			}
			el.parentNode.removeChild(el)
			delete self.filteredMessages[ts]
		}

		filter(message) {
			if(typeof(self.filteredMessages[message.timestamp]) === 'undefined') {
				self.filteredMessages[message.timestamp] = []
			}

			self.filteredMessages[message.timestamp].push(message)
			window.requestAnimationFrame(() => {
				let filterElement = self.root.querySelector('div.filtered#filter_' + message.timestamp.replace(/[^0-9a-z]/ig, ''))

				let messageElement = document.createElement('span')
				if(filterElement == null) {
					let timestampElement = document.createElement('span')
					timestampElement.innerText = message.timestamp

					let filterElement = document.createElement('div')
					filterElement.classList.add('filtered')
					filterElement.setAttribute('id', 'filter_' + message.timestamp.replace(/[^0-9a-z]/ig, ''))
					filterElement.dataset.timestamp = message.timestamp
					filterElement.appendChild(timestampElement)
					filterElement.appendChild(messageElement)
					filterElement.onclick = self.unfilter

					self.messageDrop.appendChild(filterElement)

						
					if(self.autoscroll) {
						self.nowautoscrollring = true
						self.root.scrollTop = self.root.scrollHeight
					}
				} else {
					messageElement = filterElement.querySelectorAll('span')[1]
				}
				messageElement.innerText = Tool.i18n.__('{{message_count}} messages filtered', {message_count: self.filteredMessages[message.timestamp].length})
			})
		}

		addmessage(message, ignorefilter) {
			if(typeof(ignorefilter) !== 'boolean') ignorefilter = false

			if(!ignorefilter) {
				if(Tool.settings.filterEmoteSpam) {
					let messageWOTags = message.message_html.replace(/(<([^>]+)>)/ig, '').replace(/( |\t)/g, '')
					if(messageWOTags.length <= 0) {
						if(Tool.settings.showEmoteStream) {
							let span = document.createElement('span')
							span.innerHTML = message.message_html
							self.emoteStream.prepend(span)
							if(self.emoteStream.style.display != 'block') {
								self.emoteStream.style.display = 'block'
							}
						} else {
							if(self.emoteStream.style.display != 'none') {
								self.emoteStream.style.display = 'none'
							}
							self.filter(message)
						}
						return
					}
				} else if(self.emoteStream.style.display != 'none') {
					self.emoteStream.style.display = 'none'
				}
				if(Tool.settings.filterBotCommands) {
					if(message.message.startsWith('!') || ['moobot', 'streamelements', 'nightbot'].indexOf(message.user) >= 0) {
						self.filter(message)
						return
					}
				}
			}

			window.requestAnimationFrame(() => {
				let newMessageElement = document.createElement('message')
				self.messageDrop.appendChild(newMessageElement)
				riot.mount(newMessageElement, { msg: message });

				while(self.messageDrop.childNodes.length > 500) {
					let el = self.messageDrop.childNodes[0]
					if(el.classList.contains('filtered')) {
						let ts = el.dataset.timestamp
						delete self.filteredMessages[ts]
					}
					self.messageDrop.removeChild(el)
				}

				while(self.emoteStream.childNodes.length > 100) {
					let el = self.emoteStream.childNodes[self.emoteStream.childNodes.length-1]
					self.emoteStream.removeChild(el)
				}

				if(self.autoscroll) {
					self.nowautoscrollring = true
					self.root.scrollTop = self.root.scrollHeight
				}
			})
		}

		clearuser(username) {
			window.requestAnimationFrame(() => {
				var messages = self.messageDrop.querySelectorAll('message')
				for(var i = 0; i < messages.length; i++) {
					messages[i]._tag.deleteifuser(username)
				}
			})
		}

		clearmessage(uuid) {
			window.requestAnimationFrame(() => {
				var messages = self.messageDrop.querySelectorAll('message')
				for(var i = messages.length-1; i >= 0; i--) {
					if(messages[i]._tag.deleteifuuid(uuid)) {
						break;
					}
				}
			})
		}

		clearmessages() {
			self.messageDrop.innerHTML = ''
			self.emoteStream.innerHTML = ''
			self.emoteStream.style.display = 'none'
			self.update()
		}
	</script>
</chat>