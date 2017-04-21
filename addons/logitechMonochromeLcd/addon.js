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
const bmfont = require(scriptpath + '/node_modules/load-bmfont')
const tga = require(scriptpath + '/tga')

class LcdHelper extends EventEmitter {

	constructor(bmfont) {
		super()

		this.bmfont_config = bmfont
		this.bmfont = {}

		let bmfontpages = []
		for(let i = 0; i < this.bmfont_config.pages.length; i++) {
			let img = new tga(scriptpath +'/' + this.bmfont_config.pages[i])
			bmfontpages.push({ width: img.width, height: img.height, pixels: img.getPixel(0, 0, img.width, img.height) })
		}
		for(let i = 0; i < this.bmfont_config.chars.length; i++) {
			let char = this.bmfont_config.chars[i]
			let _x = Math.floor((5-char.width)/2)
			if(_x > 0) char.xoffset = char.xoffset + _x

			let charpixel = []
			for(let y = char.y; y < char.y+char.height; y++) {
				for(let x = char.x; x < char.x+char.width; x++) {
					charpixel.push(bmfontpages[char.page].pixels[(y * bmfontpages[char.page].width + x)][0])
				}
			}
			char.pixels = charpixel
			this.bmfont[char.id.toString()] = char
		}

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

	plot(page, x, y, on) {
		if(x >= LogitechLcd.LOGI_LCD_MONO_WIDTH || y >= LogitechLcd.LOGI_LCD_MONO_HEIGHT) {
			return
		}
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
		for(let i = 0; i < text.length; i++) {
			let charCode = text.charCodeAt(i)
			if(this.bmfont.hasOwnProperty(charCode)) {
				let char = this.bmfont[charCode]
				for(let yp = 0; yp < char.height; yp++) {
					for(let xp = 0; xp < char.width; xp++) {
						let p = char.pixels[yp * char.width + xp]
						this.plot(page, i*6 + xp + char.xoffset, line*9-3 + yp + char.yoffset, (p > 128 ? true : false))
					}
				}
			}
		}
	}

	changePage(newPage) {
		if(newPage != this.page) {
			this.page = newPage
			this.background = this.backgrounds[this.page]
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
bmfont(scriptpath + '/5squared.fnt', (err, font) => {
	if(err != null) console.error(err)

	regHKLM.get('InstallDir', (err, item) => {
		if(err == null) {
			LogitechLcd.load(item.value + '\\SDK\\LCD\\x64\\LogitechLcd')

			lcd = new LcdHelper(font)

			window.onbeforeunload = (e) => {
				lcd.shutdown()
			}

			lcd.on('update', lcd_viewerplotter)
		} else {
			console.error(err)
		}
	})
})

let lcd_splash = false
const lcd_viewerplotter = function() {
	if(openChannelId.length > 0) {
		if(channelViewersplotter.hasOwnProperty('_tag')) {
			lcd.clearBackground(lcd.PAGE_0)
			let data = channelViewersplotter._tag.data.slice((channelViewersplotter._tag.data.length > 80 ? channelViewersplotter._tag.data.length-80 : 0), channelViewersplotter._tag.data.length)
			let c = 0
			let v = -1
			for(let i = data.length-80; i < data.length; i++) {
				if(i >= 0) {
					var ytop = 31 - Math.floor(31 / 100 * data[i].height)
					lcd.drawRect(lcd.PAGE_0, c, ytop, c+1, 31)
					//if(v < 0) {
						v = data[i].viewers
					//}
				}
				c += 2
			}
			lcd.write(lcd.PAGE_0, 4, i18n.__('{{viewernum}} {{viewers||viewernum}}', { viewernum: v }))
		}
	} else if(!lcd_splash) {
		lcd.clearBackground(lcd.PAGE_0)
		lcd.write(lcd.PAGE_0, 1, '     TTVStreamer Tool    ')
		lcd.write(lcd.PAGE_0, 2, '2   Logitech-LCD Addon   ')
		lcd.write(lcd.PAGE_0, 3, '1     by Pascal Pohl     ')

		lcd.drawRect(lcd.PAGE_0, 22, 8, 132, 34)
		lcd_splash = true
	}
}