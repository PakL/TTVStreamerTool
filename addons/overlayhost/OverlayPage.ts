import Page from '../../dist/dev.pakl.ttvst/renderer/UI/Page';
import Broadcast from '../../dist/dev.pakl.ttvst/renderer/Broadcast';
import * as Settings from '../../dist/dev.pakl.ttvst/renderer/Settings';

import * as riot from 'riot';

import SettingsMenu from '../../dist/dev.pakl.ttvst/renderer/UI/Settings/SettingsMenu';
import { ISettingsSetProps } from '../../dist/dev.pakl.ttvst/renderer/UI/Settings/SettingsConfiguration';
import { ipcRenderer } from 'electron';

class OverlayPage extends Page {

	settingsCmpnt: riot.RiotComponent = null;
	settings: Array<ISettingsSetProps> = [
		{
			label: "Host configuration",
			key: "overlayhost.global",
			settings: [
				{ setting: 'overlayhost.global.port', default: 8090, type: 'number', label: 'Port', description: 'The port that the HTTP host will listen on. Restart host after changing to make it take effect!', min: 1025, max: 65535 },
				{ setting: 'overlayhost.global.font', default: '"Segoe UI"', type: 'select', label: 'Default font', description: 'Select the default font that the overlay should use - this previews all installed fonts, it may take a few seconds to open', selection: [{ key: Settings.getString('overlayhost.global.font', '"Segoe UI"'), text: Settings.getString('overlayhost.global.font', '"Segoe UI"') }] },
				{ setting: 'overlayhost.global.fontcolor', default: '#ffffff', type: 'color', label: 'Default font color', description: 'Select the default font color that the overlay should use' },
				{ setting: 'overlayhost.global.borderthick', default: 2, type: 'number', label: 'Default font border thickness', description: 'Select the default font border thickness in pixel', min: 0, max: 100 },
				{ setting: 'overlayhost.global.bordercolor', default: '#000000', type: 'color', label: 'Default font border color', description: 'Select the default font border color that the overlay should use' }
			]
		},
		{
			label: "Music overlay",
			key: "overlayhost.music",
			settings: [
				{ setting: '', default: 'http://localhost:8090/music.html', type: 'text', label: 'Overlay-URL', description: 'Example URL to music overlay. If you changed the host port you\'ll need to make changes accordingly.', readonly: true },
				{ setting: 'overlay_music_playlist', default: 'PLRBp0Fe2Gpglq-J-Hv0p-y0wk3lQk570u', type: 'text', label: 'Youtube playlist id', description: 'Public youtube playlist id to play', oninputchange: this.broadcastPlaylistChange.bind(this) },
				{ setting: 'overlay_music_volume', default: 50, type: 'range', label: 'Volume', description: 'Current music volume', min: 0, max: 100, oninputchange: this.broadcastVolumeChange.bind(this) },
				{ setting: '', default: true, type: 'button', label: 'Skip track', description: 'Skip the current playing track', oninputclick: this.broadcastSkipTrack.bind(this) }
			]
		},
		{
			label: "Countdown overlay",
			key: "overlayhost.countdown",
			settings: [
				{ setting: '', default: 'http://localhost:8090/countdown.html', type: 'text', label: 'Overlay-URL', description: 'Example URL to music overlay. If you changed the host port you\'ll need to make changes accordingly.', readonly: true },

				{ type: 'separator',  setting: '', default: '', label: '', description: '' },
				{ setting: 'overlayhost.countdown.hours', default: 0, type: 'number', label: 'Add hours to countdown', description: 'Adds the amount of hours to the countdown when clicking the button below', min: 0 },
				{ setting: 'overlayhost.countdown.minutes', default: 5, type: 'number', label: 'Add minutes to countdown', description: 'Adds the amount of mminutes to the countdown when clicking the button below', min: 0 },
				{ setting: 'overlayhost.countdown.seconds', default: 0, type: 'number', label: 'Add seconds to countdown', description: 'Adds the amount of seconds to the countdown when clicking the button below', min: 0 },
				{ setting: '', default: true, type: 'button', label: 'Add to countdown', description: 'Add the time entered above to the countdown', oninputclick: this.broadcastAddCountdown.bind(this) },

				{ type: 'separator',  setting: '', default: '', label: '', description: '' },
				{ setting: 'overlayhost.countdown.date', default: '', type: 'date', label: 'Set date destination', description: 'Sets the countdown destination to this specific date' },
				{ setting: 'overlayhost.countdown.time', default: '', type: 'time', label: 'Set time destination', description: 'Sets the countdown destination to this specific time. If no date is set the destination will the very next time (up to 24 hours)' },
				{ setting: '', default: true, type: 'button', label: 'Set as countdown destination', description: 'Add the time entered above to the countdown', oninputclick: this.broadcastSetCountdown.bind(this) }
			]
		}
	];

	constructor() {
		super('Overlays');

		this.updateSettings = this.updateSettings.bind(this);

		Broadcast.instance.on('app.ttvst.overlay.music.volumechange', this.updateSettings);
		Broadcast.instance.on('app.ttvst.overlay.music.playlistchange', this.updateSettings);

		ipcRenderer.invoke('overlayhost.font-list').then(((fonts: Array<string>) => {
			let fontsSelection: Array<{ key: string, text: string, fonteqkey: boolean }> = []
			for(let i = 0; i < fonts.length; i++) {
				let l = fonts[i].replace(/(^"|"$)/g, '');
				fontsSelection.push({ key: fonts[i], text: l, fonteqkey: true });
			}
			this.settings[0].settings[1].selection = fontsSelection;
			this.settingsCmpnt.setSettings(this.settings);
		}).bind(this));
	}

	get icon(): string {
		return 'ArrangeBringForward';
	}

	content(): HTMLElement {
		let settCmpnt = riot.component<null, null>(SettingsMenu);
		this.settingsCmpnt = settCmpnt(document.createElement('SettingsMenu'));

		this.settingsCmpnt.setSettings(this.settings);

		return this.settingsCmpnt.root;
	}

	addSettingsSet(set: ISettingsSetProps) {
		this.settings.push(set);
		this.settingsCmpnt.setSettings(this.settings);
	}

	updateSettings() {
		this.settingsCmpnt.update();
	}

	broadcastPlaylistChange(e: Event) {
		let el: HTMLInputElement = e.currentTarget as HTMLInputElement;
		let playlistid = el.value;
		Broadcast.instance.execute('app.ttvst.overlay.music.setPlaylist', playlistid);
	}

	broadcastVolumeChange(e: Event) {
		let el: HTMLInputElement = e.currentTarget as HTMLInputElement;
		let volume = parseInt(el.value);
		Broadcast.instance.execute('app.ttvst.overlay.music.setVolume', volume, false);
	}

	broadcastSkipTrack() {
		Broadcast.instance.execute('app.ttvst.overlay.music.skipTrack')
	}

	broadcastAddCountdown() {
		Broadcast.instance.execute('app.ttvst.timer.addTime',
			parseInt(Settings.getString('overlayhost.countdown.hours', '0')),
			parseInt(Settings.getString('overlayhost.countdown.minutes', '5')),
			parseInt(Settings.getString('overlayhost.countdown.seconds', '0')));
	}

	broadcastSetCountdown() {
		Broadcast.instance.execute('app.ttvst.timer.setTime',
			Settings.getString('overlayhost.countdown.time', ''),
			Settings.getString('overlayhost.countdown.date', ''));
	}

}
export = OverlayPage;