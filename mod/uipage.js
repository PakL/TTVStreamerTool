"use strict"

const EventEmitter = require('events')

class UIPage extends EventEmitter {

	constructor(name) {
		super()
		this._name = name
	}

	get name() {
		return this._name
	}

	get localizedName() {
		return this._name
	}

	open() {}

	close() {}

}

module.exports = UIPage