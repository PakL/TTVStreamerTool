export interface IStatusObject {
	key: string;
	icon?: string;
	status: 'error' | 'warn' | 'good' | 'remove';
	title?: string;
	info: string;
	infoValues?: { [key: string]: string|number };
	buttons?: Array<{
		action: string;
		icon: string;
		title: string;
	}>;
}