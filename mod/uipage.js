"use strict"

const EventEmitter = require('events')
const { substr } = require('stringz')

/**
 * If JavaScript had abstract classes this would have been one. This is just an extendable class for the UI.
 * 
 * @class UIPage
 * @extends {EventEmitter}
 * @abstract
 * @param {String} name
 */
class UIPage extends EventEmitter {

	constructor(name) {
		super()
		this._name = name
	}

	/**
	 * Gives you the name of the page.
	 * 
	 * @member {String}
	 * @readonly
	 */
	get name() {
		return this._name
	}

	/**
	 * Gives you the localized name of the page.
	 * 
	 * @member {String}
	 * @readonly
	 */
	get localizedName() {
		return this._name
	}

	/**
	 * A single character; use UTF-8 emojis or something
	 * 
	 * @member {String}
	 * @readonly
	 */
	get icon() {
		return substr(this.localizedName, 0, 1).toUpperCase()
	}

	/**
	 * Wether or not to show this page in the views list; If false you have to make sure yourself that the user can access this page
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showInViewsList() {
		return true
	}

	/**
	 * Is being called when this page is opened.
	 * 
	 * @abstract
	 */
	open() {}

	/**
	 * Is being called when open and is being closed.
	 * 
	 * @abstract
	 */
	close() {}

}

module.exports = UIPage