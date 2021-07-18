declare enum EAddonFlag {
	compatible,loaded,updateavailable,
	updating,updateready,updatefailed,
	uninstallready,uninstallfailed,
	installing,installfailed
}
export type AddonFlag = keyof typeof EAddonFlag;
export interface IAddon {
	addonid: string;
	name: string;
	version: string;
	description: string;
	author: {
		email?: string;
		url?: string;
		name: string;
	};
	toolversion: string;
	flags?: Array<AddonFlag>

	// only set if addon is installed
	path?: string; 
	main?: string;
	renderer?: string;
	loaderror?: string;
	updateAvaiable?: string;

	// only set on repositories
	download?: string;
}