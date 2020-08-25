export interface ISettingsSetProps {
	label: string;
	key: string;
	settings: Array<ISettingsProps>;
}


export interface ISettingsProps {
	setting: string;
	default: string | number | boolean;
	type: 'description' | 'select' | 'toggle' | 'checkbox' | 'separator' | 'text' | 'password' | 'number' | 'range' | 'button' | 'color' | 'date' | 'time' | 'datetime-local' | 'custom';
	label: string;
	description: string;
	selection?: Array<{ key: string, text: string, fonteqkey?: boolean }>;
	oninputchange?: (ev: any) => void;
	oninputclick?: (ev: any) => void;

	min?: number;
	max?: number;
	step?: number;
	readonly?: boolean;
	id?: string;
	custom_input?: HTMLElement;
}

import * as Settings from '../../Settings'

const config: Array<ISettingsSetProps> = [
	{
		label: 'Global',
		key: 'ttvst.global',
		settings: [
			{ setting: 'language', label: 'Language', type: 'select', selection: [{ key: 'en', text: 'English' }, { key: 'de', text: 'Deutsch' }], default: Settings.language(), description: '' }
		]
	}
];

export default config;