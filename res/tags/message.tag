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

		isGoodYIQ(hexcolor) {
			if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
			else if(hexcolor.length < 6) return

			var r = parseInt(hexcolor.substr(0, 2), 16)
			var g = parseInt(hexcolor.substr(2, 2), 16)
			var b = parseInt(hexcolor.substr(4, 2), 16)
			var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
			return (yiq >= 80) ? true : false
		}

		makeColorLighter(hexcolor) {
			if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
			else if(hexcolor.length < 6) return

			var r = (parseInt(hexcolor.substr(0, 2), 16) + 100).toString(16)
			var g = (parseInt(hexcolor.substr(2, 2), 16) + 100).toString(16)
			var b = (parseInt(hexcolor.substr(4, 2), 16) + 100).toString(16)
			if(r.length > 2) r = 'ff'
			if(g.length > 2) g = 'ff'
			if(b.length > 2) b = 'ff'
			return '#' + r + g + b
		}

		realformat() {
			self.refs.msg.innerHTML = self.opts.msg.message_html
			self.refs.badges.innerHTML = self.opts.msg.badges_html
		
			if(!self.isGoodYIQ(self.opts.msg.color)) {
				self.opts.msg.color = self.makeColorLighter(self.opts.msg.color)
			}
			self.refs.nickname.style.color = self.opts.msg.color
			if(self.opts.msg.action) {
				self.refs.nickname.classList.add('action')
				self.refs.msg.style.color = self.opts.msg.color
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