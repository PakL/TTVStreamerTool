import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer } from 'electron';
import { initializeIcons } from 'office-ui-fabric-react/lib-commonjs/Icons';
import { loadTheme } from 'office-ui-fabric-react/lib-commonjs/Styling';
import i18n from 'i18n-nodejs';

import TTVST from '../TTVST';
import * as Color from './ColorFunctions';
import languageContext from './LanguageContext';
import NavBarComponent from './Main/NavBarComponent';
import PageComponent from './Main/PageComponent';
import Page from './Page';
import Cockpit from './Cockpit/Startpage';

let accentColor: string = ipcRenderer.sendSync('request-accent-color');
while(Color.hexToLuma(accentColor) < 0.7) {
	accentColor = Color.rgbToHex(Color.increaseBrightness(Color.hexToRGB(accentColor), 1));
}
let accentColorRGB = Color.hexToRGB(accentColor);

console.log(accentColor)
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

let LanguageContext: React.Context<i18n> = null;

class UIComponent extends React.Component {

	props: Readonly<{i18n:i18n}>;
	state: Readonly<{pages:Array<Page>}> = { pages: [] };

	constructor(props: Readonly<{i18n:i18n}>) {
		super(props);
	}

	setPages(pages: Array<Page>) {
		this.setState({ pages });
	}

	render() {
		let navLinks: React.SFCElement<any>[] = []
		let content: React.ReactElement<PageComponent>[] = []
		this.state.pages.forEach((page) => {
			if(page.showInViewsList) {
				navLinks.push(<li key={page.name}><a onClick={UI.openPage} data-name={page.name}>{page.icon}{page.localizedName}</a></li>);
			}
			content.push(page.render());
		});

		return (
			<LanguageContext.Provider value={this.props.i18n}>
				<NavBarComponent>
					{navLinks}
				</NavBarComponent>
				<div id="contentWrapper">
					{content}
				</div>
			</LanguageContext.Provider>
		);
	}

}

class UI {

	private tool: TTVST;
	private mainComponent: UIComponent = null;
	private pages: Array<Page> = [];

	private openPage: Page = null;

	static instance: UI = null;

	constructor(tool: TTVST) {
		this.tool = tool;

		UI.instance = this;

		LanguageContext = languageContext(tool);

		ipcRenderer.invoke('render-sass').then((css) => {
			document.querySelector('#stylesheet').innerHTML = css;
		});

		this.addPage(new Cockpit());

		const self = this
		ReactDOM.render(<UIComponent i18n={this.tool.i18n} ref={(main) => { self.mainComponent = main; }} />, document.querySelector('#wrapper'), () => {
			self.mainComponent.setPages(self.pages);
			UI.openPage({ currentTarget: { dataset: { name: self.pages[0].name } }});
		});
	}


	static openPage(e: { currentTarget: { dataset: DOMStringMap }}) {
		let page = e.currentTarget.dataset.name;
		UI.instance.pages.forEach((p) => {
			if(p.name === page) {
				if(UI.instance.openPage !== null) {
					UI.instance.openPage.close();
				}
				UI.instance.openPage = p;
				p.open();
			}
		})
	}

	addPage(page: Page) {
		this.pages.push(page);
		if(this.mainComponent !== null) {
			this.mainComponent.setPages(this.pages);
		}
	}

}
export = UI;