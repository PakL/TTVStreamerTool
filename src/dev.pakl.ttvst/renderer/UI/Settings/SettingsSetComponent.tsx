import * as React from 'react';
import { Icon } from 'office-ui-fabric-react';
import Setting, { ISettingsProps } from './SettingsComponent';

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
			collapsed: false,
			settings: props.settings
		};
	}

	addSetting(setting: ISettingsProps) {
		this.setState((state: ISettingsSetProps) => {
			return { settings: state.settings.push(setting) };
		});
	}

	render() {
		return (
			<fieldset>
				<legend>{this.state.collapsed ? <Icon iconName="ExploreContentSingle" /> : <Icon iconName="CollapseContentSingle" />} {this.props.title}</legend>
				{
					this.state.settings.map((setting) => (
						<Setting key={setting.setting} {...setting} />
					))
				}
			</fieldset>
		);
	}

}
export = SettingsSetComponent;