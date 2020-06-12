export interface IStatusObject {
	key: string;
	icon?: string;
	status: 'error' | 'warn' | 'good';
	title?: string;
	info: string;
	buttons?: Array<{
		action: string;
		icon: string;
		title: string;
	}>;
}