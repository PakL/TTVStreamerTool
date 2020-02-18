import * as React from 'react';
import * as Fabric from 'office-ui-fabric-react';
import { getTheme } from '@uifabric/styling';
import * as Settings from '../../Settings'
import _ttvst from '../../TTVST';
declare var TTVST: _ttvst;

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

		let theme = getTheme();
		let input = null;
		let value = Settings.getString(this.props.setting, this.props.default.toString());
		switch(this.props.type) {
			case 'select':
				input = <Fabric.Dropdown label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} onChange={this.props.onchange} disabled={this.props.readonly} options={this.props.selection} defaultSelectedKey={value}/>;
				break;
			case 'button':
				input = <Fabric.PrimaryButton text={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} onClick={this.props.onclick} />;
				break;
			case 'range':
				let numValue = parseFloat(value);
				input = <Fabric.Slider label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} defaultValue={numValue} min={this.props.min} max={this.props.max} step={this.props.step} onChange={this.props.onchange} disabled={this.props.readonly} />;
				break;
			case 'number':
				input = <Fabric.SpinButton label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} defaultValue={value} min={this.props.min} max={this.props.max} step={this.props.step} onChange={this.props.onchange} disabled={this.props.readonly} />;
				break;
			case 'checkbox':
				let checkValue = Settings.getBoolean(this.props.setting, typeof(this.props.default) === 'boolean' ? this.props.default : false);
				input = <Fabric.Checkbox label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} defaultChecked={checkValue} onChange={this.props.onchange} disabled={this.props.readonly} />;
				break;
			case 'toggle':
				let toggleValue = Settings.getBoolean(this.props.setting, typeof(this.props.default) === 'boolean' ? this.props.default : false);
				input = <Fabric.Toggle label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} onText={TTVST.i18n.__('On')} offText={TTVST.i18n.__('Off')} defaultChecked={toggleValue} onChange={this.props.onchange} disabled={this.props.readonly} inlineLabel styles={{ root: { marginBottom: 0 } }} />;
				break;

			default:
				input = <Fabric.TextField label={TTVST.i18n.__(this.props.label)} data-setting={this.props.setting} type={this.props.type} defaultValue={value} onChange={this.props.onchange} readOnly={this.props.readonly} />;
				break;
		}
		return (
			<div>
				{input}
				<small style={{ color: theme.palette.themeLight }}>{TTVST.i18n.__(this.props.description)}</small>
			</div>
		);
	}

}