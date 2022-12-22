

interface IEventSubMetaCore {
	message_id: string,
	message_type: 'session_welcome'|'session_keepalive'|'session_reconnect',
	message_timestamp: string
}
interface IEventSubMetaNotification {
	message_id: string,
	message_type: 'notification'|'revocation',
	message_timestamp: string
	subscription_type: string,
	subscription_version: string
}

export type IEventSubMetadata = IEventSubMetaCore|IEventSubMetaNotification

export interface IEventSubSessionPayload {
	session: {
		id: string,
		status: 'connected'|'reconnecting',
		connected_at: string,
		keepalive_timeout_seconds: number,
		reconnect_url: null|string
	}
}

export interface IEventSubSubscriptionPayload {
	subscription: {
		id: string,
		status: string,
		type: string,
		version: string,
		cost: number,
		condition: any,
		transport: {
			method: 'websocket',
			session_id: string
		},
		created_at: string
	}
}

interface IUser {
	user_id: string,
	user_login: string,
	user_name: string
}
interface IBroadcaster {
	broadcaster_user_id: string,
	broadcaster_user_login: string,
	broadcaster_user_name: string
}
interface IModerator {
	moderator_user_id: string,
	moderator_user_login: string,
	moderator_user_name: string
}

export interface IEventSubChannelBanEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & IModerator & {
		reason: string,
		banned_at: string,
		ends_at: string|null,
		is_permanent: boolean
	}
}
export interface IEventSubChannelSubscribeEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		tier: string,
		is_gift: boolean
	} 
}
export interface IEventSubChannelCheerEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		is_anonymous: boolean,
		message: string,
		bits: number
	} 
}
export interface IEventSubChannelUpdateEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		title: string,
		language: string,
		category_id: string,
		category_name: string,
		is_mature: boolean
	} 
}
export interface IEventSubChannelUnbanEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & IModerator
}
export interface IEventSubChannelFollowEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		followed_at: string
	}
}
export interface IEventSubChannelRaidEventPayload extends IEventSubSubscriptionPayload {
	event: {
		from_broadcaster_user_id: string,
		from_broadcaster_user_login: string,
		from_broadcaster_user_name: string,
		to_broadcaster_user_id: string,
		to_broadcaster_user_login: string,
		to_broadcaster_user_name: string,
		viewers: number
	}
}
export interface IEventSubChannelModeratorAddEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster
}
export interface IEventSubChannelModeratorRemoveEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster
}
export interface IEventSubChannelPollBeginEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		title: string,
		choices: Array<{
			id: string,
			title: string,
			bits_votes?: number,
			channel_points_votes: number,
			votes: number
		}>,
		bits_voting?: {
			is_enabled: boolean,
			amount_per_vote: number
		},
		channel_points_voting: {
			is_enabled: boolean,
			amount_per_vote: number
		},
		started_at: string,
		ends_at: string
	}
}
export interface IEventSubChannelPollProgressEventPayload extends IEventSubChannelPollBeginEventPayload {}
export interface IEventSubChannelPollEndEventPayload {
	event: IBroadcaster & {
		id: string,
		title: string,
		choices: Array<{
			id: string,
			title: string,
			bits_votes?: number,
			channel_points_votes: number,
			votes: number
		}>,
		bits_voting?: {
			is_enabled: boolean,
			amount_per_vote: number
		},
		channel_points_voting: {
			is_enabled: boolean,
			amount_per_vote: number
		},
		status: 'completed'|'archived'|'terminated',
		started_at: string,
		ended_at: string
	}
}
export interface IEventSubChannelPointsCustomRewardAddEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		is_enabled: boolean,
		is_paused: boolean,
		is_in_stock: boolean,
		title: string,
		cost: number,
		prompt: string,
		is_user_input_required: boolean,
		should_redemptions_skip_request_queue: boolean,
		max_per_stream: {
			is_enabled: boolean,
			value: number
		},
		max_per_user_per_stream: {
			is_enabled: boolean,
			value: number
		},
		background_color: string,
		image: {
			url_1x: string,
			url_2x: string,
			url_4x: string
		}|null,
		default_image: {
			url_1x: string,
			url_2x: string,
			url_4x: string
		},
		global_cooldown: {
			is_enabled: boolean,
			seconds: number
		},
		cooldown_expires_at: string|null,
		redemptions_redeemed_current_stream: number|null
	}
}
export interface IEventSubChannelPointsCustomRewardUpdateEventPayload extends IEventSubChannelPointsCustomRewardAddEventPayload {}
export interface IEventSubChannelPointsCustomRewardRemoveEventPayload extends IEventSubChannelPointsCustomRewardAddEventPayload {}
export interface IEventSubChannelPointsCustomRewardRedemptionAddEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & IUser & {
		id: string,
		user_input: string,
		status: 'unknown'|'unfulfilled'|'fulfilled'|'canceled',
		reward: {
			id: string,
			title: string,
			cost: number,
			prompt: string
		},
		redeemed_at: string
	}
}
export interface IEventSubChannelPointsCustomRewardRedemptionUpdateEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & IUser & {
		id: string,
		user_input: string,
		status: 'fulfilled'|'canceled',
		reward: {
			id: string,
			title: string,
			cost: number,
			prompt: string
		},
		redeemed_at: string
	}
}
interface IPredictionOutcome<W> {
	id: string,
	title: string,
	color: 'pink'|'blue',
	users: number,
	channel_points: number,
	top_predictors: Array<IUser & {
		channel_points_won: W,
		channel_points_used: number
	}>
}
export interface IEventSubChannelPredictionBeginEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		title: string,
		outcomes: Array<IPredictionOutcome<null>>,
		started_at: string,
		locks_at: string
	}
}
export interface IEventSubChannelPredictionProgressEventPayload extends IEventSubChannelPredictionBeginEventPayload {}
export interface IEventSubChannelPredictionLockEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		title: string,
		outcomes: Array<IPredictionOutcome<null>>,
		started_at: string,
		locked_at: string
	}
}
export interface IEventSubChannelPredictionEndEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		title: string,
		winning_outcome_id: string,
		outcomes: Array<IPredictionOutcome<number>>,
		status: 'resolved'|'canceled',
		started_at: string,
		ended_at: string
	}
}
export interface IEventSubChannelSubscriptionEndEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		tier: string,
		is_gift: boolean
	}
}
export interface IEventSubChannelSubscriptionGiftEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		total: number,
		tier: string,
		cumulative_total: number,
		is_anonymous: boolean
	}
}
export interface IEventSubChannelSubscriptionMessageEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		tier: string,
		message: {
			text: string,
			emotes: Array<{
				begin: number,
				end: number,
				id: string
			}>
		},
		cumulative_months: number,
		streak_months: number,
		duration_months: number
	}
}
export interface IEventSubCharityDonationEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & {
		campaign_id: string,
		charity_name: string,
		charity_description: string,
		charity_logo: string,
		charity_website: string,
		amount: {
			value: number,
			decimal_places: number,
			currency: string
		}
	}
}

interface IEventSubCharityCampaignProgress {
	id: string,
	charity_name: string,
	charity_description: string,
	charity_logo: string,
	charity_website: string,
	current_amount: {
		value: number,
		decimal_places: number,
		currency: string
	},
	target_amount: {
		value: number,
		decimal_places: number,
		currency: string,
	}
}
export interface IEventSubCharityCampaignStartEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & IEventSubCharityCampaignProgress & {
		started_at: string
	}
}
export interface IEventSubCharityCampaignProgressEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & IEventSubCharityCampaignProgress
}
export interface IEventSubCharityCampaignStopEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & IBroadcaster & IEventSubCharityCampaignProgress & {
		stopped_at: string
	}
}
export interface IEventSubDropEntitlementGrantEventPayload extends IEventSubSubscriptionPayload {
	event: {
		id: string,
		data: IUser & {
			organization_id: string,
			category_id: string,
			category_name: string,
			campaign_id: string,
			entitlement_id: string,
			benefit_id: string,
			created_at: string
		}
	}
}
export interface IEventSubExtensionBitsTransactionCreateEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & IUser & {
		extension_client_id: string,
		id: string,
		product: string
	}
}
export interface IEventSubGoalsEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		type: 'follow'|'subscription'|'subscription_count'|'new_subscription'|'new_subscription_count',
		description: string,
		is_achieved: boolean,
		current_amount: number,
		target_amount: number,
		started_at: string,
		ended_at?: string
	}
}
export interface IEventSubHypeTrainBeginEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		total: number,
		progress: number,
		goal: number,
		top_contributions: Array<IUser & {
			type: 'bits'|'subscription'|'other',
			total: number
		}>,
		last_contribution: IUser & {
			type: 'bits'|'subscription'|'other',
			total: number
		},
		level: number,
		started_at: string,
		expires_at: string
	}
}
export interface IEventSubHypeTrainProgressEventPayload extends IEventSubHypeTrainBeginEventPayload {}
export interface IEventSubHypeTrainEndEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		id: string,
		level: number,
		total: number,
		top_contributions: Array<IUser & {
			type: 'bits'|'subscription'|'other',
			total: number
		}>,
		started_at: string,
		ended_at: string,
		cooldown_ends_at: string
	}
}
export interface IEventSubStreamOnlineEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster & {
		type: 'live'|'playlist'|'watch_party'|'premiere'|'rerun',
		started_at: string
	}
}
export interface IEventSubStreamOfflineEventPayload extends IEventSubSubscriptionPayload {
	event: IBroadcaster
}
export interface IEventSubUserAuthorizationGrantEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & {
		client_id: string
	}
}
export interface IEventSubUserAuthorizationRevokeEventPayload extends IEventSubUserAuthorizationGrantEventPayload {}
export interface IEventSubUserUpdateEventPayload extends IEventSubSubscriptionPayload {
	event: IUser & {
		email: string,
		email_verified: boolean,
		description: string
	}
}