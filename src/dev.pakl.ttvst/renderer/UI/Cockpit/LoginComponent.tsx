import * as React from 'react';
import _ttvst from '../../TTVST';

import { Card, ICardTokens } from '@uifabric/react-cards';
import { FontWeights } from '@uifabric/styling';
import { Image, Stack, IStackTokens, Text, ITextStyles, PrimaryButton } from 'office-ui-fabric-react';


let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };
let cardTokens: ICardTokens = { childrenMargin: 10, width: '50%', maxWidth: '50%', childrenGap: 10 };
let headTextStyle: ITextStyles = { root: { fontWeight: FontWeights.semibold }};

declare var TTVST: _ttvst;

class LoginComponent extends React.Component {

	render() {
		let __ = TTVST.i18n.__;

		return (
			<Stack key="cockpit_login" tokens={sectionStackTokens} horizontal horizontalAlign="center">
				<Card tokens={cardTokens} horizontal>
					<Card.Item fill>
						<Image src="https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png" height="150px" width="150px" />
					</Card.Item>
					<Card.Section>
						<Text styles={headTextStyle}>{__('Not logged in')}</Text>
						<Text variant="small">{__('Please log in to twitch to use the TTVStreamerTool to its full potential.')}</Text>
						<PrimaryButton text={__('Login via Twitch')} />
					</Card.Section>
				</Card>
			</Stack>
		);
	}

}
export = LoginComponent;