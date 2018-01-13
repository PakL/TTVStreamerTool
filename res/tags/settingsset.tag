<settingsset>
	<fieldset>
		<legend ref="title">{ title }</legend>

		<setting each="{ sett in settings }" data="{ sett }"></setting>
	</fieldset>

	<script>
		const self = this
		this.title = opts.title
		this.settings = opts.settings
		refresh() {
			if(self.title.length > 0) {
				self.refs.title.style.display = 'initial'
			} else {
				self.refs.title.style.display = 'none'
			}
		}

		addSetting(options) {
			self.settings.push(options)
			self.update()
		}

		this.on('mount', self.refresh)
		this.on('updated', self.refresh)
	</script>
</settingsset>