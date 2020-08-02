function WebsocketHelper() {
	var self = this;
	this.connected = false;
	this.listener = [];
	this.actionCallbacks = {}
	this.reconnect();
}
WebsocketHelper.prototype.onmsg = function(e){
	var msg = e.data;
	try {
		var json = JSON.parse(msg)
		for(var i=0;i<this.listener.length;i++) {
			if(json.channel == this.listener[i].channel && typeof(this.listener[i].callback) == "function") {
				this.listener[i].callback(json.data);
			}
		}
		if(typeof(json.ref) === 'string' && typeof(this.actionCallbacks[json.ref]) === 'function') {
			if(typeof(json.error) === 'undefined') json.error = null;
			this.actionCallbacks[json.ref](json.data, json.error);
		}
	} catch(e) {}
};
WebsocketHelper.prototype.on = function(channel, callback) {
	if(typeof(channel) == "undefined") return;
	if(typeof(callback) != "function") return;

	this.listener.push({ "channel": channel, "callback": callback });
	this.subscribe(channel);
}
WebsocketHelper.prototype.send = function(json) {
	this.connection.send(JSON.stringify(json));
}
WebsocketHelper.prototype.subscribe = function(channel) {
	if(channel.startsWith(':') || !this.connected) return;
	this.send({ action: 'listen', channel });
}
WebsocketHelper.prototype.execute = function(channel, parameters, callback) {
	var ref;
	if(typeof(callback) === 'function') {
		ref = (new Date().getTime() + Math.random()).toString(32);
		this.actionCallbacks[ref] = callback;
	}
	this.send({ action: 'action', channel, parameters, ref });
}
WebsocketHelper.prototype.reconnect = function() {
	var self = this;
	this.connection = new WebSocket('ws://' + document.location.host + '/');
	this.connection.onopen = function() {
		self.connected = true;
		for(var i=0;i<self.listener.length;i++) {
			self.subscribe(self.listener[i].channel)
		}
		self.onmsg({ data: '{"channel":":open","data":{}}' })
	}
	this.connection.onmessage = function(e){self.onmsg(e);};
	this.connection.onerror = function() {
	}
	this.connection.onclose = function() {
		this.connected = false;
		console.log('Waiting to reconnect');
		self.onmsg({ data: '{"channel":":close","data":{}}' })
		setTimeout(function(){ console.log('Connecting...'); self.reconnect(); }, 3000 - (new Date().getTime() % 3000));
	}
}