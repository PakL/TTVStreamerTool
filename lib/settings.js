"use strict"

const {remote} = require('electron')
const {Menu, MenuItem} = remote

class ToolSettings {

	/**
	 * @param {TTVTool} tool
	 */
	constructor(tool) {
		this._tool = tool
		this._tool.on('load', () => {
			riot.mount(document.querySelector('#highlightdialog'))
		})
	}

	get language() {
		return this.getString('language', 'en')
	}

	get showLocalizedNames() {
		return this.getBoolean('showlocalizednames', true)
	}

	get autoRecoverMessages() {
		return this.getBoolean('autorecovermessages', false)
	}

	get highlights() {
		return this.getJSON('highlights', [])
	}

	get menu() {
		const self = this
		return new MenuItem({
			label: this._tool.i18n.__('Settings'),
			submenu: Menu.buildFromTemplate([
				{
					label: this._tool.i18n.__('Language'),
					submenu: [
						{
							label: 'English',
							type: 'radio',
							id: 'menu_language_en',
							checked: (this.language == 'en' ? true : false),
							click() {
								self.setLanguage('en')
							}
						},
						{
							label: 'Deutsch',
							type: 'radio',
							id: 'menu_language_de',
							checked: (this.language == 'de' ? true : false),
							click() {
								self.setLanguage('de')
							}
						}
					]
				},
				{
					label: this._tool.i18n.__('Autorecover deleted messages'),
					type: 'checkbox',
					id: 'menu_autorecovermessages',
					checked: this.autoRecoverMessages,
					click() {
						self.setBoolean('autorecovermessages', !self.autoRecoverMessages)
						self._tool.ui.getMenuItemById('menu_autorecovermessages').checked = self.autoRecoverMessages
					}
				},
				{
					label: this._tool.i18n.__('Show localized display names'),
					type: 'checkbox',
					id: 'menu_localizednames',
					checked: this.showLocalizedNames,
					click() {
						self.setBoolean('showlocalizednames', !self.showLocalizedNames)
						self._tool.ui.getMenuItemById('menu_localizednames').checked = self.showLocalizedNames
					}
				},
				{
					label: this._tool.i18n.__('Highlights'),
					id: 'menu_highlights',
					submenu: this.create_highlight_menu()
				}
			])
		})
	}


	setLanguage(lang) {
		this.setString('language', lang)

		this._tool.ui.showErrorMessage(new Error('You need to restart TTVStreamerTool for the language change to take effect.'))
	}

	addHighlight() {
		const self = this
		document.querySelector('#highlightdialog').style.display = 'table'
		document.querySelector('#highlightdialog_phrase').value = ''
		this._chrsel = () => { self.checkHighlightRegexSyntax() }
		document.querySelector('#highlightdialog_phrase').addEventListener('keyup', this._chrsel)
		document.querySelector('#highlightdialog_regex').checked = false
		document.querySelector('#highlightdialog_casesensitive').checked = false
	}

	checkHighlightRegexSyntax() {
		if(!document.querySelector('#highlightdialog_regex').checked) return true

		let rx = document.querySelector('#highlightdialog_phrase').value
		try {
			let r = new RegExp(rx)
			document.querySelector('#highlightdialog_errors').innerText = ''
			return true
		} catch(err) {
			document.querySelector('#highlightdialog_errors').innerText = err.message
			return false
		}
	}

	cancelNewHighlight() {
		document.querySelector('#highlightdialog').style.display = 'none'
	}
	saveNewHighlight() {
		const self = this
		document.querySelector('#highlightdialog_phrase').removeEventListener('keyup', this._chrsel)
		document.querySelector('#highlightdialog').style.display = 'none'

		let phrase = document.querySelector('#highlightdialog_phrase').value
		let regex = document.querySelector('#highlightdialog_regex').checked
		let casesensitive = document.querySelector('#highlightdialog_casesensitive').checked
		let id = 'highlight_' + (regex ? 'regex_' : 'noregex_') + phrase + (casesensitive ? '_casesensitive' : '_caseinsensitive')

		if(phrase.length > 0 && this.checkHighlightRegexSyntax()) {
			let doesexist = false
			let highlights = this.highlights
			for(let i = 0; i < highlights.length; i++) {
				if(highlights[i].id == item.id)
					doesexist = true
			}
			if(!doesexist) {
				highlights.push({ phrase: phrase, regex: regex, casesensitive: casesensitive, id: id })
				this._tool.ui.getMenuItemById('menu_highlights').submenu.append(new MenuItem({
					label: phrase,
					id: id,
					click(item) { self.removeHighlight(item) }
				}))
				this.setJSON('highlights', highlights)
			}
		}
	}

	removeHighlight(item) {
		if(confirm(this._tool.i18n.__('Are you sure you want do delete this highlight?'))) {
			item.visible = false
			let highlights = this.highlights
			for(var i = 0; i < highlights.length; i++) {
				if(highlights[i].id == item.id) {
					highlights.splice(i, 1)
					this.setJSON('highlights', highlights)
					break
				}
			}
		}
	}

	create_highlight_menu() {
		const self = this
		let highlight_menu = [
			{
				label: this._tool.i18n.__('Add a highlighter'),
				click() { self.addHighlight() }
			},
			{ type: 'separator' }
		]
		let highlights = this.highlights
		for(var i = 0; i < highlights.length; i++) {
			highlight_menu.push({
				label: highlights[i].phrase,
				id: highlights[i].id,
				click(item) { self.removeHighlight(item) }
			})
		}

		return highlight_menu
	}

	/**
	 * @param {string} name
	 * @param {boolean} defaultValue
	 */ 
	getBoolean(name, defaultValue) {
		let item = window.localStorage.getItem(name)
		if(item != null) {
			if(item == 'true') {
				return true
			} else if(item == 'false') {
				return false
			}
		}
		return defaultValue
	}

	/**
	 * @param {string} name
	 * @param {boolean} value 
	 */
	setBoolean(name, value) {
		window.localStorage.setItem(name, (value ? 'true' : 'false'))
	}

	/**
	 * @param {string} name 
	 * @param {string} defaultValue 
	 */
	getString(name, defaultValue) {
		let item = window.localStorage.getItem(name)
		if(item != null) {
			return item
		}

		return defaultValue
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {string} value 
	 */
	setString(name, value) {
		window.localStorage.setItem(name, value)
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {object} defaultValue 
	 */
	getJSON(name, defaultValue) {
		let item = window.localStorage.getItem(name)
		if(item != null) {
			try {
				return JSON.parse(item)
			} catch(e) { console.error(e) }
		}
		return defaultValue
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {object} value 
	 */
	setJSON(name, value) {
		try {
			window.localStorage.setItem(name, JSON.stringify(value))
		} catch(e) { console.error(e) }
	}

}

module.exports = ToolSettings