<chat>
	<message each={ msg in messages } msg={ msg } />

	<style>
		chat {
			display: block;
			height: 100%;
			overflow: auto;
		}
	</style>
	<script>
		const self = this
		this.messages = []
		if(typeof(this.opts.messages) == 'object') {
			this.messages = this.opts.messages
		}

		this.on('mount', () => {

		})

		addmessage(message) {
			self.messages.push(message)
			self.update()
			self.root.scrollTop = self.root.scrollHeight
		}
		clearmessages() {
			self.messages = []
			self.update()
		}
	</script>
</chat>