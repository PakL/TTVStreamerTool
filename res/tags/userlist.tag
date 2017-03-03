<userlist>
	<div class="userlist_user" each={ users } no-reorder>
		<span class="userlist_badges"><raw content={ badges } /></span>
		<span class="userlist_name" style="color:{ color }">{ name }</span>
	</div>

	<style>
		userlist {
			display: block;
			height: 100%;
			overflow-y: auto;
			overflow-x: hidden;
		}
		
		userlist > div {
			margin: 3px 10px;
			line-height: 18px;
			
			white-space: nowrap;
		}
		userlist > div img {
			display: inline-block;
			height: 18px;
			margin: 1px 3px 1px 0;
			min-width: 18px;
			vertical-align: middle;
		}
	</style>
	<script>
		const self = this

		this.users = []

		findentry(username) {
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == username) {
					return i
				}
			}
			return -1
		}
		sortat(user) {
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == user.user) {
					return -1
				}
				if(self.users[i].sort < user.sort) return i
				if(self.users[i].sort == user.sort && self.users[i].user.localeCompare(user.user) > 0) return i
			}
			return self.users.length
		}

		joinusr(user) {
			var index = self.findentry(user.user)
			if(index >= 0) {
				if(user.user != user.name && self.users[index].name != user.name) {
					self.users[index].name = user.name
				}
				if(self.users[index].badges != user.badges) {
					self.users[index].badges = user.badges
				}
				if(self.users[index].color != user.color) {
					self.users[index].color = user.color
				}
				if(self.users[index].sort < user.sort) {
					self.users[index].sort = user.sort
				} else {
					self.users[index].sort++
				}
				user = self.users[index]
				self.users.splice(index, 1)
			}

			var nindex = self.sortat(user)
			self.users.splice(nindex, 0, user)
			self.update()
		}
		partusr(username) {
			var index = self.findentry(user.user)
			if(index >= 0) {
				self.users.splice(index, 1)
			}
			self.update()
		}

		clearUsers() {
			self.users = []
		}

		getUserColor(username) {
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == username) {
					return self.users[i].color
				}
			}
			return getColor(username)
		}
	</script>
</userlist>