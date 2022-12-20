import { EventEmitter } from 'events';
import ws from 'ws';
import winston from 'winston';

import * as T from './EventSubTypes';

declare var logger: winston.Logger;

const _defaultWebsocketUri = 'wss://eventsub-beta.wss.twitch.tv/ws';
const _maxReconnectTimeout = 120000

declare interface EventSub {
	connect(): Promise<void>;
	on(eventName: 'connecting', callback: () => void): this;
	on(eventName: 'connected', callback: () => void): this;
	on(eventName: 'closed', callback: (reason: string) => void): this;
	on(eventName: 'welcome', callback: (sessionId: string) => void): this;
	on(eventName: 'revoked', callback: (subsciption: T.IEventSubSubscriptionPayload) => void): this;
	on(eventName: 'channel.update', callback: (payload: T.IEventSubChannelUpdateEventPayload) => void): this;
	on(eventName: 'channel.follow', callback: (payload: T.IEventSubChannelFollowEventPayload) => void): this;
	on(eventName: 'channel.subscribe', callback: (payload: T.IEventSubChannelSubscribeEventPayload) => void): this;
	on(eventName: 'channel.subscription.end', callback: (payload: T.IEventSubChannelSubscriptionEndEventPayload) => void): this;
	on(eventName: 'channel.subscription.gift', callback: (payload: T.IEventSubChannelSubscriptionGiftEventPayload) => void): this;
	on(eventName: 'channel.subscription.message', callback: (payload: T.IEventSubChannelSubscriptionMessageEventPayload) => void): this;
	on(eventName: 'channel.cheer', callback: (payload: T.IEventSubChannelCheerEventPayload) => void): this;
	on(eventName: 'channel.raid', callback: (payload: T.IEventSubChannelRaidEventPayload) => void): this;
	on(eventName: 'channel.ban', callback: (payload: T.IEventSubChannelBanEventPayload) => void): this;
	on(eventName: 'channel.unban', callback: (payload: T.IEventSubChannelUnbanEventPayload) => void): this;
	on(eventName: 'channel.moderator.add', callback: (payload: T.IEventSubChannelModeratorAddEventPayload) => void): this;
	on(eventName: 'channel.moderator.remove', callback: (payload: T.IEventSubChannelModeratorRemoveEventPayload) => void): this;
	on(eventName: 'channel.channel_points_custom_reward.add', callback: (payload: T.IEventSubChannelPointsCustomRewardAddEventPayload) => void): this;
	on(eventName: 'channel.channel_points_custom_reward.update', callback: (payload: T.IEventSubChannelPointsCustomRewardUpdateEventPayload) => void): this;
	on(eventName: 'channel.channel_points_custom_reward.remove', callback: (payload: T.IEventSubChannelPointsCustomRewardRemoveEventPayload) => void): this;
	on(eventName: 'channel.channel_points_custom_reward_redemption.add', callback: (payload: T.IEventSubChannelPointsCustomRewardRedemptionAddEventPayload) => void): this;
	on(eventName: 'channel.channel_points_custom_reward_redemption.update', callback: (payload: T.IEventSubChannelPointsCustomRewardRedemptionUpdateEventPayload) => void): this;
	on(eventName: 'channel.poll.begin', callback: (payload: T.IEventSubChannelPollBeginEventPayload) => void): this;
	on(eventName: 'channel.poll.progress', callback: (payload: T.IEventSubChannelPollProgressEventPayload) => void): this;
	on(eventName: 'channel.poll.end', callback: (payload: T.IEventSubChannelPollEndEventPayload) => void): this;
	on(eventName: 'channel.prediction.begin', callback: (payload: T.IEventSubChannelPredictionBeginEventPayload) => void): this;
	on(eventName: 'channel.prediction.progress', callback: (payload: T.IEventSubChannelPredictionProgressEventPayload) => void): this;
	on(eventName: 'channel.prediction.lock', callback: (payload: T.IEventSubChannelPredictionLockEventPayload) => void): this;
	on(eventName: 'channel.prediction.end', callback: (payload: T.IEventSubChannelPredictionEndEventPayload) => void): this;
	on(eventName: 'drop.entitlement.grant', callback: (payload: T.IEventSubDropEntitlementGrantEventPayload) => void): this;
	on(eventName: 'extension.bits_transaction.create', callback: (payload: T.IEventSubExtensionBitsTransactionCreateEventPayload) => void): this;
	on(eventName: 'channel.goal.begin', callback: (payload: T.IEventSubGoalsEventPayload) => void): this;
	on(eventName: 'channel.goal.progress', callback: (payload: T.IEventSubGoalsEventPayload) => void): this;
	on(eventName: 'channel.goal.end', callback: (payload: T.IEventSubGoalsEventPayload) => void): this;
	on(eventName: 'channel.hype_train.begin', callback: (payload: T.IEventSubHypeTrainBeginEventPayload) => void): this;
	on(eventName: 'channel.hype_train.progress', callback: (payload: T.IEventSubHypeTrainProgressEventPayload) => void): this;
	on(eventName: 'channel.hype_train.end', callback: (payload: T.IEventSubHypeTrainEndEventPayload) => void): this;
	on(eventName: 'stream.online', callback: (payload: T.IEventSubStreamOnlineEventPayload) => void): this;
	on(eventName: 'stream.offline', callback: (payload: T.IEventSubStreamOfflineEventPayload) => void): this;
	on(eventName: 'user.authorization.grant', callback: (payload: T.IEventSubUserAuthorizationGrantEventPayload) => void): this;
	on(eventName: 'user.authorization.revoke', callback: (payload: T.IEventSubUserAuthorizationRevokeEventPayload) => void): this;
	on(eventName: 'user.update', callback: (payload: T.IEventSubUserUpdateEventPayload) => void): this;
	disconnect(reconnect: boolean): void;
}

class EventSub extends EventEmitter {

	private _connection: ws = null;
	private _connected: boolean = false;
	private _autoreconnect: boolean = false;
	private _reconnectTimeout: number = 1000;
	private _lastError = '';
	private _keepalivetimeoutseconds: number = 10;
	private _keepalivetimeout: NodeJS.Timeout = null;
	private _oldconnection: ws = null;
	private _reconnectUrl: string = null;

	public connect(): Promise<void> {
		const self = this;
		return new Promise((res, rej) => {
			self.emit('connecting');
			logger.info('[EventSub] Connecting to ' + (self._reconnectUrl ?? _defaultWebsocketUri));
			if(self._reconnectUrl !== null) {
				self._oldconnection = self._connection;
				self._oldconnection.removeAllListeners('close');
				self._oldconnection.removeAllListeners('error');
				self._oldconnection.on('error', () => {});
			}
			self._connection = new ws(self._reconnectUrl ?? _defaultWebsocketUri);

			let onOpen = () => {
				self._connection.off('error', onError);

				logger.info('[EventSub] Connection established');
				self.emit('connected');
				self._lastError = '';
				self._connected = true;
				self._autoreconnect = true;
				self._reconnectTimeout = 1000;
				
				self._connection.on('message', (t) => { self._onMessage(t); });
				self._connection.on('close', () => { self._onClose(); });

				res();
			};
			let onError = (err: any) => {
				self._connection.off('open', onOpen);

				self.emit('closed', 'Connection error');

				rej(err);
				self._connection = null;
				self._autoreconnect = true;
				self._onClose();
			}

			self._connection.once('open', onOpen);
			self._connection.once('error', onError);
		})
	}

	/**
	 * Processes messages from the PubSub
	 */
	private _onMessage(data: ws.Data) {
		let text = data.toString('utf8').trim();
		logger.verbose('[EventSub] < ' + text);
		try {
			let msg = JSON.parse(text);
			let meta: T.IEventSubMetadata = msg.metadata;
			let payload = msg.payload;

			this._onKeepAlive();

			if(meta.message_type === 'session_welcome') {
				this._onWelcome(payload);
			} else if(meta.message_type === 'session_reconnect') {
				this._onSessionReconnect(payload);
			} else if(meta.message_type === 'revocation') {
				this._onRevocation(payload);
			} else if(meta.message_type === 'notification') {
				this._onNotification(payload);
			}
		} catch(e) {
			logger.error('[EventSub]', e);
		}
	}

	private _onWelcome(payload: T.IEventSubSessionPayload) {
		if(this._reconnectUrl === null) {
			this.emit('welcome', payload.session.id);
		} else {
			this._oldconnection.close();
			this._reconnectUrl = null;
			this._oldconnection = null;
		}
		this._keepalivetimeoutseconds = payload.session.keepalive_timeout_seconds;
		this._keepalivetimeout = setTimeout(() => { this.disconnect(true) }, (this._keepalivetimeoutseconds + 2) * 1000);
	}

	private _onKeepAlive() {
		if(this._keepalivetimeout !== null) {
			clearTimeout(this._keepalivetimeout);
			this._keepalivetimeout = setTimeout(() => { this.disconnect(true) }, (this._keepalivetimeoutseconds + 2) * 1000);
		}
	}

	private _onSessionReconnect(payload: T.IEventSubSessionPayload) {
		this._reconnectUrl = payload.session.reconnect_url;
		clearTimeout(this._keepalivetimeout);
		this.connect();
	}

	private _onRevocation(payload: T.IEventSubSubscriptionPayload) {
		this.emit('revoked', payload);
	}

	private _onNotification(payload: T.IEventSubSubscriptionPayload) {
		this.emit(payload.subscription.type, payload);
	}

	/**
	 * Actions after the connection was closed
	 * 
	 * @private
	 */
	private _onClose() {
		logger.info('[EventSub] Connection closed');
		this.emit('closed', this._lastError);
		this._connection = null;
		this._connected = false;
		clearTimeout(this._keepalivetimeout);
		this._keepalivetimeout = null;
		if(this._autoreconnect) {
			let jitter = Math.floor(Math.random()*1000);
			const self = this;
			logger.verbose('[EventSub] Reconnect in ' + ((this._reconnectTimeout + jitter) / 1000) + ' seconds');
			setTimeout(() => {
				self.connect().catch((e) => { logger.error('[EventSub]', e); });
			}, this._reconnectTimeout + jitter);
			if(this._reconnectTimeout < _maxReconnectTimeout) {
				this._reconnectTimeout *= 2;
			}
		}
	}

	/**
	 * Disconnects from the EventSub
	 */
	disconnect(reconnect?: boolean)
	{
		if(this._connected) {
			if(typeof(reconnect) !== 'boolean') reconnect = false;
			this._autoreconnect = reconnect;
			this._connected = false;
			this._connection.close();
		}
	}

}

export = EventSub;