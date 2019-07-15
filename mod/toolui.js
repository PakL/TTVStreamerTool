const {remote} = require('electron')
const {Menu, MenuItem, app} = remote
const { substr } = require('stringz')

const TTVTool = require('./tool')
const UIPage = require('./uipage')

const Cockpit = require('../lib/cockpit')
const Overlays = require('../lib/overlay')

const selfWindow = remote.BrowserWindow.getAllWindows()[0]

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
			}
		]

		Menu.setApplicationMenu(Menu.buildFromTemplate(this.menuTemplate))

		this._appendPageViewLinkOnLoad = []
		this._loadingPages = {'global': false}

		/*this.addMenu(this._tool.auth.menu)
		this.addMenu(this._tool.settings.menu)*/

		this.addPage(new Cockpit(this))
		this.addPage(new Overlays(this))

		this._tool.once('load', () => {
			self.openPage(self.pages[0].name)

			let navMenu = document.querySelector('#nav-main-menu')
			self._appendPageViewLinkOnLoad.forEach((pageLink) => {
				navMenu.appendChild(pageLink)
			})
			self._appendPageViewLinkOnLoad = []

			
			this.addPage(new class extends UIPage {
				constructor(name) {
					super(name)
					document.querySelector('#nav-about').onclick = () => { self.openPage('About') }
				}
				get showInViewsList() { return false }
				open() { document.querySelector('#content_about').style.display = 'block' }
				close() { document.querySelector('#content_about').style.display = 'none' }
			}('About'));
			this.addPage(new class extends UIPage {
				constructor(name) {
					super(name)
					document.querySelector('#nav-changelog').onclick = () => { self.openPage('Changelog') }
				}
				get showInViewsList() { return false }
				open() {
					document.querySelector('#content_changelog').style.display = 'block'

					let latestKnownVersion = self.tool.settings.getString('lastversion', '0.3.11')
					if(latestKnownVersion != app.getVersion()) {
						self.tool.settings.setString('lastversion', app.getVersion())
						let changelogUpdateIndicator =  document.querySelector('#nav-changelog > span.update')
						if(changelogUpdateIndicator != null) {
							changelogUpdateIndicator.parentNode.removeChild(changelogUpdateIndicator)
						}
					}
				}
				close() { document.querySelector('#content_changelog').style.display = 'none' }
			}('Changelog'));
			let latestKnownVersion = self.tool.settings.getString('lastversion', '0.3.11')
			if(latestKnownVersion != app.getVersion()) {
				let changelogUpdateIndicator =  document.querySelector('#nav-changelog > span.update')
				if(changelogUpdateIndicator == null) {
					changelogUpdateIndicator = document.createElement('span')
					changelogUpdateIndicator.classList.add('update')
					document.querySelector('#nav-changelog').appendChild(changelogUpdateIndicator)
				}
			}
		})

		

		selfWindow.removeAllListeners('enter-full-screen')
		selfWindow.on('enter-full-screen', () => {
			document.querySelector('body').classList.add('fullscreen')
		})
		selfWindow.removeAllListeners('enter-html-full-screen')
		selfWindow.on('enter-html-full-screen', () => {
			document.querySelector('body').classList.add('fullscreen')
		})
		selfWindow.removeAllListeners('leave-full-screen')
		selfWindow.on('leave-full-screen', () => {
			document.querySelector('body').classList.remove('fullscreen')
		})
		selfWindow.removeAllListeners('leave-html-full-screen')
		selfWindow.on('leave-html-full-screen', () => {
			document.querySelector('body').classList.remove('fullscreen')
			selfWindow.setFullScreen(false)
		})

		window.onkeyup = (ev) => {
			if(ev.which == 122) { // F11
				selfWindow.setFullScreen(!selfWindow.isFullScreen())
			} else if(ev.which == 27 && selfWindow.isFullScreen()) { // Esc
				selfWindow.setFullScreen(false)
			} else if(ev.which == 116) { // F5
				let currPage = this.findPage(this.currentPage)
				if(currPage !== null && typeof(currPage.refreshPage) === 'function') {
					currPage.refreshPage()
				}
			}
		}
		
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
				this._loadingPages[page.name] = false
				if(page.showInViewsList) {
					let listElement = document.createElement('li')
					let linkElement = document.createElement('a')
					let iconElement = document.createElement('span')

					iconElement.innerText = substr(page.icon, 0, 1).toUpperCase()
					linkElement.appendChild(iconElement)
					linkElement.appendChild(document.createTextNode(page.localizedName))
					linkElement.addEventListener('click', () => { self.openPage(page.name) })
					listElement.appendChild(linkElement)

					let navMenu = document.querySelector('#nav-main-menu')
					if(navMenu == null) {
						self._appendPageViewLinkOnLoad.push(listElement)
					} else {
						navMenu.appendChild(listElement)
					}
					/*let menu = this.getMenuItemById('menu_view')
					menu.submenu.append(new MenuItem({
						label: page.localizedName,
						type: 'radio',
						checked: false,
						click: (mi, bw, e) => { self.openPage(page.name) }
					}))*/
				}
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
				this._removeLoading()
				pageCurrentObject.close()
			}
			this.pageBefore = this.currentPage
			page.open()
			document.querySelector('title').innerText = 'TTVStreamerTool - ' + page.localizedName
			this.currentPage = page.name
			if(this._loadingPages[page.name] || this._loadingPages['global']) {
				this._createLoading()
			}
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

	_createLoading()
	{
		if(this.loadingElement != null) return

		this.loadingElement = document.createElement('modal')
		this.loadingElement.innerHTML = '<img src="../res/hourglass.gif" alt="" />'
		document.querySelector('#contents').style.filter = 'blur(3px)'
		document.querySelector('body').appendChild(this.loadingElement)
		riot.mount(this.loadingElement)
	}

	/**
	 * Displays the loading overlay.
	 * @param {UIPage} [page] The page that is currently loading, so the loading screen is only visible for the loading page
	 */
	startLoading(page) {
		if(!(page instanceof UIPage)) page = { name: 'global' }
		this._loadingPages[page.name] = true
		if(this.currentPage == page.name || page.name == 'global') {
			this._createLoading()
		}
	}

	_removeLoading()
	{
		if(this.loadingElement == null) return
		document.querySelector('#contents').style.filter = ''
		this.loadingElement.parentElement.removeChild(this.loadingElement)
		this.loadingElement = null
	}

	/**
	 * Removes the loading overlay.
	 */
	stopLoading(page) {
		if(!(page instanceof UIPage)) page = { name: 'global' }
		this._loadingPages[page.name] = false
		if(this.currentPage == page.name || (page.name == 'global' && !this._loadingPages[this.currentPage])) {
			this._removeLoading()
		}
	}

	/**
	 * Creates and displays a error message as an modal overlay and returns the created element.
	 * 
	 * @param {Error} error The error you want to display. If an invalid error is given an unknown error message is shown.
	 * @param {Boolean} [autohide=false]  If this is set to true the message is being hidden after 5 seconds. Defaults to false.
	 * @param {Boolean} [showbutton=true]  If this is set to false the OK button is not displayed. Defaults to true.
	 * @returns {HTMLElement}
	 */
	showErrorMessage(error, autohide, showbutton) {
		if(typeof(autohide) != "boolean") autohide = false
		if(typeof(showbutton) != "boolean") showbutton = true

		//this.stopLoading() // Stop loading
		if(typeof(error) == 'string') error = new Error(error)
		if(error == null || !error.hasOwnProperty('message')) error = new Error(this._tool.i18n.__('Unkown error'))
		if(!autohide) console.error(error)
		const modal = document.createElement('modal')
		modal.innerHTML = error.message.replace('<', '&gt;').replace('>', '&lt;').replace('\n', '<br>') + (showbutton ? '<div style="text-align:center;margin-top:10px;"><button>' + this._tool.i18n.__('OK') + '</button></div>' : '')
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