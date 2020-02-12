
export interface IAPIv5Options {
	clientid?: string;
	redirectUri?: string;
	scope?: Array<string>;
}

export interface IAPIv5UserFollowOptions {
	limit?: number;
	offset?: number;
	direction?: 'asc' | 'desc';
	sortby?: 'created_at' | 'last_broadcast' | 'login';
}

export interface IAPIv5ChannelUpdateOptions {
	status?: string;
	game?: string;
	delay?: number;
	channel_feed_enabled?: boolean;
}

export interface IAPIv5ChannelFollowersOptions {
	limit?: number;
	offset?: number;
	cursor?: 'string';
	direction?: 'asc' | 'desc';
}

export interface IAPIv5SubscribersOptions {
	limit?: number;
	offset?: number;
	direction?: 'asc' | 'desc';
}

export interface IAPIv5VideosOptions {
	limit?: number;
	offset?: number;
	broadcast_type?: 'archive' | 'highlight' | 'upload' | 'archive,highlight' | 'archive,upload' | 'highlight,upload' | 'archive,highlight,upload';
	language?: string;
	sort?: 'time' | 'views';
}

export interface IAPIv5UserStreamOptions {
	stream_type: 'live' | 'playlist' | 'all';
}

export interface IAPIv5CollectionOptions {
	limit?: number;
	cursor?: string;
	containing_item?: string;
}

export interface IAPIv5User {
	_id: string | number;
	bio: string;
	created_at: string;
	display_name: string;
	logo: string;
	name: string;
	type: string;
	updated_at: string;

	notifications?: {
		email: boolean;
		push: boolean;
	};
	partnered?: boolean;
	twitter_connected?: boolean;
	email?: string;
	email_verified?: boolean;
}

export interface IAPIv5Channel {
	_id: string | number;
	broadcaster_language: string;
	created_at: string;
	display_name: string;
	followers: number;
	game: string;
	language: string;
	logo: string;
	mature: boolean;
	name: string;
	partner: boolean;
	profile_banner: string | null;
	profile_banner_background_color: string | null;
	status: string;
	updated_at: string;
	url: string;
	video_banner: string | null;
	views: number;

	broadcaster_type?: string;
	stream_key?: string;
	email?: string;
}

export interface IAPIv5Follow {
	created_at: string;
	notifications?: boolean;
	channel: IAPIv5Channel;
}

export interface IAPIv5FollowList {
	_total: number;
	follows: Array<IAPIv5Follow>;
}

export interface IAPIv5FollowerList {
	cursor: string;
	_total: number;
	follows: Array<{
		created_at: string;
		notifications?: boolean;
		user: IAPIv5User;
	}>
}

export interface IAPIv5SubscriberList {
	_total: number;
	subscriptions: Array<{
		_id: string;
		created_at: string;
		sub_plan: string;
		sub_plan_name: string;
		user: IAPIv5User;
	}>
}

export interface IAPIv5Video {
	_id: string;
	broadcast_id: number;
	broadcast_type: 'archive' | 'highlight' | 'upload';
	channel: { _id: string | number; display_name: string; name: string; };
	created_at: string;
	description: string;
	description_html: string;
	fps: { chunked?: number; high?: number; low?: number; medium?: number; mobile?: number };
	game: string;
	language: string;
	length: number;
	preview: { large: string; medium: string; small: string; template: string };
	published_at: string;
	resolutions: { chunked?: string; high?: string; low?: string; medium?: string; mobile?: string; };
	status: string;
	tag_list: string;
	thumbnails: {
		large: Array<{ type: string; url: string }>;
		medium: Array<{ type: string; url: string }>;
		small: Array<{ type: string; url: string }>;
		template: Array<{ type: string; url: string }>;
	};
	title: string;
	url: string;
	viewable?: string;
	viewable_at?: string | null;
	views: number;
}
export interface IAPIv5VideoList {
	_total: number;
	videos: Array<IAPIv5Video>;
}

export interface IAPIv5StartCommercial {
	Length: number;
	Message: string;
	RetryAfter: number;
}

export interface IAPIv5BadgeImage {
	alpha: string;
	image: string;
	svg: string;
}
export interface IAPIv5ChannelBadges {
	admin: IAPIv5BadgeImage;
	broadcaster: IAPIv5BadgeImage;
	global_mod: IAPIv5BadgeImage;
	mod: IAPIv5BadgeImage;
	staff: IAPIv5BadgeImage;
	subscriber: IAPIv5BadgeImage | null;
	turbo: IAPIv5BadgeImage;
}

export interface IAPIv5BadgeVersions {
	[version: string]: {
		image_url_1x: string;
		image_url_2x: string;
		image_url_4x: string;
		description: string;
		title: string;
		click_action: 'visit_url' | 'subscribe_to_channel';
		click_url: string;
		last_updated: null;
	}
}
export interface IAPIv5BadgeSets {
	badge_sets: {
		[set: string]: {
			versions: IAPIv5BadgeVersions;
		}
	}
}

export interface IAPIv5Emotesets {
	emoticon_sets: {
		[set: string]: Array<{
			code: string;
			id: number;
		}>;
	}
}

export interface IAPIv5Stream {
	_id: number;
	game: string;
	viewers: number;
	video_height: number;
	average_fps: number;
	delay: number;
	created_at: string;
	is_paylist: boolean;
	preview: {
		small: string;
		medium: string;
		large: string;
		template: string;
	};
	channel: IAPIv5Channel;
}

export interface IAPIv5UserStream {
	stream: null | IAPIv5Stream;
}

export interface IAPIv5StreamList {
	_total: number;
	streams: Array<IAPIv5Stream>;
}

export interface IAPIv5Games {
	games: Array<{
		_id: number;
		box: {
			large: string;
			medium: string;
			small: string;
			template: string;
		};
		giantbomb_id?: number;
		logo?: {
			large: string;
			medium: string;
			small: string;
			template: string;
		};
		name: string;
		poularity?: number;
	}>;
}

export interface IAPIv5Team {
	_id: number;
	background: string;
	banner: string;
	created_at: string;
	display_name: string;
	info: string;
	logo: string;
	name: string;
	updated_at: string;
	users: Array<IAPIv5Channel>;
}

export interface IAPIv5Collections {
	_cursor: string | null;
	collections: Array<{
		_id: string;
		created_at: string;
		items_count: number;
		owner: IAPIv5User;
		thumbnails: {
			large: string;
			medium: string;
			small: string;
			template: string;
		};
		title: string;
		total_duration: number;
		updated_at: string;
		views: number;
	}>;
}

export interface IAPIv5Cheermotes {
	actions: {
		backgrounds: Array<string>;
		prefix: string;
		scales: Array<string>;
		states: Array<string>;
		tiers: Array<{
			color: string;
			id: string;
			images: {
				[background: string]: {
					[state: string]: {
						[scale: string]: string;
					};
				};
			};
			min_bits: number;
		}>;
	};
}

export type IAPIv5Response = any;