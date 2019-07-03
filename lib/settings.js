const {remote} = require('electron')
const {Menu, MenuItem, app} = remote

const UIPage = require('../mod/uipage')

/**
 * This module manages a few settings and gives you easy functions to
 * store your settings in the localStorage.
 * 
 * @class ToolSettings
 * @param {TTVTool} tool
 */
class ToolSettings extends UIPage {

	constructor(tool) {
		super('Settings')

		const self = this
		this._tool = tool
		this._appendOnLoad = []
		this._openchannel = ''
		this._tool.once('load', () => {
			riot.mount(document.querySelector('#highlightdialog'))

			document.querySelector('#nav-settings').onclick = () => {
				self._tool.ui.openPage('Settings')
			}

			while(self._appendOnLoad.length > 0) {
				let s = self._appendOnLoad.shift()
				self.appendSetting(s.setting, s.label, s.type, s.options)
			}

			self.appendSetting('language', self._tool.i18n.__('Language'), 'select', { selection: { 'en': 'English', 'de': 'Deutsch' }, onchange: () => { self._tool.ui.showErrorMessage(new Error('You need to restart TTVStreamerTool for the language change to take effect.')) }, default: self.language })
			self.appendSetting('debug-enabled', self._tool.i18n.__('Debug logging enabled'), 'checkbox', { default: false, description: self._tool.i18n.__('Enabling will result in a higher memory usage. This is only for debugging purposes.'), onchange: (e) => { enableDebug(e.target.checked) } })

			self.generateGlobalSettings()
			self.generateChannelSettings()

			self.appendSetting('tw_auth_token', self._tool.i18n.__('Logout'), 'button', { set: 'twitch', setLabel: 'Twitch', description: self._tool.i18n.__('Click this button to log out of twitch. You will prompted to login again.'), onclick: () => {
				self.remove('tw_auth_token')
				window.location.reload()
			} })


			self.appendSetting('', self._tool.i18n.__('Add a highlighter'), 'button', { set: 'highlights', setLabel: this._tool.i18n.__('Highlights'), onclick: () => {
				self.addHighlight()
			} })
			self.appendSetting('', '', 'separator', { set: 'highlights' })
	
			self.create_highlight_settings()

			self._tool.cockpit.on('channelopen', () => {
				self._openchannel = self._tool.cockpit.openChannelObject.id
				self.generateChannelSettings()
			})
			self._tool.cockpit.on('channelleft', () => {
				self._openchannel = ''
				self.generateChannelSettings()
			})
		})
	}

	generateGlobalSettings() {
		let set = document.querySelector('#settings_set_cockpit_options')
		if(set !== null) set._tag.clear()
		this.appendSetting('autorecovermessages', this._tool.i18n.__('Autorecover deleted messages'), 'checkbox', { set: 'cockpit_options', setLabel: this._tool.i18n.__('Cockpit options'), default: false })
		this.appendSetting('showlocalizednames', this._tool.i18n.__('Show localized display names'), 'checkbox', { set: 'cockpit_options', default: true })
		this.appendSetting('showviewerlist', this._tool.i18n.__('Show viewer list'), 'checkbox', { set: 'cockpit_options', default: true })
		this.appendSetting('showactionstream', this._tool.i18n.__('Show action stream'), 'checkbox', { set: 'cockpit_options', default: true })
		this.appendSetting('showviewersamount', this._tool.i18n.__('Show amount of viewers'), 'checkbox', { set: 'cockpit_options', default: true })
		this.appendSetting('classicchat', this._tool.i18n.__('Classic chat'), 'checkbox', { set: 'cockpit_options', description: this._tool.i18n.__('Instead of positioning messages below the username and aligning badges to the right, this mode will give you a more classic twitch look, with badges in front of usernames and messages direcly inline.'), default: false })

		set = document.querySelector('#settings_set_chat_filter')
		if(set !== null) set._tag.clear()
		this.appendSetting('filteremotespam', this._tool.i18n.__('Filter emote spam'), 'checkbox', { set: 'chat_filter', setLabel: this._tool.i18n.__('Chat filter'), description: this._tool.i18n.__('This filters out any messages that are only emotes.'), default: false })
		this.appendSetting('showemotestream', this._tool.i18n.__('Show emote stream instead'), 'checkbox', { set: 'chat_filter', description: this._tool.i18n.__('Now that we have no emote spam you can display emotes in a single row stream below the chat to still get a feealing for the chat.'), default: false })
		this.appendSetting('filterbotcommands', this._tool.i18n.__('Filter bot commands'), 'checkbox', { set: 'chat_filter', description: this._tool.i18n.__('This filters out any messages beginning with an exclamation mark (!) and messages by known bots (Moobot, StreamElements).'), default: false })
		this.appendSetting('filtersubscriptions', this._tool.i18n.__('Filter subscription messages'), 'checkbox', { set: 'chat_filter', description: this._tool.i18n.__('This filters out subscription messages from chat. They will still be displayed in the action stream if not disabled below.'), default: false })
		
		set = document.querySelector('#settings_set_alert_options')
		if(set !== null) set._tag.clear()
		this.appendSetting('flashactions', this._tool.i18n.__('Flash alerts'), 'checkbox', { set: 'alert_options', setLabel: this._tool.i18n.__('Alert options'), default: true })
		this.appendSetting('', '', 'separator', { set: 'alert_options' })
		this.appendSetting('showfollowalert', this._tool.i18n.__('Show follow alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showsubscriptionalert', this._tool.i18n.__('Show subscription alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showraidalert', this._tool.i18n.__('Show raid alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showhostalert', this._tool.i18n.__('Show host alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showbanalert', this._tool.i18n.__('Show ban alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showtimeoutalert', this._tool.i18n.__('Show timeout alerts'), 'checkbox', { set: 'alert_options', default: true })
		this.appendSetting('showcheeralert', this._tool.i18n.__('Show cheer alerts'), 'checkbox', { set: 'alert_options', default: true })
	}

	generateChannelSettings() {
		let set = document.querySelector('#settings_set_channel_cockpit_options')
		if(set !== null) set._tag.clear()
		this.appendSetting(this._openchannel + 'overwrite_cockpit_settings', this._tool.i18n.__('Overwrite global settings with these'), 'checkbox', { set: 'channel_cockpit_options', setLabel: this._tool.i18n.__('Cockpit options') + ' (' + this._tool.i18n.__('Current channel') + ')', default: false })
		if(this._openchannel.length > 0) {
			this.appendSetting('', '', 'separator', { set: 'channel_cockpit_options' })
			this.appendSetting(this._openchannel + 'autorecovermessages', this._tool.i18n.__('Autorecover deleted messages'), 'checkbox', { set: 'channel_cockpit_options', default: false })
			this.appendSetting(this._openchannel + 'showlocalizednames', this._tool.i18n.__('Show localized display names'), 'checkbox', { set: 'channel_cockpit_options', default: true })
			this.appendSetting(this._openchannel + 'showviewerlist', this._tool.i18n.__('Show viewer list'), 'checkbox', { set: 'channel_cockpit_options', default: true })
			this.appendSetting(this._openchannel + 'showactionstream', this._tool.i18n.__('Show action stream'), 'checkbox', { set: 'channel_cockpit_options', default: true })
			this.appendSetting(this._openchannel + 'showviewersamount', this._tool.i18n.__('Show amount of viewers'), 'checkbox', { set: 'channel_cockpit_options', default: true })
			this.appendSetting(this._openchannel + 'classicchat', this._tool.i18n.__('Classic chat'), 'checkbox', { set: 'channel_cockpit_options', description: this._tool.i18n.__('Instead of positioning messages below the username and aligning badges to the right, this mode will give you a more classic twitch look, with badges in front of usernames and messages direcly inline.'), default: false })
		}

		set = document.querySelector('#settings_set_channel_chat_filter')
		if(set !== null) set._tag.clear()
		this.appendSetting(this._openchannel + 'overwrite_chat_filter', this._tool.i18n.__('Overwrite global settings with these'), 'checkbox', { set: 'channel_chat_filter', setLabel: this._tool.i18n.__('Chat filter') + ' (' + this._tool.i18n.__('Current channel') + ')', default: false })
		if(this._openchannel.length > 0) {
			this.appendSetting('', '', 'separator', { set: 'channel_chat_filter' })
			this.appendSetting(this._openchannel + 'filteremotespam', this._tool.i18n.__('Filter emote spam'), 'checkbox', { set: 'channel_chat_filter', description: this._tool.i18n.__('This filters out any messages that are only emotes.'), default: false })
			this.appendSetting(this._openchannel + 'showemotestream', this._tool.i18n.__('Show emote stream instead'), 'checkbox', { set: 'channel_chat_filter', description: this._tool.i18n.__('Now that we have no emote spam you can display emotes in a single row stream below the chat to still get a feealing for the chat.'), default: false })
			this.appendSetting(this._openchannel + 'filterbotcommands', this._tool.i18n.__('Filter bot commands'), 'checkbox', { set: 'channel_chat_filter', description: this._tool.i18n.__('This filters out any messages beginning with an exclamation mark (!) and messages by known bots (Moobot, StreamElements).'), default: false })
			this.appendSetting(this._openchannel + 'filtersubscriptions', this._tool.i18n.__('Filter subscription messages'), 'checkbox', { set: 'channel_chat_filter', description: this._tool.i18n.__('This filters out subscription messages from chat. They will still be displayed in the action stream if not disabled below.'), default: false })
		}
		
		set = document.querySelector('#settings_set_channel_alert_options')
		if(set !== null) set._tag.clear()
		this.appendSetting(this._openchannel + 'overwrite_alert_options', this._tool.i18n.__('Overwrite global settings with these'), 'checkbox', { set: 'channel_alert_options', setLabel: this._tool.i18n.__('Alert options') + ' (' + this._tool.i18n.__('Current channel') + ')', default: false })
		if(this._openchannel.length > 0) {
			this.appendSetting('', '', 'separator', { set: 'channel_alert_options' })
			this.appendSetting(this._openchannel + 'flashactions', this._tool.i18n.__('Flash alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting('', '', 'separator', { set: 'channel_alert_options' })
			this.appendSetting(this._openchannel + 'showfollowalert', this._tool.i18n.__('Show follow alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showsubscriptionalert', this._tool.i18n.__('Show subscription alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showraidalert', this._tool.i18n.__('Show raid alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showhostalert', this._tool.i18n.__('Show host alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showbanalert', this._tool.i18n.__('Show ban alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showtimeoutalert', this._tool.i18n.__('Show timeout alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
			this.appendSetting(this._openchannel + 'showcheeralert', this._tool.i18n.__('Show cheer alerts'), 'checkbox', { set: 'channel_alert_options', default: true })
		}
	}

	get localizedName() {
		return this._tool.i18n.__('Settings')
	}

	get showInViewsList() { return false }

	open() {
		document.querySelector('#content_settings').style.display = "block";
	}
	close() {
		document.querySelector('#content_settings').style.display = "none";
	}

	/**
	 * 
	 * @param {String} setting 
	 * @param {String} label 
	 * @param {String} type 
	 * @param {Object} options 
	 */
	appendSetting(setting, label, type, options) {
		const self = this

		type = type.toLowerCase()
		if(['text', 'checkbox', 'select', 'password', 'separator', 'button', 'range', 'number', 'date', 'time'].indexOf(type) < 0) return
		//if((setting.length <= 0 || label.length <= 0) && type != 'separator') return


		let options_default = {
			set: 'unsorted',
			setLabel: '',
			description: '',
			selection: {},
			onchange: null,
			onclick: null,
			default: null
		}
		if(typeof(options) == 'object') {
			options = Object.assign(options_default, options)
		} else {
			options = options_default
		}
		
		options.type = type
		options.setting = setting
		options.label = label

		let content_settings = document.querySelector('#content_settings')
		if(content_settings === null) {
			this._appendOnLoad.push({setting: setting, label: label, type: type, options: options})
			return
		}

		// Getting the fieldset the option belongs to or creates a new one if it doesn't exist
		let settings_set = document.querySelector('#settings_set_' + options.set)
		if(settings_set === null) {
			let fieldsetElement = document.createElement('settingsset')
			fieldsetElement.id = 'settings_set_' + options.set
			
			content_settings.appendChild(fieldsetElement)
			riot.mount(fieldsetElement, {'title': options.setLabel, 'settings': []})
			settings_set = fieldsetElement
		}

		settings_set._tag.addSetting(options)
	}

	/**
	 * Loads and returns the selected application language.
	 * 
	 * @member {String}
	 * @readonly
	 */
	get language() {
		let locale = app.getLocale().toLowerCase()
		if(['en', 'de'].indexOf(locale) < 0) locale = 'en'
		return this.getString('language', locale)
	}

	/**
	 * Loads and returns weither or not localized names should be displayed.
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showLocalizedNames() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'showlocalizednames', true)
		return this.getBoolean('showlocalizednames', true)
	}

	/**
	 * Loads and returns weither or not to auto recover deleted messages.
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get autoRecoverMessages() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'showlocalizednames', false)
		return this.getBoolean('autorecovermessages', false)
	}

	/**
	 * Loads and returns weither or not to display chat in a classic look.
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get displayClassicChat() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'classicchat', false)
		return this.getBoolean('classicchat', false)
	}

	/**
	 * Loads and returns weither or not to animate actions in the action bar
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get flashActions() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'flashactions', true)
		return this.getBoolean('flashactions', true)
	}

	/**
	 * Loads and returns weither or not to show follow alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showFollowAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showfollowalert', true)
		return this.getBoolean('showfollowalert', true)
	}
	/**
	 * Loads and returns weither or not to show subscription alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showSubscriptionAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showsubscriptionalert', true)
		return this.getBoolean('showsubscriptionalert', true)
	}
	/**
	 * Loads and returns weither or not to show raid alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showRaidAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showraidalert', true)
		return this.getBoolean('showraidalert', true)
	}
	/**
	 * Loads and returns weither or not to show host alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showHostAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showhostalert', true)
		return this.getBoolean('showhostalert', true)
	}
	/**
	 * Loads and returns weither or not to show ban alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showBanAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showbanalert', true)
		return this.getBoolean('showbanalert', true)
	}
	/**
	 * Loads and returns weither or not to show timeout alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showTimeoutAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showtimeoutalert', true)
		return this.getBoolean('showtimeoutalert', true)
	}
	/**
	 * Loads and returns weither or not to show cheer alerts
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showCheerAlert() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_alert_options', false)) return this.getBoolean(this._openchannel + 'showcheeralert', true)
		return this.getBoolean('showcheeralert', true)
	}

	/**
	 * Loads and returns weither or not to show the viewers list
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showViewerList() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'showviewerlist', true)
		return this.getBoolean('showviewerlist', true)
	}

	/**
	 * Loads and returns weither or not to show the action stream
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showActionStream() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'showactionstream', true)
		return this.getBoolean('showactionstream', true)
	}

	/**
	 * Loads and returns weither or not to show the amount of viewers
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get showViewersAmount() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_cockpit_settings', false)) return this.getBoolean(this._openchannel + 'showviewersamount', true)
		return this.getBoolean('showviewersamount', true)
	}

	/**
	 * Loads and returns an array of configured highlight objects.
	 * 
	 * @member {Array}
	 * @readonly
	 */
	get highlights() {
		return this.getJSON('highlights', [])
	}

	/**
	 * Loads and returns weither or not to invert the application's colors
	 * 
	 * @member {Boolean}
	 * @readonly
	 */
	get lightDesignMode() {
		return this.getBoolean('lightdesignmode', false)
	}

	get filterEmoteSpam() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_chat_filter', false)) return this.getBoolean(this._openchannel + 'filteremotespam', false)
		return this.getBoolean('filteremotespam', false)
	}
	get showEmoteStream() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_chat_filter', false)) return this.getBoolean(this._openchannel + 'showemotestream', false)
		return this.getBoolean('showemotestream', false)
	}

	get filterBotCommands() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_chat_filter', false)) return this.getBoolean(this._openchannel + 'filterbotcommands', false)
		return this.getBoolean('filterbotcommands', false)
	}
	get filterSubscriptions() {
		if(this._openchannel.length > 0 && this.getBoolean(this._openchannel + 'overwrite_chat_filter', false)) return this.getBoolean(this._openchannel + 'filtersubscriptions', false)
		return this.getBoolean('filtersubscriptions', false)
	}

	/**
	 * Creates and returns a settings menu. This always creates a new MenuItem.
	 * If you want access to the items in the application menu use
	 * getMenuItemById of the ToolUI.
	 * 
	 * @member {MenuItem}
	 * @readonly
	 */
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
					label: this._tool.i18n.__('Show viewer list'),
					type: 'checkbox',
					id: 'menu_showviewerlist',
					checked: this.showViewerList,
					click() {
						self.setBoolean('showviewerlist', !self.showViewerList)
						if(!self.showViewerList) {
							document.querySelector('#chat_column').style.width = '70%'
							document.querySelector('#chat_users_column').style.display = 'none'
							document.querySelector('#chat_message_column').style.width = '70%'
							document.querySelector('#chat_message_emotes_button').style.right = 'calc(30% + 8px)'
							document.querySelector('#chat_message_emotes').style.right = 'calc(30% + 8px)'
						} else {
							document.querySelector('#chat_column').style.width = '50%'
							document.querySelector('#chat_users_column').style.display = 'block'
							document.querySelector('#chat_message_column').style.width = '50%'
							document.querySelector('#chat_message_emotes_button').style.right = 'calc(50% + 8px)'
							document.querySelector('#chat_message_emotes').style.right = 'calc(50% + 8px)'
						}
					}
				},
				{
					label: this._tool.i18n.__('Alert options'),
					submenu: [
						{
							label: this._tool.i18n.__('Flash alerts'),
							type: 'checkbox',
							id: 'menu_flashalerts',
							checked: this.flashActions,
							click() {
								self.setBoolean('flashactions', !self.flashActions)
							}
						},
						{ type: 'separator' },
						{
							label: this._tool.i18n.__('Show follow alerts'),
							type: 'checkbox',
							id: 'menu_showfollowalerts',
							checked: this.showFollowAlert,
							click() { self.setBoolean('showfollowalert', !self.showFollowAlert) }
						},
						{
							label: this._tool.i18n.__('Show subscription alerts'),
							type: 'checkbox',
							id: 'menu_showsubscriptionalerts',
							checked: this.showSubscriptionAlert,
							click() { self.setBoolean('showsubscriptionalert', !self.showSubscriptionAlert) }
						},
						{
							label: this._tool.i18n.__('Show raid alerts'),
							type: 'checkbox',
							id: 'menu_showraidalerts',
							checked: this.showRaidAlert,
							click() { self.setBoolean('showraidalert', !self.showRaidAlert) }
						},
						{
							label: this._tool.i18n.__('Show host alerts'),
							type: 'checkbox',
							id: 'menu_showhostalerts',
							checked: this.showHostAlert,
							click() { self.setBoolean('showhostalert', !self.showHostAlert) }
						},
						{
							label: this._tool.i18n.__('Show ban alerts'),
							type: 'checkbox',
							id: 'menu_showbanalerts',
							checked: this.showBanAlert,
							click() { self.setBoolean('showbanalert', !self.showBanAlert) }
						},
						{
							label: this._tool.i18n.__('Show timeout alerts'),
							type: 'checkbox',
							id: 'menu_showtimeoutalerts',
							checked: this.showTimeoutAlert,
							click() { self.setBoolean('showtimeoutalert', !self.showTimeoutAlert) }
						}
					]
				},
				{
					label: this._tool.i18n.__('Highlights'),
					id: 'menu_highlights',
					submenu: this.create_highlight_menu()
				},
				{
					label: this._tool.i18n.__('Light design mode'),
					type: 'checkbox',
					checked: this.lightDesignMode,
					click() {
						self.setBoolean('lightdesignmode', !self.lightDesignMode)
						if(!self.lightDesignMode) {
							document.querySelector('body').classList.remove('invert')
						} else {
							document.querySelector('body').classList.add('invert')
						}
					}
				}
			])
		})
	}


	/**
	 * Sets the application language to lang. Please don't use this without explicit user interaction.
	 * 
	 * @param {String} lang The short i18n languge description. Currently only en and de are really supported.
	 */
	setLanguage(lang) {
		this.setString('language', lang)

		this._tool.ui.showErrorMessage(new Error('You need to restart TTVStreamerTool for the language change to take effect.'))
	}

	/**
	 * Opens the dialog to add a new highlight.
	 */
	addHighlight() {
		const self = this
		document.querySelector('#highlightdialog').style.display = 'table'
		document.querySelector('#highlightdialog_phrase').value = ''
		this._chrsel = () => { self.checkHighlightRegexSyntax() }
		document.querySelector('#highlightdialog_phrase').addEventListener('keyup', this._chrsel)
		document.querySelector('#highlightdialog_regex').checked = false
		document.querySelector('#highlightdialog_casesensitive').checked = false
	}

	/**
	 * Checks if the regex in the new highlight dialog is valid.
	 * 
	 * @private
	 * @returns {Boolean}
	 */
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

	/**
	 * Hides the dialog to add a new highlight.
	 * 
	 * @private
	 */
	cancelNewHighlight() {
		document.querySelector('#highlightdialog').style.display = 'none'
	}

	/**
	 * Saves the currently entered new Highlight and hides the dialog.
	 * 
	 * @private
	 */
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
			/*for(let i = 0; i < highlights.length; i++) {
				if(highlights[i].id == item.id)
					doesexist = true
			}*/
			if(!doesexist) {
				highlights.push({ phrase: phrase, regex: regex, casesensitive: casesensitive, id: id })
				/*this._tool.ui.getMenuItemById('menu_highlights').submenu.append(new MenuItem({
					label: phrase,
					id: id,
					click(item) { self.removeHighlight(item) }
				}))*/
				this.setJSON('highlights', highlights)
				this.create_highlight_settings()
			}
		}
	}

	/**
	 * Removes a highlight by its menu entry. Will show a confirm dialog to the user.
	 * 
	 * @param {MenuItem} item 
	 * @private
	 */
	removeHighlight(item) {
		if(confirm(this._tool.i18n.__('Are you sure you want do delete this highlight?'))) {
			item.visible = false
			let highlights = this.highlights
			for(var i = 0; i < highlights.length; i++) {
				if(highlights[i].id == item.id) {
					highlights.splice(i, 1)
					this.setJSON('highlights', highlights)
					this.create_highlight_settings()
					break
				}
			}
		}
	}

	/**
	 * Generates a highlight menu template for the menu generation.
	 * 
	 * @returns {Array}
	 * @private
	 */
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

	create_highlight_settings() {
		const self = this

		let content_settings = document.querySelector('#content_settings')
		let settings_set = document.querySelector('#settings_set_highlights > fieldset')

		let linklists = settings_set.querySelectorAll('ul.linklist')
		for(let i = 0; i < linklists.length; i++) {
			settings_set.removeChild(linklists[i])
		}

		let highlights = this.highlights
		let linkList = document.createElement('ul')
		linkList.classList.add('linklist')
		for(var i = 0; i < highlights.length; i++) {
			let listElement = document.createElement('li')
			let aElement = document.createElement('a')
			aElement.innerText = highlights[i].phrase
			let highlightid = highlights[i].id
			aElement.addEventListener('click', () => { self.removeHighlight({ id: highlightid }) })
			listElement.appendChild(aElement)
			linkList.appendChild(listElement)
		}

		settings_set.appendChild(linkList)
	}

	/**
	 * Load a boolean from the localStorage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {Boolean} defaultValue The default value you want returned if storage value was not found
	 */ 
	getBoolean(name, defaultValue) {
		if(name.length <= 0) return defaultValue;
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
	 * Sets a boolean to the localStorage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {Boolean} value The value you want to set
	 */
	setBoolean(name, value) {
		window.localStorage.setItem(name, (value ? 'true' : 'false'))
	}

	/**
	 * Gets a string from the localStorage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {String} defaultValue The default value you want returned if storage value was not found
	 */
	getString(name, defaultValue) {
		if(name.length <= 0) return defaultValue;
		let item = window.localStorage.getItem(name)
		if(item != null) {
			return item
		}

		return defaultValue
	}

	/**
	 * Sets a string to the localStroage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {String} value The value you want to set
	 */
	setString(name, value) {
		window.localStorage.setItem(name, value)
	}

	/**
	 * Gets a object from the localStorage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {Object} defaultValue The default value you want returned if storage value was not found
	 */
	getJSON(name, defaultValue) {
		if(name.length <= 0) return defaultValue;
		let item = window.localStorage.getItem(name)
		if(item != null) {
			try {
				return JSON.parse(item)
			} catch(e) { console.error(e) }
		}
		return defaultValue
	}

	/**
	 * Sets a JSON object to the localStorage.
	 * 
	 * @param {String} name Name of the localStorage value
	 * @param {Object} value The value you want to set
	 */
	setJSON(name, value) {
		try {
			window.localStorage.setItem(name, JSON.stringify(value))
		} catch(e) { console.error(e) }
	}

	/**
	 * Removes an item in the localStorage
	 * 
	 * @param {String} name 
	 */
	remove(name) {
		window.localStorage.removeItem(name)
	}

}

module.exports = ToolSettings