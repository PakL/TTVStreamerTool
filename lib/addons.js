"use strict"

const {shell, remote} = require('electron')
const {app} = remote.require('electron')
const {spawn, spawnSync, execSync} = require('child_process');
const fs = require("fs")
const Path = require('path')
const https = require("../node_modules/follow-redirects").https
const UIPage = require('../mod/uipage')
const i18n_module = require('i18n-nodejs')
const compVer = require('compare-versions')

/**
 * This module finds addons, loads and initialze them
 * 
 * @param {TTVTool} tool
 * @class Addons
 */
class Addons extends UIPage {

	constructor(tool) {
		super('Addons');

		this.tool = tool

		this.addons = []
		this.addonnames = []
		this.package_infos = {}
		this.available_addons = []
		this.possibleAddon = ''
		this.addonsFolder = Path.resolve(process.cwd(), './addons')

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

			this.addonsFolder = Path.resolve(process.cwd(), './resources')
			for(let i = 0; i < resourcesDir.length; i++)
				addonsDir.push('resources/' + resourcesDir[i])
		} catch(e) {}

		console.log('Checking addons: ' + addonsDir.join(', '))
		
		let infos = {}
		let lang = null
		this.incompatibleAddonsFound = false
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
				lang = new i18n_module(this.tool.settings.language, `${curdir}/${addonsDir[i]}/language.json`)
			} catch(e) {}

			if(infos.hasOwnProperty('name') && infos.hasOwnProperty('systems')) {
				if(infos.systems.indexOf(process.platform) >= 0) {
					let toolversionNeeded = '0.3.5'
					if(infos.hasOwnProperty('toolversion')) {
						toolversionNeeded = infos.toolversion
					}

					if(compVer(toolversionNeeded, app.getVersion()) >= 0) {
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
						console.log('Addon ' + addonsDir[i] + ' is not compatible with the current version')
						this.incompatibleAddonsFound = true

						this.addonnames.push(infos.name)
						infos.file = `${curdir}/${addonsDir[i]}`
						infos.description = this.tool.i18n.__('Incompatible version "{{version}}". Current TTVST version: {{packageversion}}', {'version': toolversionNeeded, 'packageversion': app.getVersion()})
						this.package_infos[infos.name] = infos
					}
				} else {
					console.log('Addon ' + addonsDir[i] + ' is not compatible with the current platform')
					this.incompatibleAddonsFound = true

					this.addonnames.push(infos.name)
					infos.file = `${curdir}/${addonsDir[i]}`
					infos.description = this.tool.i18n.__('Incompatible platforms "{{platform}}"', {'platform': JSON.stringify(infos.systems)})
					this.package_infos[infos.name] = infos
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

			self.tool.ui.addPage(self)
			document.querySelector('#nav-addons').onclick = () => { self.tool.ui.openPage(self.name) }

			if(self.incompatibleAddonsFound) {
				self.tool.ui.showErrorMessage(new Error(self.tool.i18n.__('Some addons were found to be incompatible with the current version of TTVStreamerTool.\nPlease check if there\'s an update available for your addons.')))
			}
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
	 * Returns the description of the installed addon
	 * 
	 * @param {String} name Name of the addon
	 * @returns {String} Description of the addon or 'No description' if not installed or not defined
	 */
	getInstalledAddonDescription(name) {
		if(typeof(this.package_infos[name]) == "undefined" || typeof(this.package_infos[name].description) == "undefined") {
			return "No description"
		}
		return this.package_infos[name].description
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

	generateTable() {
		const self = this
		
		let tableBody = document.querySelector('#content_addons table > tbody')
		tableBody.innerHTML = ''

		let prepRow = () => {
			let tableRow = document.createElement('tr')
			let nameColumn = document.createElement('td')
			let descriptionColumn = document.createElement('td')
			let versionColumn = document.createElement('td')
			let installedColumn = document.createElement('td')
			let installedButton = document.createElement('button')
			installedColumn.style.textAlign = 'right'
			tableRow.appendChild(nameColumn)
			tableRow.appendChild(descriptionColumn)
			tableRow.appendChild(versionColumn)
			tableRow.appendChild(installedColumn)
			tableBody.appendChild(tableRow)

			return [nameColumn, descriptionColumn, versionColumn, installedColumn, installedButton]
		}

		let m = []
		let update = false
		let onlineAddons = []
		for(let i = 0; i < this.available_addons.length; i++) {
			let a = this.available_addons[i]

			let nameColumn, descriptionColumn, versionColumn, installedColumn, installedButton
			[nameColumn, descriptionColumn, versionColumn, installedColumn, installedButton] = prepRow()

			onlineAddons.push(a.name)
			nameColumn.innerText = a.name
			descriptionColumn.innerText = (self.getInstalledAddonDescription(a.name) == 'No description' ? a.description : self.getInstalledAddonDescription(a.name))
			versionColumn.innerText = 'v' + a.version

			if(this.addonInstalled(a.name)) {
				let installedVersion = self.getInstalledAddonVersion(a.name)
				installedButton.innerText = 'v' + installedVersion +' (' + self.tool.i18n.__('Remove') + ')'
				if(installedVersion != a.version) {
					update = true
					self.possibleAddon = a.name
				}
				installedButton.onclick = () => { self.addonclick(a.name) }
			} else {
				installedButton.innerText = self.tool.i18n.__('Install now')
				installedButton.onclick = () => { self.addonclick(a.name) }
			}
			installedColumn.appendChild(installedButton)
		}

		for(let i = 0; i < this.addonnames.length; i++) {
			let an = this.addonnames[i]
			if(onlineAddons.indexOf(an) >= 0) continue;

			let nameColumn, descriptionColumn, versionColumn, installedColumn, installedButton
			[nameColumn, descriptionColumn, versionColumn, installedColumn, installedButton] = prepRow()

			nameColumn.innerText = an
			descriptionColumn.innerText = self.getInstalledAddonDescription(an)
			versionColumn.innerText = 'v' + self.getInstalledAddonVersion(an)
			installedColumn.innerText = self.tool.i18n.__('Manually')
		}

		let tfoot = document.createElement('tfoot')
		let footRow = document.createElement('tr')
		let footColumn = document.createElement('td')
		footColumn.setAttribute('colspan', '4')
		
		let folderButton = document.createElement('button')
		folderButton.innerText = self.tool.i18n.__('Open addons folder')
		folderButton.onclick = () => { shell.openItem(self.addonsFolder) }
		footColumn.appendChild(folderButton)
		
		if(update) {
			let updateButton = document.createElement('button')
			updateButton.innerText = self.tool.i18n.__('Update available. Update now!')
			updateButton.onclick = () => { self.updateclick() }
			footColumn.appendChild(updateButton)

			let addonUpdateIndicator =  document.querySelector('#nav-addons > span.update')
			if(addonUpdateIndicator == null) {
				addonUpdateIndicator = document.createElement('span')
				addonUpdateIndicator.classList.add('update')
				document.querySelector('#nav-addons').appendChild(addonUpdateIndicator)
			}
		}

		footRow.appendChild(footColumn)
		tfoot.appendChild(footRow)

		tableBody.parentNode.appendChild(tfoot)
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
				let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Uninstalling {{addon}} now... Program will restart.', {addon: addonname})), false, false)
				modal.onclick = () => {}
				setTimeout(() => {
					fs.writeFileSync('deleteAddon.bat', '@echo off\r\ncls\r\necho +++ TTVStreamerTool Addon Uninstall +++\r\necho Please DO NOT close this window...\r\nping 127.0.0.1 -n 5\r\ndel "' + this.package_infos[addonname].file.replace(/\//g, '\\') + '"\r\nstart "" "' + process.execPath + '"')
					spawn('cmd', ['/C', 'deleteAddon.bat'], {cwd: process.cwd(), env: process.env, detached: true})
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
				let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Downloading and installing {{addon}} now... Program will restart.', {addon: addonname})), false, false)
				modal.onclick = () => {}

				https.get(downloadurl, (resp) => {
					if(resp.statusCode == 200) {
						fs.writeFileSync('resources/' + addonname + '.part', Buffer.alloc(0))
						resp.on('data', (chunk) => { fs.appendFileSync('resources/' + addonname + '.part', chunk) })
						resp.on('end', () => {
							fs.renameSync('resources/' + addonname + '.part', 'resources/' + addonname + '.asar')
							app.relaunch()
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
			let modal = this.tool.ui.showErrorMessage(new Error(this.tool.i18n.__('Downloading and updating {{addon}} now... Program will restart.', {addon: addonname})), false, false)
			modal.onclick = () => {}

			https.get(downloadurl, (resp) => {
				if(resp.statusCode == 200) {
					fs.writeFileSync('resources/' + addonname + '.part', Buffer.alloc(0))
					resp.on('data', (chunk) => { fs.appendFileSync('resources/' + addonname + '.part', chunk) })
					resp.on('end', () => {
						/*let exPa = process.execPath
						if(exPa.startsWith('\\')) exPa = exPa.substr(1)
						if(exPa.indexOf(' ') > 0) exPa = '"' + exPa + '"'
						spawn('cmd', ['/Q', '/C', 'del "' + self.package_infos[addonname].file.replace(/\//g, '\\') + '" & copy resources\\' + addonname + '.part resources\\' + addonname + '.asar & del resources\\' + addonname + '.part &  start ' + exPa], {'detached': true})*/

						fs.writeFileSync('updateAddon.bat', '@echo off\r\ncls\r\necho +++ TTVStreamerTool Addon Uninstall +++\r\necho Please DO NOT close this window...\r\nping 127.0.0.1 -n 5\r\ndel "' + this.package_infos[addonname].file.replace(/\//g, '\\') + '"\r\ncopy resources\\' + addonname + '.part resources\\' + addonname + '.asar\r\ndel resources\\' + addonname + '.part\r\nstart "" "' + process.execPath + '"')
						spawn('cmd', ['/C', 'updateAddon.bat'], {cwd: process.cwd(), env: process.env, detached: true})
						app.quit()
						
						/*try {
							spawn('cmd', ['/Q', '/C', 'del "' + self.package_infos[addonname].file.replace(/\//g, '\\') + '"'])
						} catch(e) {}
						fs.renameSync('resources/' + addonname + '.part', 'resources/' + addonname +'.asar')
						app.relaunch()
						app.quit()*/
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
		let tableBody = document.querySelector('#content_addons table > tbody')
		tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${self.tool.i18n.__('Loading, please wait...')}</td></tr>`
		https.get('https://vs.paklweb.de/ttvst/addons.php', (res) => {
			if(res.statusCode == 200) {
				res.setEncoding('utf8')
				let addons_json = ''
				res.on('data', (chunk) => { addons_json += chunk })
				res.on('end', () => {
					try {
						let addons = JSON.parse(addons_json)
						self.available_addons = addons
						//self.tool.ui.addMenu(self.menu)
						self.generateTable()
					} catch(e) {
						tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${self.tool.i18n.__('Could not load addon information.')}</td></tr>`
						console.error(e)
					}
				})
			} else {
				tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${self.tool.i18n.__('Could not load addon information.')}</td></tr>`
			}
		}).on('error', () => {
			tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${self.tool.i18n.__('Could not load addon information.')}</td></tr>`
		})
	}

	/**
	 * Takes a message and searches for addons which have a findAndReplaceInMessage function.
	 * Those addons are then able to parse the message and replace some parts (e.g. emotes)
	 * 
	 * @param {string} message 
	 * @returns {Array}
	 */
	findAndReplaceInMessage(message)
	{
		let replacings = []
		for(let i = 0; i < this.addons.length; i++) {
			if(typeof(this.addons[i].findAndReplaceInMessage) === 'function') {
				let rep = this.addons[i].findAndReplaceInMessage(message)
				if(Array.isArray(rep)) {
					replacings = replacings.concat(rep)
				}
			}
		}
		return replacings
	}

	get localizedName() {
		return this._name
	}
	get showInViewsList() {
		return false
	}
	open() {
		document.querySelector('#content_addons').style.display = 'block';
	}
	close() {
		document.querySelector('#content_addons').style.display = 'none';
	}

}
module.exports = Addons