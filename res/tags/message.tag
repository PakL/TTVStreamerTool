<message>
	<span class="timestamp" ref="timestamp">{ timestamp }</span>
	<span class="m">
		<span class="user" ref="user">
			<span class="badges" ref="badges"></span>
			<span class="nickname" ref="nickname" data-username="{ user }">{ nickname }</span>
		</span>
		<span class="msg" ref="msg">{ message }</span>
	</span>
	
	<style>
		message {
			display: table-row;
			line-height: 1.5em;
		}
		message.important {
			background-color: #000000;
		}
		message.highlight {
			background-color: #8a1e1e;
		}
		message > span {
			display: table-cell;
			padding: 3px 0;
			padding-right: 5px;
		}
		message.important > span {
			padding: 10px 0;
		}
		message .timestamp {
			vertical-align: top;
			color: #777;
			padding-right: 5px;
			width: 40px;
			padding-left: 5px;
		}
		message .user {
			display: block;
			text-align: left;
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;
		}
		message .user .badges {
			float: right;
		}
		message .user .badges img {
			display: inline-block;
			height: 18px;
			margin: 1px 3px 1px 0;
			min-width: 18px;
			vertical-align: middle;
		}

		message .user > .nickname {
			font-weight: bold;
		}
		message .user > .nickname.whisper:before {
			content: "(Whisper) ";
		}

		message .msg {
			overflow-wrap: break-word;
			word-wrap: break-word;
			word-break: break-word;
		}
		message .msg .d {
			color: #777;
		}
		message .msg img {
			vertical-align: middle;
			margin: -.5rem 0;
			display: inline-block;
		}
		message .msg a {
			text-decoration: underline;
		}
		message.deleted {
			background-color: #303030;
		}
	</style>
	<script>
		const self = this

		this.timestamp = opts.msg.timestamp
		this.user = opts.msg.user
		this.nickname = opts.msg.nickname
		this.message = opts.msg.message

		this.on("mount", () => {
			self.realformat()
			self.refs.nickname.style.cursor = 'pointer'
			self.refs.nickname.onclick = function(e) {
				document.querySelector('#channeluser')._tag.showuseroptions(e.target.dataset.username, e.clientX, e.clientY)
			}

			let emotes = self.root.querySelectorAll('img')
			for(let i = 0; i < emotes.length; i++) {
				emotes[i].addEventListener('load', () => {
					if(self.root.parentNode.parentNode.hasOwnProperty('_tag') && typeof(self.root.parentNode.parentNode._tag.scoll_to_bottom) == 'function') {
						self.root.parentNode.parentNode._tag.scoll_to_bottom()
					}
				})
			}
		})
		this.on('update', () => {
			this.timestamp = opts.msg.timestamp
			this.user = opts.msg.user
			this.nickname = opts.msg.nickname
			this.message = opts.msg.message
		})
		this.on("updated", () => self.realformat() )

		deleteifuser(username) {
			if(username == self.opts.msg.user && !self.opts.msg.hasOwnProperty('old_message')) {
				self.opts.msg.old_message = self.opts.msg.message_html
				if(!Tool.settings.autoRecoverMessages) {
					self.opts.msg.message_html = `&lt; ${Tool.i18n.__('Message was deleted')} &gt;`
				}
				self.realformat()
				return true
			}
			return false
		}

		realformat() {
			self.refs.msg.innerHTML = self.opts.msg.message_html
			self.refs.badges.innerHTML = self.opts.msg.badges_html

			if(self.opts.msg.type >= 20) {
				self.root.classList.add('deleted')
				self.opts.msg.type = self.opts.msg.type-20
			}

			if(self.opts.msg.type != 5) {
				self.refs.nickname.style.color = self.opts.msg.color
			}
			if(self.opts.msg.type > 0 && self.opts.msg.type < 4) {
				self.refs.nickname.classList.add('action')
				self.refs.msg.style.color = self.opts.msg.color
			}
			if(self.opts.msg.type == 2) {
				self.root.classList.add('important')
				self.refs.user.style.display = 'none'
			}
			if(self.opts.msg.type == 3 || self.opts.msg.type == 4) {
				self.root.classList.add('important')
			}
			if(self.opts.msg.type == 4) {
				self.refs.nickname.classList.add('whisper')
			}
			if(self.opts.msg.type == 5) {
				self.root.classList.add('highlight')
			}

			if(self.opts.msg.hasOwnProperty('old_message')) {
				self.root.classList.add('deleted')
				self.refs.msg.onclick = (e) => {
					e.preventDefault()
					self.opts.msg.message_html = self.opts.msg.old_message
					self.realformat()
				}
			} else {
				self.root.classList.remove('deleted')
			}

			var links = self.root.querySelectorAll('a')
			for(var i = 0; i < links.length; i++) {
				if(self.opts.msg.type != 5) {
					links[i].style.color = self.opts.msg.color
				}
				links[i].onclick = function(e) {
					e.preventDefault()
					openLinkExternal(this.href)
				}
			}
		}
	</script>
</message>