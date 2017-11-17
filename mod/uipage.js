"use strict"

const EventEmitter = require('events')

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