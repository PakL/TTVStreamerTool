<message>
	<span class="timestamp" ref="timestamp">{ opts.msg.timestamp }</span>
	<span class="badges" ref="badges"></span>
	<span class="nickname" ref="nickname">{ opts.msg.nickname }</span>
	<span class="msg" ref="msg">{ opts.msg.message }</span>
	
	<style>
		message {
			display: block;
			line-height: 1.5em;
			margin: 5px 0;
		}
		message.important {
			background-color: #000000;
			padding-top: 3px;
			padding-bottom: 3px;
		}
		message > .timestamp {
			color: #777;
		}
		message > .timestamp:before {
			content: "[";
		}
		message > .timestamp:after {
			content: "] ";
		}
		message > .nickname {
			font-weight: bold;
		}
		message > .nickname:after {
			content: ":";
		}
		message > .nickname.action:after {
			content: "";
		}
		message > .msg {
			overflow-wrap: break-word;
			word-wrap: break-word;
			word-break: break-word;
		}
		message > .msg:before {
			content: " ";
		}
		message > .msg .d {
			color: #777;
		}
		message > .badges  img {
			display: inline-block;
			height: 18px;
			margin: 1px 3px 1px 0;
			min-width: 18px;
			vertical-align: middle;
		}
		message > .msg img {
			vertical-align: middle;
			margin: -5px 0;
			display: inline-block;
		}
		message > .msg a {
			text-decoration: underline;
		}
	</style>
	<script>
		var self = this

		this.on("mount", () => self.realformat() )
		this.on("updated", () => self.realformat() )


		realformat() {
			self.refs.msg.innerHTML = self.opts.msg.message_html
			self.refs.badges.innerHTML = self.opts.msg.badges_html

			self.refs.nickname.style.color = self.opts.msg.color
			if(self.opts.msg.type > 0) {
				self.refs.nickname.classList.add('action')
				self.refs.msg.style.color = self.opts.msg.color
			}
			if(self.opts.msg.type == 2) {
				self.root.classList.add('important')
				self.refs.nickname.style.display = 'none'
			}
			if(self.opts.msg.type == 3) {
				self.root.classList.add('important')
			}

			var links = self.root.querySelectorAll('a')
			for(var i = 0; i < links.length; i++) {
				links[i].style.color = self.opts.msg.color
				links[i].onclick = function(e) {
					e.preventDefault()
					openLinkExternal(this.href)
				}
			}
		}
	</script>
</message>