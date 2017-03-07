function WebsocketHelper() {
	var self = this;
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
}
WebsocketHelper.prototype.send = function(message) {
	if(typeof(message) != 'string') return;
	this.connection.send(message);
}
WebsocketHelper.prototype.reconnect = function() {
	var self = this;
	this.connection = new WebSocket('ws://localhost:{__WS_PORT__}/');
	this.connection.onmessage = function(e){self.onmsg(e);};
	this.connection.onerror = function() {
	}
	this.connection.onclose = function() {
		console.log('Waiting to reconnect');
		setTimeout(function(){ self.reconnect(); }, 3000 - (new Date().getTime() % 3000));
	}
}