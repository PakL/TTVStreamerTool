import React from 'react';
import { FontIcon } from 'office-ui-fabric-react/lib-commonjs/Icon';
import { remote } from 'electron';

interface ITitlebarState {
	title: string;
	maximized: boolean;
}

export class TitlebarComponent extends React.Component {

	state: Readonly<ITitlebarState>;

	constructor(props: Readonly<{}>) {
		super(props);
		const self = this;

		this.closeWindow = this.closeWindow.bind(this);
		this.minimizeWindow = this.minimizeWindow.bind(this);
		this.toggleMaximizeWindow = this.toggleMaximizeWindow.bind(this);

		let window = remote.getCurrentWindow();
		this.state = { title: 'TTVStreamerTool', maximized: window.isMaximized() };
	}

	closeWindow() {
		remote.getCurrentWindow().close();
	}

	minimizeWindow() {
		remote.getCurrentWindow().minimize();
	}

	toggleMaximizeWindow() {
		let window = remote.getCurrentWindow();
		if(window.isMaximized()) {
			window.unmaximize();
			this.setState({ maximized: false });
		} else {
			window.maximize();
			this.setState({ maximized: true });
		}
	}

	render() {
		let maxToggleIcon = (this.state.maximized ? <FontIcon iconName="ChromeRestore" /> : <FontIcon iconName="Stop" style={{fontSize:'14px'}} />)
		return (
			<section className="titlebar">
				<span>{this.state.title}</span>
				<button className="close" onClick={this.closeWindow}><FontIcon iconName="ChromeClose" /></button>
				<button className="maximize" onClick={this.toggleMaximizeWindow}>{maxToggleIcon}</button>
				<button className="minimize" onClick={this.minimizeWindow}><FontIcon iconName="ChromeMinimize" style={{paddingTop:'8px'}} /></button>
			</section>
		);
	}

}