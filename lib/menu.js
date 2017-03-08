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
	settings_menu,
	{
		label: i18n.__('Overlay settings'),
		click() {
			openOverlaySettings()
		}
	}
]
const appmenu = Menu.buildFromTemplate(appmenuTemplate)
Menu.setApplicationMenu(appmenu)

var getMenuItemById = function(menuitemid, menu) {
	if(typeof(menu) == "undefined")
		menu = Menu.getApplicationMenu()
	var items = menu.items
	for(var i = 0; i < items.length; i++) {
		var submenu = items[i].submenu
		if(submenu != null) {
			var it = getMenuItemById(menuitemid, submenu)
			if(it != null)
				return it
		}
		if(items[i].hasOwnProperty('id') && items[i].id == menuitemid) {
			return items[i]
		}
	}
	return null
}