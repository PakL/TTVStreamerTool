let __showlocalizednames = window.localStorage.getItem('showlocalizednames')
if(__showlocalizednames == null) __showlocalizednames = 'true'
const appmenuTemplate = [
	{
		label: i18n.__('File'),
		submenu: [
			{
				label: i18n.__('Restart'),
				role: 'reload'
			},
			{
				label: i18n.__('DevTools'),
				role: 'toggledevtools'
			},
			{
				type: 'separator'
			},
			{
				label: i18n.__('Quit'),
				role: 'quit'
			}
		]
	},
	{
		label: 'Twitch',
		submenu: [
			{
				label: i18n.__('Change channel'),
				enabled: false,
				id: 'menu_changechannel',
				click() {
					leaveChannel()
				}
			},
			{
				type: 'separator'
			},
			{
				label: i18n.__('Logout'),
				click() {
					window.localStorage.removeItem('tw_auth_token')
					window.location.reload()
				}
			}
		]
	},
	{
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
			}
		]
	}
]
const appmenu = Menu.buildFromTemplate(appmenuTemplate)
Menu.setApplicationMenu(appmenu)

let setLanguage = function(lang) {
	window.localStorage.setItem('language', lang)
	__language = lang
	getMenuItemById('menu_language_en').checked = false
	getMenuItemById('menu_language_de').checked = false
	
	getMenuItemById('menu_language_' + lang).checked = true

	showErrorMessage(new Error('You need to restart TTVStreamerTool for the language change to take effect.'))
}

var getMenuItemById = function(menuitemid, menu) {
	if(typeof(menu) == "undefined")
		menu = Menu.getApplicationMenu()
	var items = menu.items
	for(var i = 0; i < items.length; i++) {
		var submenu = items[i].submenu
		if(submenu != null) {
			var it = getMenuItemById(menuitemid, submenu)
			if(it != null) return it
		} else if(items[i].hasOwnProperty('id') && items[i].id == menuitemid) {
			return items[i]
		}
	}
	return null
}