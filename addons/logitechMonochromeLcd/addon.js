if(typeof(path) == "undefined") {
	path = require('path')
}
if(typeof(EventEmitter) == "undefined") {
	EventEmitter = require('events')
}

var scripts = document.getElementsByTagName('script');
var index = scripts.length - 1;
var thisscript = scripts[index].src.substr(8);
var scriptpath = path.dirname(thisscript)

const winreg = require(scriptpath + '/node_modules/winreg')
const LogitechLcd = require(scriptpath + '/logitechlcd')


class LcdHelper extends EventEmitter {

	constructor() {
		super()
		this.PAGE_0 = 0
		this.PAGE_1 = 1
		this.PAGE_2 = 2
		this.PAGE_3 = 3

		this.width = LogitechLcd.LOGI_LCD_MONO_WIDTH
		this.height = LogitechLcd.LOGI_LCD_MONO_HEIGHT

		this.page = 0

		this.backgrounds = [
			new LogitechLcd.PIXEL_ARRAY(this.width * this.height),
			new LogitechLcd.PIXEL_ARRAY(this.width * this.height),
			new LogitechLcd.PIXEL_ARRAY(this.width * this.height),
			new LogitechLcd.PIXEL_ARRAY(this.width * this.height)
		]
		this.texts = [
			['', '', '', ''],
			['', '', '', ''],
			['', '', '', ''],
			['', '', '', '']
		]
		this.background = this.backgrounds[this.page]

		console.log('[LCD] LogiLcdInit')
		if(LogitechLcd.l.LogiLcdInit('TTVStreamerTool', LogitechLcd.LOGI_LCD_TYPE_MONO)) {
			this.clearBackground(0); this.clearBackground(1); this.clearBackground(2); this.clearBackground(3);
			this.timer()
		} else {
			console.log('[LCD] LcdInit failed');
		}
	}

	clearBackground(page) {
		for(var y = 0; y < this.height; y++) {
			for(var x = 0; x < this.width; x++) {
				this.plot(page, x, y, false)
			}
		}
	}
	clearText(page) {
		this.write(page, 0, '')
		this.write(page, 1, '')
		this.write(page, 2, '')
		this.write(page, 3, '')
	}

	plot(page, x, y, on) {
		this.backgrounds[page][x + (y * this.width)] = (on ? 255 : 0)
	}


	drawLine(page, xs, ys, xd, yd) {
		let steep = Math.abs(yd - ys) > Math.abs(xd - xs)

		let x1 = xs
		let y1 = ys
		let x2 = xd
		let y2 = yd
		if(xs > xd && !steep) {
			x1 = xd
			x2 = xs
			y1 = yd
			y2 = ys
		} else if(ys > yd && steep) {
			x1 = xd
			x2 = xs
			y1 = yd
			y2 = ys
		}


		let deltax = x2 - x1
		let deltay = y2 - y1
		let deltaerr = (steep ? Math.abs(deltax / deltay) : Math.abs(deltay / deltax))

		let error = deltaerr - 0.5
		if(steep) {
			let x = x1
			for(let y = y1; y <= y2; y++) {
				this.plot(page, x, y, true)
				error = error + deltaerr
				if(error >= 0.5) {
					x = x+1
					error = error - 1
				}
			}
		} else {
			let y = y1
			for(let x = x1; x <= x2; x++) {
				this.plot(page, x, y, true)
				error = error + deltaerr
				if(error >= 0.5) {
					y = y+1
					error = error - 1
				}
			}
		}
	}
	drawRect(page, x1, y1, x2, y2) {
		let xa = (x1 > x2 ? x2 : x1)
		let xb = (x1 > x2 ? x1 : x2)
		let ya = (y1 > y2 ? y2 : y1)
		let yb = (y1 > y2 ? y1 : y2)

		this.drawLine(page, xa, ya, xb, ya)
		this.drawLine(page, xb, ya, xb, yb)
		this.drawLine(page, xb, yb, xa, yb)
		this.drawLine(page, xa, yb, xa, ya)
	}

	write(page, line, text) {
		this.texts[page][line] = text
		if(this.page == page) {
			LogitechLcd.l.LogiLcdMonoSetText(line, text)
		}
	}

	changePage(newPage) {
		if(newPage != this.page) {
			this.page = newPage
			this.background = this.backgrounds[this.page]
			LogitechLcd.l.LogiLcdMonoSetText(0, this.texts[this.page][0])
			LogitechLcd.l.LogiLcdMonoSetText(1, this.texts[this.page][1])
			LogitechLcd.l.LogiLcdMonoSetText(2, this.texts[this.page][2])
			LogitechLcd.l.LogiLcdMonoSetText(3, this.texts[this.page][3])
		}
	}

	update() {
		this.emit('update')

		if(LogitechLcd.l.LogiLcdIsButtonPressed(LogitechLcd.LOGI_LCD_MONO_BUTTON_0)) this.changePage(0)
		if(LogitechLcd.l.LogiLcdIsButtonPressed(LogitechLcd.LOGI_LCD_MONO_BUTTON_1)) this.changePage(1)
		if(LogitechLcd.l.LogiLcdIsButtonPressed(LogitechLcd.LOGI_LCD_MONO_BUTTON_2)) this.changePage(2)
		if(LogitechLcd.l.LogiLcdIsButtonPressed(LogitechLcd.LOGI_LCD_MONO_BUTTON_3)) this.changePage(3)

		LogitechLcd.l.LogiLcdMonoSetBackground(this.background)
		LogitechLcd.l.LogiLcdUpdate()
	}

	timer() {
		const self = this
		this.update()
		this.timeout = setTimeout(() => { self.timer() }, (100 - (new Date().getTime() % 100)))
	}

	shutdown() {
		console.log('[LCD] LogiLcdShutdown')
		LogitechLcd.l.LogiLcdShutdown()
	}

}

let lcd = null
let regHKLM = new winreg({ hive: winreg.HKLM, key: '\\SOFTWARE\\Logitech\\Logitech Gaming Software' })
regHKLM.get('InstallDir', (err, item) => {
	if(err == null) {
		LogitechLcd.load(item.value + '\\SDK\\LCD\\x64\\LogitechLcd')

		lcd = new LcdHelper()

		window.onbeforeunload = (e) => {
			lcd.shutdown()
		}

		lcd.on('update', lcd_viewerplotter)
	} else {
		console.error(err)
	}
})

let lcd_splash = false
const lcd_viewerplotter = function() {
	if(openChannelId.length > 0) {
		lcd.write(lcd.PAGE_0, 0, '')
		lcd.write(lcd.PAGE_0, 1, '')
		lcd.write(lcd.PAGE_0, 2, '')
		if(channelViewersplotter.hasOwnProperty('_tag')) {
			lcd.clearBackground(lcd.PAGE_0)
			let data = channelViewersplotter._tag.data.slice(0, 80)
			let c = 0
			let v = -1
			for(let i = data.length-80; i < data.length; i++) {
				if(i >= 0) {
					var ytop = 28 - Math.floor(28 / 100 * data[i].height)
					lcd.drawRect(lcd.PAGE_0, c, ytop, c+1, 28)
					//if(v < 0) {
						v = data[i].viewers
					//}
				}
				c += 2
			}
			lcd.write(lcd.PAGE_0, 3, i18n.__('{{viewernum}} {{viewers||viewernum}}', { viewernum: v }))
		}
	} else if(!lcd_splash) {
		lcd.write(lcd.PAGE_0, 0, '')
		lcd.write(lcd.PAGE_0, 1, '     TTV Streamer Tool     ')
		lcd.write(lcd.PAGE_0, 2, '  Logitech-Mono-LCD Addon  ')
		lcd.write(lcd.PAGE_0, 3, '')

		lcd.clearBackground(lcd.PAGE_0)
		lcd.drawRect(lcd.PAGE_0, 9, 8, 150, 30)
	}
}