<emoticons>
	<div each={ e in emotes }>
		<a each={ e }><span style="background-image:url(http://static-cdn.jtvnw.net/emoticons/v1/{ id }/1.0)" data-code={ code } title={ code } onclick={ addemote }></a>
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

		setemotes(emotes) {
			self.emotes = [];
			for(i in emotes.emoticon_sets) {
				if(emotes.emoticon_sets.hasOwnProperty(i))
					self.emotes.unshift(emotes.emoticon_sets[i]);
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
			var raex = new RandExp(code.replace("\\&lt\\;", "<").replace("\\&gt\\;", ">")).gen();
			document.getElementById('chat_message').value += " " + raex;
		}
	</script>
</emoticons>