"use strict";

class TwitchTv {

	constructor(options) {
		this.clientid = "";
		this.redirecturi = "";
		this.scope = [];

		this.validstates = [];

		if(typeof(options.clientid) == "string") this.clientid = options.clientid;
		if(typeof(options.redirecturi) == "string") this.redirecturi = options.redirecturi;
		if(typeof(options.scope) == "object") this.scope = options.scope;
	}

	getAuthImplicitGrantFlowUrl() {
		var state = Math.floor(Date.now() / 1000).toString(16);
		this.validstates.push(state);

		return "https://api.twitch.tv/kraken/oauth2/authorize"+
				"?response_type=token" +
				"&client_id=" + this.clientid +
				"&redirect_uri=" + encodeURIComponent(this.redirecturi) +
				"&scope=" + this.scope.join('+') +
				"&state=" + state;
	}

}

module.exports = TwitchTv