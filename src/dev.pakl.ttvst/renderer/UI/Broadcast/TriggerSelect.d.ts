import * as riot from 'riot';

export declare interface TriggerSelectProps {
}
export declare interface TriggerSelectState {
}
export declare interface Component<Props = TriggerSelectProps, State = TriggerSelectState> extends riot.RiotComponent<Props, State> {
	getSelectedTriggerChannel: () => string;
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;