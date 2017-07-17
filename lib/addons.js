"use strict"

const {remote} = require('electron')
const {app} = remote.require('electron')
const exec = require('child_process').exec;
const fs = require("fs")
const https = require("../node_modules/follow-redirects").https
const UIPage = require('../mod/uipage')
const requireUncached = require('../node_modules/require-uncached')

/**
 * This module finds addons, loads and initialze them
 * 
 * @param {TTVTool} tool
 * @class Addons
 */
class Addons {

	constructor(tool) {
		this.tool = tool

		this.addons = []
		this.addonnames = []
		this.package_infos = {}
		this.available_addons = []
		this.possibleAddon = ''

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
						infos.file = `${curdir}/${addonsDir[i]}`
						this.package_infos[infos.name] = infos
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
			self.loadPackages()
		})
	}

	/**
	 * Checks if an addon is installed
	 * 
	 * @param {String} name Name of the addon
	 * @returns {Boolean}
	 */
	addonInstalled(name) {
		if(this.addonnames.indexOf(name) >= 0) {
			return true
		}
		return false
	}

	/**
	 * Returns the version of the installed addon
	 * 
	 * @param {String} name Name of the addon
	 * @returns {String} Version of the addon or 'Unkown' if not installed or not defined
	 */
	getInstalledAddonVersion(name) {
		if(typeof(this.package_infos[name]) == "undefined" || typeof(this.package_infos[name].version) == "undefined") {
			return "Unkown"
		}
		return this.package_infos[name].version
	}

	/**
	 * Gets the addon by name
	 * 
	 * @param {String} name Name of the addon
	 * @returns {(null|Object)} Either the addon module or null when not found
	 */
	getAddon(name) {
		let i = this.addonnames.indexOf(name)
		if(i >= 0) {
			return this.addons[i]
		}
		return null
	}

	/**
	 * Gives you a new instance of the addons menu
	 * 
	 * @type {MenuItem}
	 * @readonly
	 */
	get menu() {
		const self = this

		let m = []
		let update = false
		for(let i = 0; i < this.available_addons.length; i++) {
			let a = this.available_addons[i]
			let mi = {
				label: a.name + ' (v' + (this.addonInstalled(a.name) ? this.getInstalledAddonVersion(a.name) : a.version)+ ')',
				type: 'checkbox',
				checked: this.addonInstalled(a.name),
				click: () => { self.addonclick(a.name) }
			}
			m.push(mi)

			if(this.addonInstalled(a.name)) {
				if(self.getInstalledAddonVersion(a.name) != a.version) {
					update = true
					self.possibleAddon = a.name
				}
			}
		}
		if(update) {
			m.push({type: 'separator'})
			m.push({label: 'Update available. Update now!', click: () => { self.updateclick() }})
		}

		return new MenuItem({
			label: 'Addons',
			submenu: Menu.buildFromTemplate(m)
		})
	}

	/**
	 * (Un)installs an addon
	 * 
	 * @private
	 * @param {String} addonname Name of the addon
	 */
	addonclick(addonname) {
		if(this.addonInstalled(addonname)) {
			if(this.package_infos[addonname].file.endsWith('.asar')) {
				let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Uninstalling {{addon}} now... Program will restart.', {addon: addonname})))
				modal.onclick = () => {}
				setTimeout(() => {
					exec('cmd /C "ping 127.0.0.1 -n 2 > NUL & del "' + this.package_infos[addonname].file.replace(/\//g, '\\') + '" & "' + process.execPath + '"')
					app.quit()
				}, 5000);
			} else {
				this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Cannot uninstall. For uninstall the addon must be a asar addon.', {addon: addonname})))
			}
		} else {
			let downloadurl = ''
			for(let i = 0; i < this.available_addons.length; i++) {
				let a = this.available_addons[i]
				if(addonname == a.name) {
					downloadurl = a.url
				}
			}
			if(downloadurl.length > 0) {
				let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Downloading and installing {{addon}} now... Program will restart.', {addon: addonname})))
				modal.onclick = () => {}

				https.get(downloadurl, (resp) => {
					if(resp.statusCode == 200) {
						fs.writeFileSync('resources/' + addonname + '.part', Buffer.alloc(0))
						resp.on('data', (chunk) => { fs.appendFileSync('resources/' + addonname + '.part', chunk) })
						resp.on('end', () => {
							fs.renameSync('resources/' + addonname + '.part', 'resources/' + addonname + '.asar')
							exec('cmd /C "ping 127.0.0.1 -n 2 > NUL & "' + process.execPath + '"')
							app.quit()
						})
					} else {
						app.quit()
					}
				})
			} else {
				this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Could not find anything to download.')))
			}
		}
	}

	/**
	 * Updates a addon and restarts
	 * 
	 * @private
	 */
	updateclick() {
		const self = this
		let addonname = this.possibleAddon
		if(addonname.length <= 0) return
		let downloadurl = ''
		for(let i = 0; i < this.available_addons.length; i++) {
			let a = this.available_addons[i]
			if(addonname == a.name) {
				downloadurl = a.url
			}
		}
		if(downloadurl.length > 0) {
			let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Downloading and updating {{addon}} now... Program will restart.', {addon: addonname})))
			modal.onclick = () => {}

			https.get(downloadurl, (resp) => {
				if(resp.statusCode == 200) {
					fs.writeFileSync('resources/' + addonname + '.part', Buffer.alloc(0))
					resp.on('data', (chunk) => { fs.appendFileSync('resources/' + addonname + '.part', chunk) })
					resp.on('end', () => {
						exec('cmd /C "ping 127.0.0.1 -n 2 > NUL & del "' + self.package_infos[addonname].file.replace(/\//g, '\\') + '" & copy resources\\' + addonname + '.part resources\\' + addonname + '.asar & del resources\\' + addonname + '.part & "' + process.execPath + '"')
						app.quit()
					})
				} else {
					app.quit()
				}
			})
		} else {
			this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Could not find anything to download.')))
		}
	}

	/**
	 * Loads all available packages
	 * 
	 * @private
	 */
	loadPackages() {
		const self = this
		https.get('https://vs.paklweb.de/ttvst/addons.php', (res) => {
			if(res.statusCode == 200) {
				res.setEncoding('utf8')
				let addons_json = ''
				res.on('data', (chunk) => { addons_json += chunk })
				res.on('end', () => {
					try {
						let addons = JSON.parse(addons_json)
						self.available_addons = addons
						self.tool.ui.addMenu(self.menu)
					} catch(e) {
						console.error(e)
					}
				})
			}
		})
	}

}
module.exports = Addons