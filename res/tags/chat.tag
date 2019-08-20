<chat>
	<div></div>
	<div class="emote-stream"></div>
	<div class="autoscroll-note" onclick={ scoll_to_bottom_man }></div>

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
			display: none;
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

		chat.classic message .user {
			display: inline;
			overflow-wrap: break-word;
			word-wrap: break-word;
			word-break: break-word;
			white-space: initial;
			text-overflow: initial;
			overflow: initial;
		}
		chat.classic message .user .badges {
			float: none;
		}
		chat.classic message .user .badges img {
			vertical-align: bottom;
		}
		chat.classic message .user .nickname::after {
			content: ': ';
			user-select: all;
		}

		chat > .autoscroll-note {
			display: none;
			position: sticky;
			bottom: 5px;
			left: 10px;
			padding: 10px;
			width: calc(100% - 40px);
			border-radius: 10px;
			color: #000000;
			background: rgba(255, 255, 255, 0.9);
			text-align: center;
			cursor: pointer;
		}
	</style>
	<script>
		export default {
			onBeforeMount() {
				this.messages = []
				if(typeof(this.props.messages) == 'object') {
					this.messages = this.props.messages
				}
				this.totopmode = false

				this.isupdating = false
				this.autoscroll = true
				this.nowautoscrollring = false

				this.messageDrop = null
				this.nextAutoscroll = false

				this.emoteStream = null

				this.filteredMessages = {}
				
				this.makeAccessible()
			},
			onMounted() {
				this.messageDrop = this.root.querySelector('div')
				this.emoteStream = this.root.querySelector('.emote-stream')
				this.autoscrollNote = this.$('.autoscroll-note')
				this.autoscrollNote.innerText = Tool.i18n.__('Auto scrolling disabled. Click here to re-enable.')

				const self = this
				this.root.addEventListener("scroll", () => {
					if(self.nowautoscrollring) {
						self.nowautoscrollring = false
						return
					}
					let chattotop = Tool.settings.displayChatToTop
					if(!chattotop) {
						let stb = self.scrolled_to_bottom()
						if(self.autoscroll && !stb) {
							self.autoscrollNote.style.display = 'block'
							self.autoscroll = false
						} else if(!self.autoscroll && stb) {
							self.autoscrollNote.style.display = 'none'
							self.autoscroll = true
						}
					}
				})
			},

			onBeforeUpdate() {
				this.isupdating = true
			},
			onUpdated() {
				const self = this
				window.requestAnimationFrame(() => {
					self.isupdating = false
					self.scoll_to_bottom()
				})
			},

			shouldUpdate() {
				if(this.isupdating) return false
				return true
			},

			scoll_to_bottom_man() {
				this.autoscrollNote.style.display = 'none'
				this.autoscroll = true
				this.scoll_to_bottom()
			},

			scoll_to_bottom() {
				const self = this
				window.requestAnimationFrame(() => {
					let chattotop = Tool.settings.displayChatToTop
					if(!chattotop && self.autoscroll) {
						self.nowautoscrollring = true
						self.root.scrollTop = self.root.scrollHeight
					}
				})
			},

			scrolled_to_bottom() {
				if((this.root.offsetHeight + this.root.scrollTop) >= this.root.childNodes[0].offsetHeight) {
					return true;
				}
				return false;
			},

			unfilter(e) {
				let el = e.target
				while(!el.classList.contains('filtered')) {
					el = el.parentNode
					if(el.tagName.toUpperCase() == 'BODY') return
				}
				let ts = el.dataset.timestamp

				for(let i = 0; i < this.filteredMessages[ts].length; i++) {
					this.addmessage(this.filteredMessages[ts][i], true)
				}
				el.parentNode.removeChild(el)
				delete this.filteredMessages[ts]
			},

			filter(message) {
				if(typeof(this.filteredMessages[message.timestamp]) === 'undefined') {
					this.filteredMessages[message.timestamp] = []
				}

				const self = this
				this.filteredMessages[message.timestamp].push(message)
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

						let chattotop = Tool.settings.displayChatToTop
						if(chattotop) {
							self.messageDrop.prepend(filterElement)
						} else {
							self.messageDrop.appendChild(filterElement)
							if(self.autoscroll) {
								self.nowautoscrollring = true
								self.root.scrollTop = self.root.scrollHeight
							}
						}
					} else {
						messageElement = filterElement.querySelectorAll('span')[1]
					}
					messageElement.innerText = Tool.i18n.__('{{message_count}} messages filtered', {message_count: self.filteredMessages[message.timestamp].length})
				})
			},

			addmessage(message, ignorefilter) {
				if(typeof(ignorefilter) !== 'boolean') ignorefilter = false
				let chattotop = Tool.settings.displayChatToTop

				if(!ignorefilter) {
					if(Tool.settings.filterEmoteSpam) {
						if(this.totopmode && !chattotop) {
							this.root.append(this.emoteStream)
							this.totopmode = false
						} else if(!this.totopmode && chattotop) {
							this.root.prepend(this.emoteStream)
							this.totopmode = true
						}

						let messageWOTags = message.message_html.replace(/(<([^>]+)>)/ig, '').replace(/( |\t)/g, '')
						if(messageWOTags.length <= 0) {
							if(Tool.settings.showEmoteStream) {
								let span = document.createElement('span')
								span.innerHTML = message.message_html
								this.emoteStream.prepend(span)
								if(this.emoteStream.style.display != 'block') {
									this.emoteStream.style.display = 'block'
								}
							} else {
								if(this.emoteStream.style.display != 'none') {
									this.emoteStream.style.display = 'none'
								}
								this.filter(message)
							}
							return
						}
					} else if(this.emoteStream.style.display != 'none') {
						this.emoteStream.style.display = 'none'
					}
					if(Tool.settings.filterBotCommands) {
						if(message.message.startsWith('!') || Tool.chat.isBot(message.user)) {
							this.filter(message)
							return
						}
					}
				}

				const self = this
				window.requestAnimationFrame(() => {

					let newMessageElement = document.createElement('message')
					if(chattotop) {
						self.messageDrop.prepend(newMessageElement)
					} else {
						self.messageDrop.appendChild(newMessageElement)
					}
					riot.mount(newMessageElement, { msg: message });

					while(self.messageDrop.childNodes.length > 500) {
						let el = self.messageDrop.childNodes[(chattotop ? self.messageDrop.childNodes.length-1 : 0)]
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

					if(!chattotop && self.autoscroll) {
						self.nowautoscrollring = true
						self.root.scrollTop = self.root.scrollHeight
					}
				})
			},

			clearuser(username) {
				const self = this
				window.requestAnimationFrame(() => {
					let chattotop = Tool.settings.displayChatToTop
					var messages = self.messageDrop.querySelectorAll('message')
					for(var i = 0; i < messages.length; i++) {
						messages[i]._tag.deleteifuser(username)
					}
					if(!chattotop && self.autoscroll) {
						self.nowautoscrollring = true
						self.root.scrollTop = self.root.scrollHeight
					}
				})
			},

			clearmessage(uuid) {
				const self = this
				window.requestAnimationFrame(() => {
					let chattotop = Tool.settings.displayChatToTop
					var messages = self.messageDrop.querySelectorAll('message')
					for(var i = messages.length-1; i >= 0; i--) {
						if(messages[i]._tag.deleteifuuid(uuid)) {
							break;
						}
					}
					if(!chattotop && self.autoscroll) {
						self.nowautoscrollring = true
						self.root.scrollTop = self.root.scrollHeight
					}
				})
			},

			clearmessages() {
				this.messageDrop.innerHTML = ''
				this.emoteStream.innerHTML = ''
				this.emoteStream.style.display = 'none'
				this.update()
			}
		}
	</script>
</chat>