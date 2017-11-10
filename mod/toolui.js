"use strict"

const {remote} = require('electron')
const {Menu, MenuItem, app} = remote

const TTVTool = require('./tool')
const UIPage = require('./uipage')

const Cockpit = require('../lib/cockpit')
const Overlays = require('../lib/overlay')

/**
 * This module helps control and manage the user interface. You can add
 * viewable pages, menus or display error messages.
 * 
 * @class ToolUI
 * @param {TTVTool} tool
 */
class ToolUI {

	constructor(tool) {
		const self = this

		this._tool = tool
		/**
		 * Contains the page name that was open before the current. Has no use anymore.
		 * @member {String}
		 */
		this.pageBefore = ''
		/**
		 * Contains the page name of the current page.
		 * @member {String}
		 */
		this.currentPage = ''
		/**
		 * Contains an array with UIPage elements. Please use addPage() to add pages!
		 * @member {Array<UIPage>}
		 */
		this.pages = []
		/**
		 * When loading this contains the loading HTML element with the animation and stuff.
		 * @member {HTMLElement}
		 */
		this.loadingElement = null

		/**
		 * @private
		 * @member {Array}
		 */
		this.menuTemplate = [
			{
				label: this._tool.i18n.__('File'),
				submenu: [
					{ label: this._tool.i18n.__('Restart'), role: 'reload' },
					{ label: this._tool.i18n.__('DevTools'), role: 'toggledevtools' },
					{ type: 'separator' },
					{ label: 'Version ' + app.getVersion() },
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

	/**
	 * Gives you the main tool module.
	 * 
	 * @private
	 * @readonly
	 * @member {TTVTool}
	 */
	get tool() {
		return this._tool
	}

	/**
	 * Gives you the i18n module.
	 * 
	 * @private
	 * @readonly
	 * @member {i18n-nodejs}
	 */
	get i18n() {
		return this._tool.i18n
	}

	/**
	 * Finds a page by its name.
	 * @param {String} name The name of the page you want
	 * @returns {(null|UIPage)}
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
	 * Adds a page and creates a menu entry.
	 * @param {UIPage} page The page you want to add
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
	 * Opens a page by its name. If no page is found by this name nothing happens.
	 * @param {String} name The name of the page you want to open
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
	 * Adds a new menuitem to the application menu.
	 * @param {MenuItem} menuitem The menu item you want to add
	 */
	addMenu(menuitem) {
		Menu.getApplicationMenu().append(menuitem)
		Menu.setApplicationMenu(Menu.getApplicationMenu())
	}

	/**
	 * Finds and returns a menu item by its id. Optionally you can pass
	 * a menu that should be searched. Submenus are being searched automatically.
	 * @param {String} menuitemid The menu item id you want to get
	 * @param {Menu} [menu] The menu that is being searched. If non is given the application menu is searched.
	 * @returns {(null | MenuItem)} Returns null if no menu item with the id is found
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

	/**
	 * Displays the loading overlay.
	 */
	startLoading() {
		if(this.loadingElement != null) return

		this.loadingElement = document.createElement('modal')
		this.loadingElement.innerHTML = '<img src="res/hourglass.gif" alt="" />'

		document.getElementsByTagName('body')[0].appendChild(this.loadingElement)
		riot.mount(this.loadingElement)
	}

	/**
	 * Removes the loading overlay.
	 */
	stopLoading() {
		if(this.loadingElement == null) return
		this.loadingElement.parentElement.removeChild(this.loadingElement)
		this.loadingElement = null
	}

	/**
	 * Creates and displays a error message as an modal overlay and returns the created element.
	 * 
	 * @param {Error} error The error you want to display. If an invalid error is given an unknown error message is shown.
	 * @param {Boolean} [autohide=false]  If this is set to true the message is being hidden after 5 seconds. Defaults to false.
	 * @returns {HTMLElement}
	 */
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