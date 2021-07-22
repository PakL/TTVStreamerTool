import * as riot from 'riot';
import { ISettingsSetProps } from './SettingsConfiguration';

export declare interface SettingsMenuProps {
}
export declare interface SettingsMenuState {
}
export declare interface Component<Props = SettingsMenuProps, State = SettingsMenuState> extends riot.RiotComponent<Props, State> {
	resetSets: () => void;
	setSettings: (settingsSets: ISettingsSetProps[]) => void;
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;