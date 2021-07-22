import * as riot from 'riot';
import { IModalButton } from '../UI';

export declare interface ModalProps {
	content: Node|Node[];
	title?: string;
	icon?: string;
	buttons?: IModalButton[];
	onclose?: () => void;
	hideOnOob?: boolean;
}
export declare interface ModalState {
}
export declare interface Component<Props = ModalProps, State = ModalState> extends riot.RiotComponent<Props, State> {
	
}

declare var RiotElement: riot.RiotComponentWrapper<Component>;
export default RiotElement;