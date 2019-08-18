function WebsocketHelper() {
	var self = this;
	this.connected = false;
	this.listener = [];
	this.reconnect();
}
WebsocketHelper.prototype.onmsg = function(e){
	var msg = e.data;
	for(var i=0;i<this.listener.length;i++) {
		if(msg.startsWith(this.listener[i].cmd) && typeof(this.listener[i].callback) == "function") {
			this.listener[i].callback(msg);
		}
	}
};
WebsocketHelper.prototype.on = function(cmd, callback) {
	if(typeof(cmd) == "undefined") return;
	if(typeof(callback) != "function") return;

	this.listener.push({ "cmd": cmd, "callback": callback });
	if(this.connected) this.subscribe(cmd)
}
WebsocketHelper.prototype.send = function(message) {
	if(typeof(message) != 'string') return;
	this.connection.send(message);
}
WebsocketHelper.prototype.subscribe = function(cmd) {
	this.connection.send(':subscribe:' + cmd)
}
WebsocketHelper.prototype.reconnect = function() {
	var self = this;
	this.connection = new WebSocket('ws://' + document.location.hostname + ':{__WS_PORT__}/');
	this.connection.onopen = function() {
		self.connected = true;
		for(var i=0;i<self.listener.length;i++) {
			self.subscribe(self.listener[i].cmd)
		}
		self.send(':please_repeat');
	}
	this.connection.onmessage = function(e){self.onmsg(e);};
	this.connection.onerror = function() {
	}
	this.connection.onclose = function() {
		this.connected = false;
		console.log('Waiting to reconnect');
		setTimeout(function(){ console.log('Connecting...'); self.reconnect(); }, 3000 - (new Date().getTime() % 3000));
	}
}