	"use strict"

const path = require("path")
const {spawn} = require('child_process')
const UIPage  = require(path.dirname(module.parent.filename) + '/../mod/uipage')
const fs = require('fs')

class StreamTitleChanger extends UIPage {

	constructor(tool, i18n) {
		super('Stream Title Changer')

		this.tool = tool
		this.i18n = i18n
		this.contentElement = null
		this.settings = tool.settings.getJSON('streamtitlechanger', [])
		this.timer = null
		this.psspath = ''
		this.ls = null

		this.lastactiveknown = -1

		const self = this
		this.tool.on('load', () => {
			let applicationlist = document.createElement('applicationlist')

			self.contentElement = document.createElement('div')
			self.contentElement.style.padding = '10px'
			self.contentElement.appendChild(applicationlist)
			document.querySelector('#contents').appendChild(self.contentElement)

			console.log('[StreamTitleChanger] Loading monitoring script into temp folder')
			try {
				let script = fs.readFileSync(path.join(__dirname, 'processmonitor.ps1'), {encoding: 'utf8'})
				this.psspath = path.join(process.env.TEMP, 'processmonitor.ps1')
				fs.writeFileSync(this.psspath, script)
				console.log('[StreamTitleChanger] ' + this.psspath + ' created')
				self.startProcessMonitor();
			} catch(e) {
				self.tool.ui.showErrorMessage(e)
			}
			
			riot.compile('/' + __dirname.replace(/\\/g, '/') + '/res/application.tag', () => {
				riot.compile('/' + __dirname.replace(/\\/g, '/') + '/res/applicationlist.tag', () => {
					riot.mount(applicationlist)
				})
			})
		})
		this.tool.on('exit', () => {
			if(this.ls != null) {
				this.ls.kill()
			}
			if(this.psspath.length > 0) {
				fs.unlinkSync(this.psspath)
			}
		})
	}

	startProcessMonitor() {
		const self = this
		this.ls = spawn('powershell', ["-ExecutionPolicy", "Bypass","-File", this.psspath])
		this.ls.stdout.setEncoding('utf8')
		this.ls.stdout.on('data', function(stdout) {
			self.checkProcess(stdout.toString())
		});
		this.ls.on('error', (err) => {
			self.tool.ui.showErrorMessage(err)
		})
	}

	checkProcess(cmdpath) {
		for(let i = 0; i < this.settings.length; i++) {
			if(cmdpath == this.settings[i].path && this.lastactiveknown != i) {
				let update = {}
				if(this.settings[i].title.length > 0) {
					update.status = this.settings[i].title
				}
				if(this.settings[i].game.length > 0) {
					update.game = this.settings[i].game
				}

				this.lastactiveknown = i
				
				this.tool.ui.showErrorMessage(new Error(
					this.i18n.__('{{game}} was detected. Stream information are being changed according to your settings.', {game: path.basename(cmdpath)})
					+ '\n'
					+ this.i18n.__('This message hides in 5 seconds.')
				), true)
				console.log('[StreamTitleChanger] ' + path.basename(cmdpath) + ' is running. Stream information changing...')
				this.tool.twitchapi.updateChannel(this.tool.cockpit.openChannelId, update, () => {
					console.log('[StreamTitleChanger] Done.')
				})
			}
		}
	}

	saveApplications() {
		let applications = this.contentElement.querySelectorAll('application')
		let applicationsSettings = []
		for(let i = 0; i < applications.length; i++) {
			let app_path = applications[i].querySelector('.selected_application').value
			let str_title = applications[i].querySelector('.stream_title').value
			let str_game = applications[i].querySelector('.stream_game').value

			if(app_path.length > 0 && (str_title.length > 0 || str_game.length > 0)) {
				applicationsSettings.push({path: app_path, title: str_title, game: str_game})
			}
		}

		this.lastactiveknown = -1
		this.settings = applicationsSettings
		this.tool.settings.setJSON('streamtitlechanger', this.settings)
		this.contentElement.querySelector('applicationlist')._tag.reloadsettings()
	}

	open() {
		this.contentElement.style.display = 'block'
	}

	close() {
		this.contentElement.style.display = 'none'
	}

}
module.exports = StreamTitleChanger