import * as riot from 'riot';
import Page from '../Page';

export declare interface AppProps {
}
export declare interface AppState {
}
export declare interface Component<Props = AppProps, State = AppState> extends riot.RiotComponent<Props, State> {
	openPage: (pagename: string) => void;
	addPage: (page: Page, bottom: boolean) => void;
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;