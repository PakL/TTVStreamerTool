<chat>
	<message each={ msg in messages } msg={ msg } />

	<style>
		chat {
			display: block;
			height: 100%;
			overflow: auto;
		}
		@keyframes messageMoveIn {
			0% {
				transform: translateX(-100%);
			}
			100% {
				transform: translateX(0);
			}
		}
		chat > message {
			animation-name: messageMoveIn;
			animation-iteration-count: 1;
			animation-timing-function: ease-out;
			animation-duration: 0.1s;
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

		this.on('updated', () => {
			self.root.scrollTop = self.root.scrollHeight
		})

		addmessage(message) {
			self.messages.push(message)
			self.update()
			
		}
		clearmessages() {
			self.messages = []
			self.update()
		}
	</script>
</chat>