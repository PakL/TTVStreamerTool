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
		message > span:first-child {
			border-left: 5px solid transparent;
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
			padding-left: 5px;
			width: 40px;
		}
		message.important .timestamp {
			padding-right: 5px;
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
			opacity: 0.4;
		}
		message .m > .automod {
			background: #333333;
			padding: 5px;
		}
		message .m > .automod > button {
			background-color: #8a1e1e;
			margin: 5px;
			margin-left: 0;
			margin-bottom: 0;
		}
		message .m > .automod > button:nth-child(2) {
			background-color: #2b8a1e;
		}
	</style>
	<script>
		export default {
			onBeforeMount() {
				this.uuid = this.props.msg.id
				this.timestamp = this.props.msg.timestamp
				this.user = this.props.msg.user
				this.nickname = this.props.msg.nickname
				this.message = this.props.msg.message

				this.channelColors = {}
				this.colorIndex = -1

				this.deleted = false
				this.makeAccessible()
			},

			onMounted() {
				this.refs = {
					timestamp: this.$('[ref=timestamp]'),
					user: this.$('[ref=user]'),
					badges: this.$('[ref=badges]'),
					nickname: this.$('[ref=nickname]'),
					msg: this.$('[ref=msg]')
				}

				this.realformat()
				this.refs.nickname.style.cursor = 'pointer'
				this.refs.nickname.onclick = function(e) {
					document.querySelector('#channeluser')._tag.showuseroptions(e.target.dataset.username, e.clientX, e.clientY)
				}

				let emotes = this.root.querySelectorAll('img')
				const self = this
				for(let i = 0; i < emotes.length; i++) {
					emotes[i].addEventListener('load', () => {
						if(self.root.parentNode.parentNode.hasOwnProperty('_tag') && typeof(self.root.parentNode.parentNode._tag.scoll_to_bottom) == 'function') {
							self.root.parentNode.parentNode._tag.scoll_to_bottom()
						}
					})
				}

				let clipLinkMatch = this.props.msg.message.match(/https?:\/\/((www\.)?twitch\.tv\/([a-z0-9_]+)\/clip|clips\.twitch\.tv)\/([a-z0-9]+)/i)
				if(clipLinkMatch) {
					let clipEmbed = document.createElement('clipembed')
					clipEmbed.setAttribute('id', clipLinkMatch[4])
					this.$('.m').appendChild(clipEmbed)
					riot.mount(clipEmbed)
				}

				if(this.props.msg.type == 6) {
					this.automodContainer = document.createElement('div')
					this.automodContainer.classList.add('automod')
					this.automodContainer.innerText = Tool.i18n.__('AutoMod rejected this message based on \'{{reason}}\'', { reason: this.props.msg.reason })
					this.automodContainer.appendChild(document.createElement('br'))

					const self = this
					let buttonApprove = document.createElement('button')
					buttonApprove.innerText = Tool.i18n.__('Approve')
					buttonApprove.onclick = () => { Tool.twitchapi.postAutoMod('approve', self.props.msg.id) }
					this.automodContainer.appendChild(buttonApprove)
					let buttonDeny = document.createElement('button')
					buttonDeny.innerText = Tool.i18n.__('Deny')
					buttonDeny.onclick = () => { Tool.twitchapi.postAutoMod('deny', self.props.msg.id) }
					this.automodContainer.appendChild(buttonDeny)

					this.$('.m').appendChild(this.automodContainer)
				}
			},

			onBeforeUpdate() {
				this.uuid = this.props.msg.id
				this.timestamp = this.props.msg.timestamp
				this.user = this.props.msg.user
				this.nickname = this.props.msg.nickname
				this.message = this.props.msg.message
			},
			onUpdated() {
				this.realformat()
			},

			deletemessage() {
				if(this.deleted) return
				this.deleted = true
				this.props.msg.old_message = this.props.msg.message_html
				if(!Tool.settings.autoRecoverMessages) {
					this.props.msg.message_html = `&lt; ${Tool.i18n.__('Message was deleted')} &gt;`
				}
				this.realformat()
			},

			deleteifuuid(uuid) {
				if(this.uuid == uuid) {
					this.deletemessage()
					return true
				}
				return false
			},

			deleteifuser(username) {
				if(username == this.props.msg.user && !this.props.msg.hasOwnProperty('old_message')) {
					this.deletemessage()
					return true
				}
				return false
			},

			approveIfUuid(uuid) {
				if(this.uuid == uuid) {
					if(typeof(this.automodContainer) !== 'undefined') {
						this.automodContainer.remove()
					}
					return true
				}
				return false
			},
			denyIfUuid(uuid) {
				if(this.uuid == uuid) {
					if(typeof(this.automodContainer) !== 'undefined') {
						this.automodContainer.remove()
					}
					this.deletemessage()
					return true
				}
				return false
			},

			realformat() {
				const self = this
				this.refs.msg.innerHTML = this.props.msg.message_html
				if(this.uuid.length > 0 && !this.deleted && !this.props.msg.badges_html.match(/title="(Moderator|Broadcaster)"/) && Tool.cockpit.channelModerator) {
					this.refs.badges.innerHTML = this.props.msg.badges_html + ' <a class="removemsg" title="' + Tool.i18n.__('Delete message') + '">🗑️</a>'
					
					this.refs.badges.querySelector('.removemsg').onclick = function(){
						if(typeof(Tool.cockpit.openChannelObject.login) == 'string') {
							Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/delete ' + self.uuid)
						}
					}
				} else {
					this.refs.badges.innerHTML = this.props.msg.badges_html
				}

				if(this.props.msg.channel != this.props.msg.mainchannel) {
					if(!this.channelColors.hasOwnProperty(this.props.msg.channel)) {
						this.channelColors[this.props.msg.channel] = getNextColor(this.colorIndex)
						this.colorIndex++
					}
					this.refs.timestamp.style.borderLeftColor = this.channelColors[this.props.msg.channel]
					this.nickname = '<span style="color:#fff;font-weight:normal;">(#' + this.props.msg.channel + ')</span> ' + this.props.msg.nickname
					this.refs.nickname.innerHTML = this.nickname
				}

				if(this.props.msg.type != 5) {
					this.refs.nickname.style.color = this.props.msg.color
				}
				if(this.props.msg.type > 0 && this.props.msg.type < 4) {
					this.refs.nickname.classList.add('action')
					this.refs.msg.style.color = this.props.msg.color
				}
				if(this.props.msg.type == 2) {
					this.root.classList.add('important')
					this.refs.user.style.display = 'none'
				}
				if(this.props.msg.type == 3 || this.props.msg.type == 4) {
					this.root.classList.add('important')
				}
				if(this.props.msg.type == 4) {
					this.refs.nickname.classList.add('whisper')
				}
				if(this.props.msg.type == 5) {
					this.root.classList.add('highlight')
				}

				if(this.props.msg.hasOwnProperty('old_message')) {
					this.root.classList.add('deleted')
					this.refs.msg.onclick = (e) => {
						e.preventDefault()
						self.props.msg.message_html = self.props.msg.old_message
						self.realformat()
					}
				} else {
					this.root.classList.remove('deleted')
				}

				var links = this.root.querySelectorAll('a')
				for(var i = 0; i < links.length; i++) {
					if(this.props.msg.type != 5) {
						links[i].style.color = this.props.msg.color
					}
					if(typeof(links[i].onclick) !== 'function') {
						links[i].onclick = function(e) {
							e.preventDefault()
							openLinkExternal(this.href)
						}
					}
				}
			}
		}
	</script>
</message>