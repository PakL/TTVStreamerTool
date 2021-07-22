import * as riot from 'riot';
import { IStatusObject } from '../../../main/Pages/StartpageTypes';

export declare interface StartpageProps {
}
export declare interface StartpageState {
}
export declare interface Component<Props = StartpageProps, State = StartpageState> extends riot.RiotComponent<Props, State> {
	setLoginCallback: (callback: () => void) => void;
	setLogoutCallback: (callback: () => void) => void;
	updateLogin: (state: { waiting?: boolean, loggedin?: boolean, loginName?: string, avatarUrl?: string }) => void;
	updateStatus: (statusObj: IStatusObject) => void;
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;