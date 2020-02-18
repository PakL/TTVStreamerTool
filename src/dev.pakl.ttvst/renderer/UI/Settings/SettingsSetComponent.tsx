import * as React from 'react';
import { Icon } from 'office-ui-fabric-react';
import Setting, { ISettingsProps } from './SettingsComponent';
import _ttvst from '../../TTVST';
declare var TTVST: _ttvst;

interface ISettingsSetState {
	collapsed: boolean;
	settings: Array<ISettingsProps>; 
}

interface ISettingsSetProps {
	title: string;
	settings: Array<ISettingsProps>; 
}

class SettingsSetComponent extends React.Component {
	
	state: Readonly<ISettingsSetState>;
	props: Readonly<ISettingsSetProps>;

	constructor(props: Readonly<ISettingsSetProps>) {
		super(props);
		this.state = {
			collapsed: true,
			settings: props.settings
		};
		this.toggleCollapse = this.toggleCollapse.bind(this);
	}

	addSetting(setting: ISettingsProps) {
		this.setState((state: ISettingsSetProps) => ({ settings: state.settings.push(setting) }));
	}

	toggleCollapse() {
		this.setState((state: ISettingsSetState) => ({ collapsed: !state.collapsed }));
	}

	render() {
		let legend = <legend onClick={this.toggleCollapse}>{this.state.collapsed ? <Icon iconName="ExploreContentSingle" /> : <Icon iconName="CollapseContentSingle" />} {TTVST.i18n.__(this.props.title)}</legend>;
		return (
			<fieldset className="settings-set">
				{this.props.title.length > 0 ? legend : []}
				{
					(this.state.collapsed && this.props.title.length > 0) ? [] :
					this.state.settings.map((setting) => (
						<Setting key={setting.setting} {...setting} />
					))
				}
			</fieldset>
		);
	}

}
export = SettingsSetComponent;