"use strict"

const {remote} = require('electron')
const {Menu, MenuItem} = remote

const TTVTool = require('./tool')
const UIPage = require('./uipage')

const Cockpit = require('../lib/cockpit')
const Overlays = require('../lib/overlay')

class ToolUI {

	/**
	 * @param {TTVTool} tool
	 */
	constructor(tool) {
		const self = this

		this._tool = tool
		this.pageBefore = ''
		this.currentPage = ''
		this.pages = []
		this.loadingElement = null

		this.menuTemplate = [
			{
				label: this._tool.i18n.__('File'),
				submenu: [
					{ label: this._tool.i18n.__('Restart'), role: 'reload' },
					{ label: this._tool.i18n.__('DevTools'), role: 'toggledevtools' },
					{ type: 'separator' },
					{ label: this._tool.i18n.__('Quit'), role: 'quit' }
				]
			},
			{
				label: this._tool.i18n.__('View'),
				id: 'menu_view',
				submenu: []
			}
		]

		Menu.setApplicationMenu(Menu.buildFromTemplate(this.menuTemplate))

		this.addMenu(this._tool.auth.menu)
		this.addMenu(this._tool.settings.menu)

		this.addPage(new Cockpit(this))
		this.addPage(new Overlays(this))
		this._tool.on('load', () => {
			this.openPage(self.pages[0].name)
		})
		
	}

	get tool() {
		return this._tool
	}

	get i18n() {
		return this._tool.i18n
	}

	/**
	 * 
	 * @param {string} name 
	 */
	findPage(name) {
		for(let i = 0; i < this.pages.length; i++) {
			if(this.pages[i].name == name) {
				return this.pages[i]
			}
		}
		return null
	}

	/**
	 * 
	 * @param {UIPage} page 
	 */
	addPage(page) {
		const self = this
		if(page instanceof UIPage && page.name.length > 0) {
			let lookitup = this.findPage(page.name)
			if(lookitup == null) {
				this.pages.push(page)
				let menu = this.getMenuItemById('menu_view')
				menu.submenu.append(new MenuItem({
					label: page.localizedName,
					type: 'radio',
					checked: false,
					click: (mi, bw, e) => { self.openPage(page.name) }
				}))
			}
		}
	}

	/**
	 * 
	 * @param {string} name 
	 */
	openPage(name) {
		let page = this.findPage(name)
		if(page != null) {
			let pageCurrentObject = this.findPage(this.currentPage)
			if(pageCurrentObject != null) {
				pageCurrentObject.close()
			}
			this.pageBefore = this.currentPage
			page.open()
			this.currentPage = page.name
		}
	}

	/**
	 * 
	 * @param {MenuItem} menu 
	 */
	addMenu(menuitem) {
		Menu.getApplicationMenu().append(menuitem)
		Menu.setApplicationMenu(Menu.getApplicationMenu())
	}

	/**
	 * 
	 * @param {string} menuitemid 
	 * @param {Menu} menu 
	 */
	getMenuItemById(menuitemid, menu) {
		if(typeof(menu) == "undefined")
			menu = Menu.getApplicationMenu()
		var items = menu.items
		for(var i = 0; i < items.length; i++) {
			var submenu = items[i].submenu
			if(submenu != null) {
				var it = this.getMenuItemById(menuitemid, submenu)
				if(it != null)
					return it
			}
			if(items[i].hasOwnProperty('id') && items[i].id == menuitemid) {
				return items[i]
			}
		}
		return null
	}

		
	startLoading() {
		if(this.loadingElement != null) return

		this.loadingElement = document.createElement('modal')
		this.loadingElement.innerHTML = '<img src="res/hourglass.gif" alt="" />'

		document.getElementsByTagName('body')[0].appendChild(this.loadingElement)
		riot.mount(this.loadingElement)
	}

	stopLoading() {
		if(this.loadingElement == null) return
		this.loadingElement.parentElement.removeChild(this.loadingElement)
		this.loadingElement = null
	}

	showErrorMessage(error, autohide) {
		if(typeof(autohide) != "boolean") autohide = false

		this.stopLoading() // Stop loading
		if(error == null || !error.hasOwnProperty('message')) error = new Error(this._tool.i18n.__('Unkown error'))
		if(!autohide) console.error(error)
		const modal = document.createElement('modal')
		modal.innerHTML = error.message.replace('<', '&gt;').replace('>', '&lt;').replace('\n', '<br>')
		modal.onclick = function() {
			this.parentElement.removeChild(this)
		}
		modal.style.cursor = 'pointer'

		document.getElementsByTagName('body')[0].appendChild(modal)
		riot.mount(modal)

		if(autohide) {
			setTimeout(() => {
				try {
					modal.parentElement.removeChild(modal)
				} catch(e) {
					// Probably already removed
				}
			}, 5000)
		}
		return modal;
	}

}

module.exports = ToolUI