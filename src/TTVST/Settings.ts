import { remote } from 'electron';
const { app } = remote

const _storageSetHolder = window.localStorage.setItem
const _storageRemoveHolder = window.localStorage.removeItem

const availableLanguages = ['en', 'de']

export function language(lang?: string) {
	if(lang && availableLanguages.includes(lang)) {
		setString('language', lang);
		return lang;
	}

	let locale = app.getLocale().toLowerCase();
	if(availableLanguages.indexOf(locale) < 0) locale = 'en';
	return getString('language', locale);
}

/**
 * Load a boolean from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {Boolean} defaultValue The default value you want returned if storage value was not found
 * @returns {Boolean}
 */ 
export function getBoolean(name: string, defaultValue: boolean): boolean {
	if(name.length <= 0) return defaultValue;
	let item = window.localStorage.getItem(name);
	if(item != null) {
		if(item == 'true') {
			return true;
		} else if(item == 'false') {
			return false;
		}
	}
	return defaultValue;
}

/**
 * Sets a boolean to the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {Boolean} value The value you want to set
 */
export function setBoolean(name: string, value: boolean) {
	window.localStorage.setItem(name, (value ? 'true' : 'false'));
}

/**
 * Gets a string from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {String} defaultValue The default value you want returned if storage value was not found
 * @returns {String}
 */
export function getString(name: string, defaultValue: string): string {
	if(name.length <= 0) return defaultValue;
	let item = window.localStorage.getItem(name);
	if(item != null) {
		return item;
	}

	return defaultValue;
}

/**
 * Sets a string to the localStroage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {String} value The value you want to set
 */
export function setString(name: string, value: string) {
	window.localStorage.setItem(name, value);
}

/**
 * Gets a object from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {Object} defaultValue The default value you want returned if storage value was not found
 * @returns {Object}
 */
export function getJSON(name: string, defaultValue: Object): Object {
	if(name.length <= 0) return defaultValue;
	let item = window.localStorage.getItem(name);
	if(item != null) {
		try {
			return JSON.parse(item);
		} catch(e) { console.error(e); }
	}
	return defaultValue;
}

/**
 * Sets a JSON object to the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {Object} value The value you want to set
 */
export function setJSON(name: string, value: Object) {
	try {
		window.localStorage.setItem(name, JSON.stringify(value));
	} catch(e) { console.error(e); }
}

/**
 * Removes an item in the localStorage
 * 
 * @param {String} name 
 */
export function remove(name: string) {
	window.localStorage.removeItem(name);
}