"use strict"

const winreg = require('winreg')
const LogitechLcd = require('./logitechlcd')
const bmfont = require('load-bmfont')
const LcdHelper = require('./lcdhelper')

class LogitechMonochromeLcd {

	constructor(tool) {
		this.tool = tool
		this.addonpath = __dirname

		const self = this

		this.lcd = null
		this.regHKLM = new winreg({ hive: winreg.HKLM, key: '\\SOFTWARE\\Logitech\\Logitech Gaming Software' })
		bmfont(this.addonpath + '/5squared.fnt', (err, font) => {
			if(err != null) console.error(err)

			self.regHKLM.get('InstallDir', (err, item) => {
				if(err == null) {
					LogitechLcd.load(item.value + '\\SDK\\LCD\\x64\\LogitechLcd')

					self.lcd = new LcdHelper(self, font)

					self.tool.on('exit', () => {
						self.lcd.shutdown()
					})

					self.lcd.on('update', () => { self.lcd_viewerplotter() })
				} else {
					console.error(err)
				}
			})
		})
	
		this.lcd_splash = false
	}
	
	lcd_viewerplotter() {
		if(this.tool.cockpit.openChannelId.length > 0) {
			if(this.tool.cockpit.channelViewersplotter.hasOwnProperty('_tag')) {
				this.lcd.clearBackground(this.lcd.PAGE_0)
				let data = this.tool.cockpit.channelViewersplotter._tag.data.slice((this.tool.cockpit.channelViewersplotter._tag.data.length > 80 ? this.tool.cockpit.channelViewersplotter._tag.data.length-80 : 0), this.tool.cockpit.channelViewersplotter._tag.data.length)
				let c = 0
				let v = -1
				for(let i = data.length-80; i < data.length; i++) {
					if(i >= 0) {
						var ytop = 31 - Math.floor(31 / 100 * data[i].height)
						this.lcd.drawRect(this.lcd.PAGE_0, c, ytop, c+1, 31)
						//if(v < 0) {
							v = data[i].viewers
						//}
					}
					c += 2
				}
				this.lcd.write(this.lcd.PAGE_0, 4, this.tool.i18n.__('{{viewernum}} {{viewers||viewernum}}', { viewernum: v }))
			}
		} else if(!this.lcd_splash) {
			this.lcd.clearBackground(this.lcd.PAGE_0)
			this.lcd.write(this.lcd.PAGE_0, 1, '     TTVStreamer Tool    ')
			this.lcd.write(this.lcd.PAGE_0, 2, '    Logitech-LCD Addon   ')
			this.lcd.write(this.lcd.PAGE_0, 3, '      by Pascal Pohl     ')

			this.lcd.drawRect(this.lcd.PAGE_0, 22, 8, 132, 34)
			this.lcd_splash = true
		}
	}

}

module.exports = LogitechMonochromeLcd
