import React from 'react';
import { FontIcon } from 'office-ui-fabric-react/lib-commonjs/Icon';
import { mergeStyles } from 'office-ui-fabric-react/lib-commonjs/Styling';

const boldText = mergeStyles({ fontWeight: 'bold' })

interface INavBarState {
	open?: boolean;
}

export class NavBarComponent extends React.Component {

	state: Readonly<INavBarState>;
	navToggle: React.RefObject<HTMLAnchorElement>;

	constructor(props: Readonly<{}>) {
		super(props);
		this.collapseMenu = this.collapseMenu.bind(this);
		this.expandMenu = this.expandMenu.bind(this);
		this.toggleMenu = this.toggleMenu.bind(this);
		this.state = { open: false };
		this.navToggle = React.createRef();

		const self = this;
		document.querySelector('body').addEventListener('click', (e: MouseEvent) => {
			if(!(e.target instanceof HTMLElement)) return;
			if(e.target !== self.navToggle.current && e.target.parentElement !== self.navToggle.current) {
				self.collapseMenu();
			}
		});
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
				</ul>
				

				<ul className="bottom">
					<li><a id="nav-addons"><FontIcon iconName="Puzzle" />Addons</a></li>
					<li><a id="nav-settings"><FontIcon iconName="Settings" />Settings</a></li>
					<li><a id="nav-changelog"><FontIcon iconName="News" />Changelog</a></li>
					<li><a id="nav-about" dir="ltr"><FontIcon iconName="Unknown" />About TTVST</a></li>
				</ul>
			</nav>
		);
	}

}