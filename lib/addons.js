"use strict"

const fs = require("fs")
const UIPage = require('../mod/uipage')
const requireUncached = require('../node_modules/require-uncached')

class Addons {

	constructor(tool) {
		this.tool = tool

		this.addons = []
		this.addonnames = []

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
		
		let infos = {}
		let lang = null
		for(let i = 0; i < addonsDir.length; i++) {
			infos = {}
			lang = null
			try {
				fs.accessSync(`${addonsDir[i]}/package.json`)
				fs.accessSync(`${addonsDir[i]}/addon.js`)

				let pack = fs.readFileSync(`${addonsDir[i]}/package.json`, { encoding: 'utf8' })
				infos = JSON.parse(pack)
			} catch(e) {}
			try {
				fs.accessSync(`${addonsDir[i]}/language.json`)
				lang = requireUncached('../node_modules/i18n-nodejs')(this.tool.settings.language, `${curdir}/${addonsDir[i]}/language.json`)
			} catch(e) {}

			if(infos.hasOwnProperty('name') && infos.hasOwnProperty('systems')) {
				if(infos.systems.indexOf(process.platform) >= 0) {
					try {
						let addon = require(`${curdir}/${addonsDir[i]}/addon`)

						this.addons.push(new addon(this.tool, lang))
						console.log('Addon ' + addonsDir[i] + ' is being loaded')
						this.addonnames.push(infos.name)
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
		}

		const self = this
		this.tool.on('load', () => {
			for(let i = 0; i < self.addons.length; i++) {
				if(self.addons[i] instanceof UIPage) {
					self.tool.ui.addPage(self.addons[i])
				}
			}
		})
	}


	addonInstalled(name) {
		if(this.addonnames.indexOf(name) >= 0) {
			return true
		}
		return false
	}

	getAddon(name) {
		let i = this.addonnames.indexOf(name)
		if(i >= 0) {
			return this.addons[i]
		}
		return null
	}

}
module.exports = Addons