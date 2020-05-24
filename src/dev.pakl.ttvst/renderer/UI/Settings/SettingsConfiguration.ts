export interface ISettingsSetProps {
	label: string;
	key: string;
	settings: Array<ISettingsProps>;
}


export interface ISettingsProps {
	setting: string;
	default: string | number | boolean;
	type: 'select' | 'toggle' | 'checkbox' | 'separator' | 'text' | 'password' | 'number' | 'slider';
	label: string;
	description: string;
	selection?: Array<{ key: string, text: string }>;
	onchange?: (ev: any) => void;
	onclick?: (ev: any) => void;

	min?: number;
	max?: number;
	step?: number;
	readonly?: boolean;
	id?: string;
}

import * as Settings from '../../Settings'

const config: Array<ISettingsSetProps> = [
	{
		label: 'Global',
		key: 'ttvst.global',
		settings: [
			{ setting: 'language', label: 'Language', type: 'select', selection: [{ key: 'en', text: 'English' }, { key: 'de', text: 'Deutsch' }], default: Settings.language(), description: '' },
			{ setting: 'debug-enabled', label: 'Debug logging enabled', type: 'toggle', default: false, description: 'Enabling will result in a higher memory usage. This is only for debugging purposes.' }
		]
	},
	{
		label: 'Cockpit options',
		key: 'ttvst.cockpit',
		settings: [
			{ setting: 'autorecovermessages', label: 'Autorecover deleted messages', type: 'checkbox', default: false, description: '' },
			{ setting: 'showlocalizednames', label: 'Show localized display names', type: 'checkbox', default: true, description: '' },
			{ setting: 'colorlessnames', label: 'Do not use different colors for user names in chat', type: 'checkbox', default: false, description: '' },
			{ setting: 'showviewerlist', label: 'Show viewer list', type: 'checkbox', default: true, description: '' },
			{ setting: 'showactionstream', label: 'Show action stream', type: 'checkbox', default: true, description: '' },
			{ setting: 'showviewersamount', label: 'Show amount of viewers', type: 'checkbox', default: true, description: '' },
			{ setting: 'classicchat', label: 'Classic chat', type: 'checkbox', default: false, description: 'Instead of positioning messages below the username and aligning badges to the right, this mode will give you a more classic twitch look, with badges in front of usernames and messages direcly inline.' },
			{ setting: 'chattotop', label: 'Show newest messages on top', type: 'checkbox', default: false, description: 'Instead of adding new messages to the bottom, new messages will be added to the top of chat.' },
			{ setting: 'embedchat', label: 'Embed chat', type: 'toggle', default: false, description: 'Embed the orginal twitch chat instead of using the build in one. Some features will not work, like filters, custom emote addons, highlights, etc.' }
		]
	},
	{
		label: 'Chat filter',
		key: 'ttvst.chat',
		settings: [
			{ setting: 'filteremotespam', label: 'Filter emote spam', type: 'checkbox', default: false, description: 'This filters out any messages that are only emotes.' },
			{ setting: 'showemotestream', label: 'Show emote stream instead', type: 'checkbox', default: false, description: 'Now that we have no emote spam you can display emotes in a single row stream below the chat to still get a feealing for the chat.' },
			{ setting: 'filterbotcommands', label: 'Filter bot commands', type: 'checkbox', default: false, description: 'This filters out any messages beginning with an exclamation mark (!) and messages by known bots (Moobot, StreamElements, etc.).' },
			{ setting: 'filteruserlist', label: 'Filter user', type: 'text', default: '', description: 'List users (or bots) that should be filtered. Comma seperated.' },
			{ setting: 'filtersubscriptions', label: 'Filter subscription messages', type: 'checkbox', default: false, description: 'This filters out subscription messages from chat. They will still be displayed in the action stream if not disabled below.' }
		]
	},
	{
		label: 'Alert options',
		key: 'ttvst.alerts',
		settings: [
			{ setting: 'flashactions', label: 'Flash alerts', type: 'checkbox', default: true, description: '' },
			{ setting: '', label: '', type: 'separator', default: false, description: '' },
			{ setting: 'showfollowalert', label: 'Show follow alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showsubscriptionalert', label: 'Show subscription alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showraidalert', label: 'Show raid alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showhostalert', label: 'Show host alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showbanalert', label: 'Show ban alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showtimeoutalert', label: 'Show timeout alerts', type: 'checkbox', default: true, description: '' },
			{ setting: 'showcheeralert', label: 'Show cheer alerts', type: 'checkbox', default: true, description: '' }
		]
	}
];

export default config;