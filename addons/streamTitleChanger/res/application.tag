<application>
	<label>
		<span ref="lang_selected_application"></span>
		<input type="text" ref="selected_application" class="selected_application" value={ applicationpath } readonly>
	</label>
	<label>
		<button type="button" ref="select_application" onClick={ selectApplication }></button>
	</label>

	<label>
		<span ref="lang_set_stream_title"></span>
		<input type="text" ref="stream_title" value={ streamtitle } class="stream_title">
	</label>
	<label>
		<span ref="lang_set_stream_game"></span>
		<input type="text" ref="stream_game" value={ streamgame } class="stream_game">
	</label>
	<hr>

	<script>
		const self = this
		const {BrowserWindow, dialog} = require('electron').remote
		this.titlechanger = null

		this.applicationpath = this.opts.app.path
		this.streamtitle = this.opts.app.title
		this.streamgame = this.opts.app.game

		this.on('mount', () => {
			self.titlechanger = Tool.addons.getAddon('streamTitleChanger')
			self.refs.lang_selected_application.innerText = self.titlechanger.i18n.__('Selected application:')
			self.refs.select_application.innerText = self.titlechanger.i18n.__('Select an application')
			self.refs.lang_set_stream_title.innerText = self.titlechanger.i18n.__('Change stream title to:')
			self.refs.lang_set_stream_game.innerText = self.titlechanger.i18n.__('Change stream game to:')
		})

		selectApplication() {
			let files = dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
				title: self.titlechanger.i18n.__('Select an application'),
				filters: [{name: 'Executeable files', extensions: ['dll', 'exe']}],
				properties: [ 'openFile' ]
			})
			if(files != null && files.hasOwnProperty('length') && files.length > 0) {
				self.applicationpath = files[0]
			}
			self.update()
		}
	</script>
</application>