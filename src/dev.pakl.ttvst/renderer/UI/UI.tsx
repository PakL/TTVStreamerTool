import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer } from 'electron';
import { initializeIcons } from 'office-ui-fabric-react/lib-commonjs/Icons';
import { loadTheme } from 'office-ui-fabric-react/lib-commonjs/Styling';

import TTVST from '../TTVST';
import * as Color from './ColorFunctions';
import languageContext from './LanguageContext';
import NavBarComponent from './Main/NavBarComponent';
import UIPageComponent from './Main/PageComponent';

let accentColor: string = ipcRenderer.sendSync('request-accent-color');
while(Color.hexToLuma(accentColor) < 0.5) {
	accentColor = Color.rgbToHex(Color.increaseBrightness(Color.hexToRGB(accentColor), 1));
}
let accentColorRGB = Color.hexToRGB(accentColor);

loadTheme({
	palette: {
		themeDarker: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, -30)),
		themeDark: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, -20)),
		themeDarkAlt: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, -10)),
		themePrimary: '#' + accentColor,
		themeSecondary: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, 20)),
		themeTertiary: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, 40)),
		themeLight: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, 60)),
		themeLighter: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, 80)),
		themeLighterAlt: '#' + Color.rgbToHex(Color.increaseBrightness(accentColorRGB, 95)),

		black: '#f8f8f8',
		neutralDark: '#f4f4f4',
		neutralPrimary: '#ffffff',
		neutralPrimaryAlt: '#dadada',
		neutralSecondary: '#d0d0d0',
		neutralTertiary: '#c8c8c8',
		white: '#121212',

		neutralTertiaryAlt: '#656565',
		neutralQuaternary: '#454545',
		neutralQuaternaryAlt: '#3d3d3d',
		neutralLight: '#343434',
		neutralLighter: '#252525',
		neutralLighterAlt: '#1c1c1c',
	}
});
initializeIcons();

class UI {

	private tool: TTVST;
	page: UIPageComponent;

	constructor(tool: TTVST) {
		this.tool = tool;

		const LanguageContext = languageContext(tool);

		ipcRenderer.invoke('render-sass').then((css) => {
			document.querySelector('#stylesheet').innerHTML = css;
		});

		const self = this
		let firstPage = <UIPageComponent ref={(page) => { self.page = page; }} />;

		let content = (
			<LanguageContext.Provider value={this.tool.i18n}>
				<NavBarComponent />
				<div id="contentWrapper">
					{firstPage}
				</div>
			</LanguageContext.Provider>
		);

		ReactDOM.render(content, document.querySelector('#wrapper'));
	}


}
export = UI;