import Page from '../Page';
import _ttvst from '../../TTVST';
import * as React from 'react';


import { Card, ICardTokens, ICardSectionStyles, ICardSectionTokens } from '@uifabric/react-cards';
import { FontWeights, FontSizes, getTheme } from '@uifabric/styling';
import { ActionButton, IButtonStyles, Icon, IIconStyles, Image, Persona, Stack, IStackTokens, Text, ITextStyles, PrimaryButton } from 'office-ui-fabric-react';

declare var TTVST: _ttvst;

let theme = getTheme();

let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };
let cardTokens: ICardTokens = { childrenMargin: 10, width: '50%', maxWidth: '50%', childrenGap: 10 };
let smallCardTokens: ICardTokens = { childrenMargin: 5, width: '50%', maxWidth: '50%', childrenGap: 5 };
let headTextStyle: ITextStyles = { root: { fontWeight: FontWeights.semibold }};

let iconStyles: IIconStyles = { root: { color: theme.palette.themePrimary, fontSize: 16, fontWeight: FontWeights.regular, width: '20px', height: '20px', display: 'block', lineHeight: '20px', textAlign: 'center' } };
let footerCardSectionStyles: ICardSectionStyles = { root: { width: '35px', alignSelf: 'stretch', borderLeft: '1px solid ' + theme.palette.neutralQuaternaryAlt } };
let footerCardSectionTokens: ICardSectionTokens = { padding: '3px 5px 3px 10px' };

let GoodConditionIcon: React.CSSProperties = {
	display: 'block',
	width: '70px',
	height: '100%',
	minHeight: '70px',
	backgroundColor: '#16631a',
	fontSize: '32px',
	textAlign: 'center',
	lineHeight: '70px',
	borderRadius: '2px'
};
let BadConditionIcon: React.CSSProperties = {
	display: 'block',
	width: '70px',
	height: '100%',
	minHeight: '70px',
	backgroundColor: '#632016',
	fontSize: '32px',
	textAlign: 'center',
	lineHeight: '70px',
	borderRadius: '2px'
};
let WarnConditionIcon: React.CSSProperties = {
	display: 'block',
	width: '70px',
	height: '100%',
	minHeight: '70px',
	backgroundColor: '#afc12b',
	fontSize: '32px',
	textAlign: 'center',
	lineHeight: '70px',
	color: '#000000',
	borderRadius: '2px'
};

class Startpage extends Page {
	
	constructor() {
		super('Cockpit');
	}

	get icon(): React.ReactElement {
		return <Icon iconName="CannedChat" />;
	}

	content(): React.SFCElement<any> | React.SFCElement<any>[] {
		theme = getTheme();
		iconStyles.root = Object.assign(iconStyles.root, { color: theme.palette.themePrimary });
		footerCardSectionStyles.root = Object.assign(footerCardSectionStyles.root, { borderLeft: '1px solid ' + theme.palette.neutralQuaternaryAlt });

		return [(
			<Stack key="cockpit_login" tokens={sectionStackTokens} horizontal horizontalAlign="center">
				<Card tokens={cardTokens} horizontal>
					<Card.Item fill>
						<Image src="https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png" height="150px" width="150px" />
					</Card.Item>
					<Card.Section>
						<Text styles={headTextStyle}>{this.__('Not logged in')}</Text>
						<Text variant="small">{this.__('Please log in to twitch to use the TTVStreamerTool to its full potential.')}</Text>
						<PrimaryButton text={this.__('Login via Twitch')} />
					</Card.Section>
				</Card>
			</Stack>
		),(
			<Stack key="cockpit_controls_r1" tokens={sectionStackTokens} horizontal>
				<Card tokens={smallCardTokens} horizontal>
					<Card.Item fill>
						<Icon iconName="CannedChat" style={WarnConditionIcon} />
					</Card.Item>
					<Card.Section className="cockpit-control-middle">
						<Text variant="small" styles={headTextStyle}>{this.__('Twitch Messaging Interface (TMI)')}</Text>
						<Text variant="small">{this.__('Connection available. Waiting for user login.')}</Text>
					</Card.Section>
					<Card.Section styles={footerCardSectionStyles} tokens={footerCardSectionTokens}>
						<Icon iconName="Refresh" styles={iconStyles} />
					</Card.Section>
				</Card>
				<Card tokens={smallCardTokens} horizontal></Card>
			</Stack>
		),(
			<Stack key="cockpit_controls_r2" tokens={sectionStackTokens} horizontal>
				<Card tokens={smallCardTokens} horizontal>
					<Card.Item fill>
						<Icon iconName="MapLayers" style={GoodConditionIcon} />
					</Card.Item>
					<Card.Section className="cockpit-control-middle">
						<Text variant="small" styles={headTextStyle}>{this.__('Overlay Service')}</Text>
						<Stack.Item grow={1}><span /></Stack.Item>
						<Text variant="small">{this.__('Running and listening to port {{port}}.', { port: '8090' })}</Text>
					</Card.Section>
					<Card.Section styles={footerCardSectionStyles} tokens={footerCardSectionTokens}>
						<Icon iconName="Refresh" styles={iconStyles} />
					</Card.Section>
				</Card>
				<Card tokens={smallCardTokens} horizontal>
					<Card.Item fill>
						<Icon iconName="MapLayers" style={BadConditionIcon} />
					</Card.Item>
					<Card.Section className="cockpit-control-middle">
						<Text variant="small" styles={headTextStyle}>{this.__('Overlay Command Socket')}</Text>
						<Text variant="small">{this.__('Failed to bind port {{port}}.', { port: '8091' })}</Text>
					</Card.Section>
					<Card.Section styles={footerCardSectionStyles} tokens={footerCardSectionTokens}>
						<Icon iconName="Refresh" styles={iconStyles} />
						<Stack.Item grow={1}><span /></Stack.Item>
						<Icon iconName="Play" styles={iconStyles} />
					</Card.Section>
				</Card>
			</Stack>
		)];
	}

}

export = Startpage;