import { ipcRenderer } from 'electron';

const _storageSetHolder = window.localStorage.setItem
const _storageRemoveHolder = window.localStorage.removeItem

const availableLanguages = ['en', 'de']

ipcRenderer.on('Settings.getBoolean', (event, rid: string, name: string, defaultValue: boolean, session: boolean = false) => {
	ipcRenderer.send(`Settings.gotBoolean.${name}.${rid}`, getBoolean(name, defaultValue, session));
});
ipcRenderer.on('Settings.setBoolean', (event, rid: string, name: string, value: boolean, session: boolean = false) => {
	ipcRenderer.send(`Settings.sotBoolean.${name}.${rid}`, setBoolean(name, value, session));
});
ipcRenderer.on('Settings.getString', (event, rid: string, name: string, defaultValue: string, session: boolean = false) => {
	ipcRenderer.send(`Settings.gotString.${name}.${rid}`, getString(name, defaultValue, session));
});
ipcRenderer.on('Settings.setString', (event, rid: string, name: string, value: string, session: boolean = false) => {
	ipcRenderer.send(`Settings.sotString.${name}.${rid}`, setString(name, value, session));
});
ipcRenderer.on('Settings.getJSON', (event, rid: string, name: string, defaultValue: Object, session: boolean = false) => {
	ipcRenderer.send(`Settings.gotJSON.${name}.${rid}`, getJSON(name, defaultValue, session));
});
ipcRenderer.on('Settings.setJSON', (event, rid: string, name: string, value: Object, session: boolean = false) => {
	ipcRenderer.send(`Settings.sotJSON.${name}.${rid}`, setJSON(name, value, session));
});

export function language(lang?: string) {
	if(lang && availableLanguages.includes(lang)) {
		setString('language', lang);
		return lang;
	}

	let locale = ipcRenderer.sendSync('app.getLocale').toLowerCase();
	if(availableLanguages.indexOf(locale) < 0) locale = 'en';
	return getString('language', locale);
}

/**
 * Load a boolean from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {Boolean} defaultValue The default value you want returned if storage value was not found
 * @param {Boolean} [session=false] use sessionStorage instead
 * @returns {Boolean}
 */ 
export function getBoolean(name: string, defaultValue: boolean, session: boolean = false): boolean {
	if(typeof(session) !== 'boolean') session = false;
	if(name.length <= 0) return defaultValue;
	let item = window[session ? 'sessionStorage' : 'localStorage'].getItem(name);
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
 * @param {Boolean} [session=false] use sessionStorage instead
 */
export function setBoolean(name: string, value: boolean, session: boolean = false) {
	if(typeof(session) !== 'boolean') session = false;
	window[session ? 'sessionStorage' : 'localStorage'].setItem(name, (value ? 'true' : 'false'));
}

/**
 * Gets a string from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {String} defaultValue The default value you want returned if storage value was not found
 * @param {Boolean} [session=false] use sessionStorage instead
 * @returns {String}
 */
export function getString(name: string, defaultValue: string, session: boolean = false): string {
	if(typeof(session) !== 'boolean') session = false;
	if(name.length <= 0) return defaultValue;
	let item = window[session ? 'sessionStorage' : 'localStorage'].getItem(name);
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
 * @param {Boolean} [session=false] use sessionStorage instead
 */
export function setString(name: string, value: string, session: boolean = false) {
	if(typeof(session) !== 'boolean') session = false;
	window[session ? 'sessionStorage' : 'localStorage'].setItem(name, value);
}

/**
 * Gets a object from the localStorage.
 * 
 * @param {String} name Name of the localStorage value
 * @param {any} defaultValue The default value you want returned if storage value was not found
 * @param {Boolean} [session=false] use sessionStorage instead
 * @returns {any}
 */
export function getJSON(name: string, defaultValue: any, session: boolean = false): any {
	if(typeof(session) !== 'boolean') session = false;
	if(name.length <= 0) return defaultValue;
	let item = window[session ? 'sessionStorage' : 'localStorage'].getItem(name);
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
 * @param {Boolean} [session=false] use sessionStorage instead
 */
export function setJSON(name: string, value: Object, session: boolean = false) {
	if(typeof(session) !== 'boolean') session = false;
	try {
		window[session ? 'sessionStorage' : 'localStorage'].setItem(name, JSON.stringify(value));
	} catch(e) { console.error(e); }
}

/**
 * Removes an item in the localStorage
 * 
 * @param {String} name 
 * @param {Boolean} [session=false] use sessionStorage instead
 */
export function remove(name: string, session: boolean = false) {
	if(typeof(session) !== 'boolean') session = false;
	window[session ? 'sessionStorage' : 'localStorage'].removeItem(name);
}