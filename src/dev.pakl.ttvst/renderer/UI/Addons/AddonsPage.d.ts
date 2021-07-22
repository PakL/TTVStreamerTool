import * as riot from 'riot';
import { IAddon } from '../../../main/Util/AddonsTypes';

export declare interface AddonsPageProps {
}
export declare interface AddonsPageState {
	addons: IAddon[];
}
export declare interface Component<Props = AddonsPageProps, State = AddonsPageState> extends riot.RiotComponent<Props, State> {
	setRepositoryCallback: (callback: (sourcesInput: string) => void) => void;
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;