import * as React from 'react';
import _ttvst from '../../TTVST';

import { Card, ICardTokens } from '@uifabric/react-cards';
import { FontWeights } from '@uifabric/styling';
import { Image, Stack, IStackTokens, Text, ITextStyles, PrimaryButton } from 'office-ui-fabric-react';


let sectionStackTokens: IStackTokens = { childrenGap: 10, padding: 10 };
let cardTokens: ICardTokens = { childrenMargin: 10, width: '50%', maxWidth: '50%', childrenGap: 10 };
let headTextStyle: ITextStyles = { root: { fontWeight: FontWeights.semibold }};

declare var TTVST: _ttvst;

interface ILoginState {
	imageUrl: string;
	username: string;
	text: string;
	loggedIn: boolean;
}

class LoginComponent extends React.Component {

	state: Readonly<ILoginState>;

	constructor(props: Readonly<{}>) {
		super(props);

		this.onLogin = this.onLogin.bind(this);
		this.onEnter = this.onEnter.bind(this);

		this.state = {
			imageUrl: '',
			username: 'Not logged in',
			text: 'Please log in to twitch to use the TTVStreamerTool to its full potential.',
			loggedIn: false
		}
	}

	onLogin() {

	}

	onEnter() {

	}

	render() {
		let __ = TTVST.i18n.__;

		let imgUrl = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png';
		if(this.state.imageUrl.length > 0) {
			imgUrl = this.state.imageUrl;
		}

		return (
			<Stack key="cockpit_login" tokens={sectionStackTokens} horizontal horizontalAlign="center">
				<Card tokens={cardTokens} horizontal>
					<Card.Item fill>
						<Image src={imgUrl} height="120px" width="120px" />
					</Card.Item>
					<Card.Section>
						<Text styles={headTextStyle}>{__(this.state.username)}</Text>
						<Text variant="small">{__(this.state.text)}</Text>
						{!this.state.loggedIn ? <PrimaryButton text={__('Login via Twitch')} onClick={this.onLogin} /> : <PrimaryButton text={__('Enter Channel')} onClick={this.onEnter} />}
					</Card.Section>
				</Card>
			</Stack>
		);
	}

}
export = LoginComponent;