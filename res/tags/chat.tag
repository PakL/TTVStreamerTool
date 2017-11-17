<chat>
	<div><message each={ msg in messages } msg={ msg } /></div>

	<style>
		chat {
			display: block;
			height: 100%;
			overflow: auto;
			padding-bottom: 10px;
		}
		chat > div {
			display: table;
			width: calc(100% - 10px);
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

		throttleupdate() {
			if(!self.isupdating)
				self.update()
		}

		this.root.addEventListener("scroll", () => {
			if(self.nowautoscrollring) {
				self.nowautoscrollring = false
				return
			}
			self.autoscroll = true
			if(!self.scrolled_to_bottom()) {
				self.autoscroll = false
			}
		})

		this.on('update', () => {
			self.isupdating = true
		})
		this.on('updated', () => {
			setTimeout(() => { self.isupdating = false}, 0)
			if(self.autoscroll) {
				self.nowautoscrollring = true
				self.root.scrollTop = self.root.scrollHeight
			}
		})

		scrolled_to_bottom() {
			if((self.root.offsetHeight + self.root.scrollTop) >= self.root.childNodes[0].offsetHeight) {
				return true;
			}
			return false;
		}

		addmessage(message) {
			self.messages.push(message)
			while(self.messages.length > 500) {
				self.messages.shift()
			}
			self.throttleupdate()
		}

		clearuser(username) {
			var messages = self.root.childNodes[0].querySelectorAll('message')
			for(var i = 0; i < messages.length; i++) {
				messages[i]._tag.deleteifuser(username)
			}
		}

		clearmessages() {
			self.messages = []
			self.update()
		}
	</script>
</chat>