<chat>
	<div></div>

	<style>
		chat {
			display: block;
			height: 100%;
			overflow: auto;
			padding-bottom: 10px;
		}
		chat > div {
			display: table;
			width: 100%;
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
		
		this.on('mount', () => { self.messageDrop = self.root.querySelector('div') })

		throttleupdate() {
			if(!self.isupdating)
				self.update()
		}

		this.root.addEventListener("scroll", () => {
			if(self.nowautoscrollring) {
				self.nowautoscrollring = false
				return
			}
			console.log('user scroll')
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

		addmessage(message) {
			window.requestAnimationFrame(() => {
				let newMessageElement = document.createElement('message')
				self.messageDrop.appendChild(newMessageElement)
				riot.mount(newMessageElement, { msg: message });

				while(self.messageDrop.childNodes.length > 500) {
					self.messageDrop.removeChild(self.messageDrop.childNodes[0])
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

		clearmessages() {
			self.messageDrop.innerHTML = ''
			self.update()
		}
	</script>
</chat>