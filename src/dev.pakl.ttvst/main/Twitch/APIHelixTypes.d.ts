export interface IAPIHelixOptions {
	clientid?: string;
	redirectUri?: string;
	scope?: Array<string>;
}

export interface IAPIHelixUserOptions {
	id?: string | Array<string>;
	login?: string | Array<string>;
}

export interface IAPIHelixStreamOptions {
	after?: string;
	before?: string;
	community_id?: string | Array<string>;
	first?: number;
	game_id?: string | Array<string>;
	language?: string | Array<string>;
	user_id?: string | Array<string>;
	user_login?: string | Array<string>;
}

export interface IAPIHelixStreamMarkerOptions {
	user_id: string;
	description?: string;
}

export interface IAPIHelixClipsOptions {
	id?: string | Array<string>;
	broadcaster_id?: string;
	game_id?: string;
	after?: string;
	before?: string;
	ended_at?: string;
	first?: number;
	started_at?: string;
}

export interface IAPIHelixPagination {
	total?: number;
	pagination: {
		cursor: string;
	}
}

export interface IAPIHelixUser {
	id: string;
	login: string;
	display_name: string;
	type: 'staff' | 'admin' | 'global_mod' | '';
	broadcaster_type: 'partner' | 'affiliate' | '';
	description: string;
	profile_image_url: string;
	offline_image_url: string;
	view_count: number;
	email?: string;
}

export interface IAPIHelixUserList {
	data: Array<IAPIHelixUser>;
}

export interface IAPIHelixFollowObject {
	from_id: string;
	from_name: string;
	to_id: string;
	to_name: string;
	followed_at: string;
}
export interface IAPIHelixFollows extends IAPIHelixPagination { data: Array<IAPIHelixFollowObject>; }

export interface IAPIHelixStreamObject {
	id: string;
	user_id: string;
	user_name: string;
	game_id: string;
	game_name: string;
	type: 'live' | '';
	title: string;
	viewer_count: number;
	started_at: string;
	language: string;
	thumbnail_url: string;
	tag_ids: Array<string>;
}
export interface IAPIHelixStreams extends IAPIHelixPagination { data: Array<IAPIHelixStreamObject>; }

export interface IAPIHelixStreamMarker {
	data: {
		id: number;
		created_at: string;
		description: string;
		position_seconds: number;
	}
}

export interface IAPIHelixClipObject {
	id: string;
	url: string;
	embed_url: string;
	broadcaster_id: string;
	broadcaster_name: string;
	creator_id: string;
	creator_name: string;
	video_id: string;
	game_id: string;
	language: string;
	title: string;
	view_count: number;
	created_at: string;
	thumbnail_url: string;
}
export interface IAPIHelixClips { data: Array<IAPIHelixClipObject>; }

export interface IAPIHelixCategoryObject {
	box_art_url: string,
	id: string,
	name: string
}
export interface IAPIHelixGames extends IAPIHelixPagination { data: Array<IAPIHelixCategoryObject> }
export interface IAPIHelixSearchCategories extends IAPIHelixPagination { data: Array<IAPIHelixCategoryObject> }

export interface IAPIHelixChannelObject {
	broadcaster_id: string;
	broadcaster_name: string;
	broadcaster_language: string;
	game_id: string;
	game_name: string;
	title: string;
}
export interface IAPIHelixChannel { data: Array<IAPIHelixChannelObject> }

export interface IAPIHelixChannelPatchOptions {
	game_id?: string;
	broadcaster_language?: string;
	title?: string;
}

export interface IAPIHelixValidation {
	client_id: string;
	login: string;
	scopes: Array<string>;
	user_id: string;
}

export type IAPIHelixResponse = any;