<message>
	<span class="timestamp" name="timestamp">{ opts.timestamp }</span>
	<span class="badges" name="badges"></span>
	<span class="nickname" name="nickname">{ opts.nickname }</span>
	<span class="msg" name="msg">{ opts.message }</span>
	
	<style>
		message {
			display: block;
			line-height: 1.5em;
			margin: 5px 0;
		}
		message > .timestamp {
			color: #777;
		}
		message > .timestamp:before {
			content: "[";
		}
		message > .timestamp:after {
			content: "] ";
		}
		message > .username {
			font-weight: bold;
		}
		message > .username:after {
			content: ":";
		}
		message > .username.action:after {
			content: "";
		}
		message > .message:before {
			content: " ";
		}
		message > .message .d {
			color: #777;
		}
		message > .badges  img {
			display: inline-block;
			height: 18px;
			margin: 1px 3px 1px 0;
			min-width: 18px;
			vertical-align: middle;
		}
		message > .message img {
			vertical-align: middle;
			margin: -5px 0;
			display: inline-block;
		}
		message > .message a {
			text-decoration: none;
		}
	</style>
	<script>
		var self = this

		this.msg = this.opts.message_html
		this.badges = this.opts.badges_html
		this.on("update", () => {
			self.msg = self.opts.message_html
			self.badges = self.opts.badges_html
		})
	</script>
</message>