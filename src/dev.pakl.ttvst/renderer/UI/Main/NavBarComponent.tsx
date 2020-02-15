import React from 'react';
import { FontIcon } from 'office-ui-fabric-react/lib-commonjs/Icon';
import { mergeStyles } from 'office-ui-fabric-react/lib-commonjs/Styling';
import i18n from 'i18n-nodejs';
import languageContext from './../LanguageContext';

const boldText = mergeStyles({ fontWeight: 'bold' })

interface INavBarState {
	open?: boolean;
}

class NavBarComponent extends React.Component {

	static contextType: React.Context<i18n> = null;

	state: Readonly<INavBarState>;
	navToggle: React.RefObject<HTMLAnchorElement>;

	constructor(props: Readonly<{}>) {
		super(props);
		this.collapseMenu = this.collapseMenu.bind(this);
		this.expandMenu = this.expandMenu.bind(this);
		this.toggleMenu = this.toggleMenu.bind(this);
		this.state = { open: false };
		this.navToggle = React.createRef();

		NavBarComponent.contextType = languageContext();

		const self = this;
		document.querySelector('body').addEventListener('click', (e: MouseEvent) => {
			if(!(e.target instanceof HTMLElement)) return;
			if(e.target !== self.navToggle.current && e.target.parentElement !== self.navToggle.current) {
				self.collapseMenu();
			}
		});
	}

	__(str: string): string {
		return this.context.__(str);
	}

	collapseMenu() {
		this.setState({ open: false });
	}

	expandMenu() {
		this.setState({ open: true });
	}

	toggleMenu() {
		this.setState((state: Readonly<INavBarState>, props) => {
			return { open: !state.open };
		});
	}

	render() {
		let navClasses = 'side-nav' + (!this.state.open ? ' collapsed' : '');

		return (
			<nav className={navClasses}>
				<ul id="nav-main-menu">
					<li><a ref={this.navToggle} className="menu-collapse" onClick={this.toggleMenu}><FontIcon iconName="GlobalNavButton" /><span className={boldText}>TTVStreamerTool</span></a></li>

					{this.props.children}
				</ul>
				<ul className="bottom">
					<li><a id="nav-addons"><FontIcon iconName="Puzzle" />{this.__('Addons')}</a></li>
					<li><a id="nav-settings" data-name="Settings"><FontIcon iconName="Settings" />{this.__('Settings')}</a></li>
					<li><a id="nav-changelog"><FontIcon iconName="News" />{this.__('Changelog')}</a></li>
					<li><a id="nav-about"><FontIcon iconName="Unknown" />{this.__('About TTVST')}</a></li>
				</ul>
			</nav>
		);
	}

}

export = NavBarComponent;