const appmenuTemplate = [
	{
		label: 'Datei',
		submenu: [
			{
				label: 'Neustarten',
				role: 'reload'
			},
			{
				label: 'DevTools',
				role: 'toggledevtools'
			},
			{
				type: 'separator'
			},
			{
				label: 'Beenden',
				role: 'quit'
			}
		]
	},
	{
		label: 'Twitch',
		submenu: [
			{
				label: 'Kanal wechseln',
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
				label: 'Ausloggen',
				click() {
					window.localStorage.removeItem('tw_auth_token')
					window.location.reload()
				}
			}
		]
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
			if(it != null) return it
		} else if(items[i].hasOwnProperty('id') && items[i].id == menuitemid) {
			return items[i]
		}
	}
	return null
}