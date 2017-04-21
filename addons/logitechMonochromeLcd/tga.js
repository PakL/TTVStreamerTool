const fs = require('fs')


class tga {
	constructor(filename) {
		this.image = fs.readFileSync(filename)
		this.image_id_length = 0
		this.pallet_type = 0
		this.image_type = 0
		this.pallet_start = 0
		this.pallet_length = 0
		this.pallet_size = 0
		this.x_null = 0
		this.y_null = 0
		let image_width = 0
		let image_height = 0
		let bpp = 0
		let image_attribute = 0
	}

	get imageIdLength() { return this.image.readUInt8(0) }
	get palletType() { return this.image.readUInt8(1) }
	get imageType() { return this.image.readUInt8(2) }
	get palletStart() { return this.image.readInt16LE(3) }
	get palletLength() { return this.image.readInt16LE(5) }
	get palletEntrySize() { return this.image.readUInt8(7) }
	get nullX() { return this.image.readInt16LE(8) }
	get nullY() { return this.image.readInt16LE(10) }
	get width() { return this.image.readInt16LE(12) }
	get height() { return this.image.readInt16LE(14) }
	get bipp() { return this.image.readUInt8(16) }
	get imageAttribute() { return this.image.readInt8(17) }

	get imageId() {
		return this.image.toString('utf8', 18, 18 + this.imageIdLength)
	}
	get pallet() {
		return this.image.slice(this.palletStart, this.palletStart + this.palletLength)
	}
	get imageData() {
		if(this.bipp == 1 || this.bipp == 15) throw new Error('BiPP of 1 or 15 is not supported')
		let bypp = this.bipp / 8
		let start = 18 + this.imageIdLength + this.palletLength
		return this.image.slice(start, start + (this.width * this.height * bypp))
	}

	getPixel(x, y, width, height) {
		let pixels = []
		let data = this.imageData
		let bypp = this.bipp / 8

		for(let yi = y; yi < y+height; yi++) {
			for(let xi = x; xi < x+width; xi++) {
				let p = []
				if(bypp > 0) {
					p.push(data.readUInt8((yi * this.width + xi) * bypp))
				} else if(bypp > 1) {
					p.push(data.readUInt8((yi * this.width + xi) * bypp + 1))
				} else if(bypp > 2) {
					p.push(data.readUInt8((yi * this.width + xi) * bypp + 2))
				} else if(bypp > 3) {
					p.push(data.readUInt8((yi * this.width + xi) * bypp + 3))
				}

				pixels.push(p)
			}
		}

		return pixels
	}

}

exports = module.exports = tga