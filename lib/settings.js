let __language = window.localStorage.getItem('language')
if(__language == null) {
	__language = 'en'
}
const i18n = require('i18n-nodejs')(__language, './../../language.json')

let __showlocalizednames = window.localStorage.getItem('showlocalizednames')
if(__showlocalizednames == null) __showlocalizednames = 'true'

let __autorecovermessages = window.localStorage.getItem('autorecovermessages')
if(__autorecovermessages == null) __autorecovermessages = 'false'

let __highlightsString = window.localStorage.getItem('highlights')
let __highlights = []
if(__highlightsString != null) {
	try {
		__highlights = JSON.parse(__highlightsString)
	} catch(err) {}
}

let setLanguage = function(lang) {
	window.localStorage.setItem('language', lang)
	__language = lang
	getMenuItemById('menu_language_en').checked = false
	getMenuItemById('menu_language_de').checked = false
	
	getMenuItemById('menu_language_' + lang).checked = true

	showErrorMessage(new Error('You need to restart TTVStreamerTool for the language change to take effect.'))
}

let addHighlight = function() {
	document.querySelector('#highlightdialog').style.display = 'table'
	document.querySelector('#highlightdialog_phrase').value = ''
	document.querySelector('#highlightdialog_phrase').addEventListener('keyup', checkHighlightRegexSyntax)
	document.querySelector('#highlightdialog_regex').checked = false
	document.querySelector('#highlightdialog_casesensitive').checked = false
}

let checkHighlightRegexSyntax = function() {
	if(!document.querySelector('#highlightdialog_regex').checked) return true

	var rx = document.querySelector('#highlightdialog_phrase').value
	try {
		var r = new RegExp(rx)
		document.querySelector('#highlightdialog_errors').innerText = ''
		return true
	} catch(err) {
		document.querySelector('#highlightdialog_errors').innerText = err.message
		return false
	}
}

let cancelNewHighlight = function() {
	document.querySelector('#highlightdialog').style.display = 'none'
}
let saveNewHighlight = function() {
	document.querySelector('#highlightdialog_phrase').removeEventListener('keyup', checkHighlightRegexSyntax)
	document.querySelector('#highlightdialog').style.display = 'none'

	var phrase = document.querySelector('#highlightdialog_phrase').value
	var regex = document.querySelector('#highlightdialog_regex').checked
	var casesensitive = document.querySelector('#highlightdialog_casesensitive').checked
	var id = 'highlight_' + (regex ? 'regex_' : 'noregex_') + phrase + (casesensitive ? '_casesensitive' : '_caseinsensitive')

	if(phrase.length > 0 && checkHighlightRegexSyntax()) {
		var doesexist = false
		for(var i = 0; i < __highlights.length; i++) {
			if(__highlights[i].id == item.id)
				doesexist = true
		}
		if(!doesexist) {
			__highlights.push({ phrase: phrase, regex: regex, casesensitive: casesensitive, id: id })
			getMenuItemById('menu_highlights').submenu.append(new MenuItem({
				label: phrase,
				id: id,
				click: removeHighlight
			}))
			window.localStorage.setItem('highlights', JSON.stringify(__highlights))
		}
	}
}

let removeHighlight = function(item) {
	if(confirm(i18n.__('Are you sure you want do delete this highlight?'))) {
		item.visible = false
		for(var i = 0; i < __highlights.length; i++) {
			if(__highlights[i].id == item.id) {
				__highlights.splice(i, 1)
				window.localStorage.setItem('highlights', JSON.stringify(__highlights))
				break;
			}
		}
	}
}

let create_highlight_menu = function() {
	var highlight_menu = [
		{
			label: i18n.__('Add a highlighter'),
			click: addHighlight
		},
		{ type: 'separator' }
	]
	for(var i = 0; i < __highlights.length; i++) {
		highlight_menu.push({
			label: __highlights[i].phrase,
			id: __highlights[i].id,
			click: removeHighlight
		})
	}

	return highlight_menu
}


let settings_menu = {
	label: i18n.__('Settings'),
	submenu: [
		{
			label: i18n.__('Language'),
			submenu: [
				{
					label: 'English',
					type: 'radio',
					id: 'menu_language_en',
					checked: (__language == 'en' ? true : false),
					click() {
						setLanguage('en')
					}
				},
				{
					label: 'Deutsch',
					type: 'radio',
					id: 'menu_language_de',
					checked: (__language == 'de' ? true : false),
					click() {
						setLanguage('de')
					}
				}
			]
		},
		{
			label: i18n.__('Autorecover deleted messages'),
			type: 'checkbox',
			id: 'menu_autorecovermessages',
			checked: (__autorecovermessages == 'true' ? true : false),
			click() {
				if(__autorecovermessages == 'true') {
					__autorecovermessages = 'false'
				} else {
					__autorecovermessages = 'true'
				}
				getMenuItemById('menu_autorecovermessages').checked = (__autorecovermessages == 'true' ? true : false)
				window.localStorage.setItem('autorecovermessages', __autorecovermessages)
			}
		},
		{
			label: i18n.__('Show localized display names'),
			type: 'checkbox',
			id: 'menu_localizednames',
			checked: (__showlocalizednames == 'true' ? true : false),
			click() {
				if(__showlocalizednames == 'true') {
					__showlocalizednames = 'false'
				} else {
					__showlocalizednames = 'true'
				}
				getMenuItemById('menu_localizednames').checked = (__showlocalizednames == 'true' ? true : false)
				window.localStorage.setItem('showlocalizednames', __showlocalizednames)
			}
		},
		{
			label: i18n.__('Highlights'),
			id: 'menu_highlights',
			submenu: create_highlight_menu()
		}
	]
}