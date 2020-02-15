import * as React from 'react';
import * as Fabric from 'office-ui-fabric-react';
import * as Settings from '../../Settings'

interface ISettingsState {
	
}

export interface ISettingsProps {
	setting: string;
	default: string | number | boolean;
	type: string;
	label: string;
	description: string;
	selection?: Fabric.IDropdownOption[];
	onchange?: (ev: any) => void;
	onclick?: (ev: any) => void;

	min?: number;
	max?: number;
	step?: number;
	readonly?: boolean;
	id?: string;
}

export default class SettingsComponent extends React.Component {
	
	state: Readonly<ISettingsState>;
	props: Readonly<ISettingsProps>;

	constructor(props: Readonly<ISettingsProps>) {
		super(props);
		this.state = {};
	}

	render() {
		if(this.props.type === 'separator') {
			return <hr />;
		}

		let input = null;
		let value = Settings.getString(this.props.setting, this.props.default.toString());
		switch(this.props.type) {
			case 'select':
				input = <Fabric.Dropdown label={this.props.label} data-setting={this.props.setting} onChange={this.props.onchange} disabled={this.props.readonly} options={this.props.selection} defaultSelectedKey={value}/>;
				break;
			case 'button':
				input = <Fabric.PrimaryButton text={this.props.label} data-setting={this.props.setting} onClick={this.props.onclick} />;
				break;
			case 'range':
				let numValue = parseFloat(value);
				input = <Fabric.Slider label={this.props.label} data-setting={this.props.setting} defaultValue={numValue} min={this.props.min} max={this.props.max} step={this.props.step} onChange={this.props.onchange} disabled={this.props.readonly} />;
				break;
			case 'number':
				input = <Fabric.SpinButton label={this.props.label} data-setting={this.props.setting} defaultValue={value} min={this.props.min} max={this.props.max} step={this.props.step} onChange={this.props.onchange} disabled={this.props.readonly} />;
				break;
			case 'checkbox':
				let boolValue = Settings.getBoolean(this.props.setting, typeof(this.props.default) === 'boolean' ? this.props.default : false);
				input = <Fabric.Toggle label={this.props.label} data-setting={this.props.setting} defaultChecked={boolValue} onChange={this.props.onchange} disabled={this.props.readonly} inlineLabel />;
				break;

			default:
				input = <Fabric.TextField label={this.props.label} data-setting={this.props.setting} type={this.props.type} defaultValue={value} onChange={this.props.onchange} readOnly={this.props.readonly} />;
				break;
		}
		return (
			<div>
				{input}
				<small>{this.props.description}</small>
			</div>
		);
	}

}