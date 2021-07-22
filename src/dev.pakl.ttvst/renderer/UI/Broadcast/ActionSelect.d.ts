import * as riot from 'riot';

export declare interface ActionSelectProps {
}
export declare interface ActionSelectState {
}
export declare interface Component<Props = ActionSelectProps, State = ActionSelectState> extends riot.RiotComponent<Props, State> {
	getSelectedActionChannel: () => string;
	getParameterValues: () => any[];
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;