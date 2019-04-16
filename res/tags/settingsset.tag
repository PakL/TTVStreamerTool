<settingsset>
	<fieldset>
		<legend ref="title"><span ref="togglebutton">➕</span> { title }</legend>

		<setting each="{ sett in settings }" data="{ sett }"></setting>
	</fieldset>

	<style>
		settingsset.collapsed > fieldset > * {
			display: none;
		}
		settingsset.collapsed > fieldset > legend {
			display: initial;
		}
		settingsset > fieldset > legend {
			cursor: pointer;
		}
	</style>

	<script>
		const self = this
		this.visible = false
		this.title = opts.title
		this.settings = opts.settings
		refresh() {
			if(self.title.length > 0) {
				self.refs.title.onclick = self.toggle
				self.refs.title.style.display = 'initial'
				if(self.visible) {
					self.root.classList.remove('collapsed')
					self.refs.togglebutton.innerHTML = '➖'
				} else {
					self.root.classList.add('collapsed')
					self.refs.togglebutton.innerHTML = '➕'
				}
			} else {
				self.refs.title.style.display = 'none'
			}
		}

		clear() {
			self.settings = []
			self.update()
		}

		addSetting(options) {
			self.settings.push(options)
			self.update()
		}

		toggle() {
			this.visible = !this.visible
			self.refresh()
		}

		this.on('mount', self.refresh)
		this.on('updated', self.refresh)
	</script>
</settingsset>