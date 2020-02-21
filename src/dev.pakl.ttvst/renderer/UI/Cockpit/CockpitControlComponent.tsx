import * as React from 'react';
import _ttvst from '../../TTVST';

import { Card, ICardTokens, ICardSectionStyles, ICardSectionTokens } from '@uifabric/react-cards';
import { FontWeights, getTheme } from '@uifabric/styling';
import { Icon, IIconStyles, Text, ITextStyles } from 'office-ui-fabric-react';

let theme = getTheme();

let smallCardTokens: ICardTokens = { childrenMargin: 5, width: '50%', maxWidth: '50%', childrenGap: 5 };
let headTextStyle: ITextStyles = { root: { fontWeight: FontWeights.semibold }};

let iconStyles: IIconStyles = { root: { color: theme.palette.themePrimary, fontSize: 16, fontWeight: FontWeights.regular, width: '20px', height: '20px', display: 'block', lineHeight: '20px', textAlign: 'center' } };
let footerCardSectionStyles: ICardSectionStyles = { root: { width: '35px', alignSelf: 'stretch', borderLeft: '1px solid ' + theme.palette.neutralQuaternaryAlt } };
let footerCardSectionTokens: ICardSectionTokens = { padding: '3px 5px 3px 10px' };

const ConditionIcon: React.CSSProperties = {
	display: 'block',
	width: '70px',
	height: '100%',
	minHeight: '70px',
	fontSize: '32px',
	textAlign: 'center',
	lineHeight: '70px',
	borderRadius: '2px'
}
const GoodConditionIcon: React.CSSProperties = Object.assign({}, ConditionIcon, { backgroundColor: '#16631a' });
const BadConditionIcon:  React.CSSProperties = Object.assign({}, ConditionIcon, { backgroundColor: '#632016' });
const WarnConditionIcon: React.CSSProperties = Object.assign({}, ConditionIcon, { backgroundColor: '#afc12b', color: '#000000' });

declare var TTVST: _ttvst;

interface ICockpitControlProps {
	startingCondition?: 'bad' | 'warn' | 'good';
	startingStatus?: string;
	startingButtons?: Array<'start' | 'pause' | 'stop' | 'refresh' | 'menu'>;
	header: string;
	iconName: string;

	onStart?: (ev: any) => void;
	onPause?: (ev: any) => void;
	onStop?: (ev: any) => void;
	onRefresh?: (ev: any) => void;
	onMenu?: (ev: any) => void;
}

interface ICockpitControlState {
	condition: 'bad' | 'warn' | 'good';
	status: string;
	buttons: Array<'start' | 'pause' | 'stop' | 'refresh' | 'menu'>;
	iconName: string;
}

class CockpitControlComponent extends React.Component {

	props: Readonly<ICockpitControlProps>;
	state: Readonly<ICockpitControlState>;

	constructor(props: Readonly<ICockpitControlProps>) {
		super(props);

		this.state = {
			condition: (props.startingCondition ? props.startingCondition : 'warn'),
			status: (props.startingStatus ? props.startingStatus : ''),
			buttons: (props.startingButtons ? props.startingButtons : []),
			iconName: props.iconName
		}
	}

	render() {
		let __ = TTVST.i18n.__;

		theme = getTheme();
		Object.assign(iconStyles.root, { color: theme.palette.themePrimary });
		Object.assign(footerCardSectionStyles.root, { borderLeft: '1px solid ' + theme.palette.neutralQuaternaryAlt });

		let condition = WarnConditionIcon;
		switch(this.state.condition) {
			case 'bad': condition = BadConditionIcon; break;
			case 'good': condition = GoodConditionIcon; break;
		}

		let status = this.state.status.trim();
		if(status.length <= 0) status = __('Unkown status');

		return (
			<Card tokens={smallCardTokens} horizontal>
				<Card.Item fill>
					<Icon iconName={this.state.iconName} style={condition} />
				</Card.Item>
				<Card.Section className="cockpit-control-middle">
					<Text variant="small" styles={headTextStyle}>{this.props.header}</Text>
					<Text variant="small">{this.state.status}</Text>
				</Card.Section>
				<Card.Section styles={footerCardSectionStyles} tokens={footerCardSectionTokens}>
					<Icon iconName="Refresh" styles={iconStyles} />
				</Card.Section>
			</Card>
		);
	}

}
export = CockpitControlComponent;