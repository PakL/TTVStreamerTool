import { remote } from 'electron';
import React from 'react';
import ReactDOM from 'react-dom';
import { NavBarComponent } from './NavBarComponent';
import { TitlebarComponent } from './TitlebarComponent';
import { initializeIcons } from 'office-ui-fabric-react/lib-commonjs/Icons';
import { loadTheme } from 'office-ui-fabric-react/lib-commonjs/Styling';

loadTheme({
	palette: {
		themePrimary: '#c11153',
		themeLighterAlt: '#080103',
		themeLighter: '#1f030d',
		themeLight: '#3a0519',
		themeTertiary: '#740a31',
		themeSecondary: '#ab0f48',
		themeDarkAlt: '#c82460',
		themeDark: '#d04075',
		themeDarker: '#dd6c95',
		neutralLighterAlt: '#1c040d',
		neutralLighter: '#250711',
		neutralLight: '#340c1a',
		neutralQuaternaryAlt: '#3d1120',
		neutralQuaternary: '#451526',
		neutralTertiaryAlt: '#652a3f',
		neutralTertiary: '#eeeeee',
		neutralSecondary: '#f1f1f1',
		neutralPrimaryAlt: '#f4f4f4',
		neutralPrimary: '#e6e6e6',
		neutralDark: '#f9f9f9',
		black: '#fcfcfc',
		white: '#130208'
	}
});
initializeIcons();

export class UI {

	constructor() {
		let navbar = (
			<React.Fragment>
				<TitlebarComponent />
				<NavBarComponent />
				<div id="contentWrapper">
				</div>
			</React.Fragment>
		);

		ReactDOM.render(navbar, document.querySelector('#wrapper'));
	}

}