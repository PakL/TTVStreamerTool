"use strict"

const fs = require("fs")

class Addons {

	constructor(tool) {
		this.tool = tool

		this.addons = []

		let curdir = fs.realpathSync('.')
		let addonsDir = []
		try {
			fs.accessSync('addons')
			let addonsDird = fs.readdirSync('addons')

			for(let i = 0; i < addonsDird.length; i++)
				addonsDir.push('addons/' + addonsDird[i])
		} catch(e) {}
		try {
			fs.accessSync('resources')
			let resourcesDir = fs.readdirSync('resources')

			for(let i = 0; i < resourcesDir.length; i++)
				addonsDir.push('resources/' + resourcesDir[i])
		} catch(e) {}

		console.log('Checking addons: ' + addonsDir.join(', '))
		for(let i = 0; i < addonsDir.length; i++) {
			try {
				fs.accessSync(`${addonsDir[i]}/package.json`)
				fs.accessSync(`${addonsDir[i]}/addon.js`)

				let pack = fs.readFileSync(`${addonsDir[i]}/package.json`, { encoding: 'utf8' })
				let infos = JSON.parse(pack)
				if(infos.hasOwnProperty('systems')) {
					if(infos.systems.indexOf(process.platform) >= 0) {
						try {
							let addon = require(`${curdir}/${addonsDir[i]}/addon`)

							this.addons.push(new addon(this.tool, `${curdir}/${addonsDir[i]}`))
							console.log('Addon ' + addonsDir[i] + ' is being loaded')
						} catch(e) {
							console.log('Error loading addon ' + addonsDir[i])
							console.error(e)
						}

					} else {
						console.log('Addon ' + addonsDir[i] + ' is not compatible with the current platform')
					}
				} else {
					console.log('Addon ' + addonsDir[i] + ' has no platform informations')
				}

			} catch(e) {
				console.error(e)
			}
		}
	}

}
module.exports = Addons