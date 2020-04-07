export interface TMITags {
	[key: string]: string;
}
export interface TMITagsClearchat extends TMITags {
	'ban-duration'?: string;
}
export interface TMITagsClearmsg extends TMITags {
	login: string;
	message: string;
	'target-msg-id': string;
}
export interface TMITagsGlobaluserstate extends TMITags {
	'badge-info': string;
	badges: string;
	color: string;
	'display-name': string;
	'emote-set': string;
	'user-id': string;
}
export interface TMITagsPrivmsg extends TMITags {
	'badge-info': string;
	badges: string;
	bits?: string;
	color: string;
	'display-name': string;
	emotes: string;
	id: string;
	mod: '0' | '1';
	'room-id': string;
	'tmi-sent-ts': string;
	'user-id': string;
}
export interface TMITagsRoomstate extends TMITags {
	'emote-only'?: '0' | '1';
	'followers-only'?: string;
	r9k?: '0' | '1';
	slow?: string;
	'subs-only'?: string;
}
export interface TMITagsUsernotice extends TMITags {
	'badge-info': string;
	badges: string;
	color: string;
	'display-name': string;
	emotes: string;
	id: string;
	login: string;
	mod: '0' | '1';
	'msg-id': 'sub' | 'resub' | 'subgift' | 'anonsubgift' | 'submysterygift' | 'giftpaidupgrade' | 'rewardgift' | 'anongiftpaidupgrade' | 'raid' | 'unraid' | 'ritual' | 'bitsbadgetier';
	'room-id': string;
	'system-msg': string;
	'tmi-sent-ts': string;
	'user-id': string;

	'msg-param-cumulative-months'?: string;
	'msg-param-displayName'?: string;
	'msg-param-login'?: string;
	'msg-param-months'?: string;
	'msg-param-promo-gift-total'?: string;
	'msg-param-promo-name'?: string;
	'msg-param-recipient-display-name'?: string;
	'msg-param-recipient-id'?: string;
	'msg-param-recipient-user-name'?: string;
	'msg-param-sender-login'?: string;
	'msg-param-sender-name'?: string;
	'msg-param-should-share-streak'?: string;
	'msg-param-streak-months'?: string;
	'msg-param-sub-plan'?: 'Prime' | '1000' | '2000' | '3000';
	'msg-param-sub-plan-name'?: string;
	'msg-param-viewerCount'?: string;
	'msg-param-ritual-name'?: 'new_chatter';
	'msg-param-threshold'?: string;
}
export interface TMITagsUserstate extends TMITags {
	'badge-info': string;
	badges: string;
	color: string;
	'display-name': string;
	'emote-sets': string;
	mod: '0' | '1';
}

export interface TMIPrefix {
	user: string;
	host: string;
}

export interface TMIRaw {
	tags: string;
	prefix: TMIPrefix;
	action: string;
	attach: string;
}

export interface TMIHost {
	channel: string;
	user: string;
	viewers: number;
	message: string;
	tags: TMITags
}

export interface TMIMessage {
	prefix: TMIPrefix;
	user: string;
	channel: string;
	message: string;
	tags: TMITagsPrivmsg;
}

export interface TMIWhisper {
	prefix: TMIPrefix;
	user: string;
	message: string;
	tags: TMITags;
}