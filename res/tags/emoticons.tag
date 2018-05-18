<emoticons>
	<div each={ e in emotes }>
		<a each={ e }><span style="background-image:url({ url })" data-code={ code } title={ code }></a>
	</div>

	<style>
		emoticons {
			padding: 5px;
			text-align: center;
		}
		emoticons > div {
			padding: 10px 0;
			border-bottom: 1px solid #dad8de;
		}
		emoticons > div:first-child {
			padding-top: 0;
		}
		emoticons > div:last-child {
			padding-bottom: 0;
			border-bottom: 0;
		}

		emoticons > div > a > span {
			display: inline-block;
			height: 38px;
			min-width: 38px;
			cursor: pointer;
			background-position: center center;
			background-repeat: no-repeat;
		}
	</style>

	<script>
		const self = this
		this.emotes = []

		this.on('updated', () => {
			let emotes = self.root.querySelectorAll('span')
			for(let i = 0; i < emotes.length; i++) {
				emotes[i].onclick = self.addemote
			}
		})

		setemotes(emotes) {
			self.emotes = [];
			if(emotes.hasOwnProperty('emoticon_sets')) {
				for(let i in emotes.emoticon_sets) {
					if(emotes.emoticon_sets.hasOwnProperty(i)) {
						for(let j = 0; j < emotes.emoticon_sets[i].length; j++) {
							emotes.emoticon_sets[i][j].url = 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes.emoticon_sets[i][j].id + '/1.0'
						}
						self.emotes.unshift(emotes.emoticon_sets[i]);
					}
				}
			} else if(Array.isArray(emotes)) {
				for(let i = 0; i < emotes.length; i++) {
					if(Array.isArray(emotes[i])) {
						let validEmotes = []
						for(let j = 0; j < emotes[i].length; j++) {
							if(emotes[i][j].hasOwnProperty('url') && emotes[i][j].hasOwnProperty('code')) {
								validEmotes.push(emotes[i][j])
							}
						}
						self.emotes.push(validEmotes)
					}
				}
			}
			self.update()
		}

		filteremotes(needle) {
			let emotes = self.root.querySelectorAll('span')
			for(let i = 0; i < emotes.length; i++) {
				if(needle.length > 0 && emotes[i].dataset.code.toLowerCase().indexOf(needle.toLowerCase()) < 0) {
					emotes[i].parentNode.style.display = 'none'
				} else {
					emotes[i].parentNode.style.display = 'inline'
				}
			}
		}

		addemote(e) {
			var code = e.target.dataset.code;
			var raex = new RandExp(code.replace("\\&lt\\;", "<").replace("\\&gt\\;", ">").replace('(', '\\(').replace(')', '\\)')).gen();
			document.getElementById('chat_message').value += " " + raex;
		}
	</script>
</emoticons>