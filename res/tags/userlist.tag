<userlist>
	<div class="userlist_user" each={ users } no-reorder key="user">
		<span class="userlist_badges"><raw content={ badges } /></span>
		<span class="userlist_name" style="color:{ color }" data-username="{ user }">{ name }</span>
	</div>

	<style>
		userlist {
			display: block;
			height: 100%;
			overflow-y: auto;
			overflow-x: hidden;
		}
		
		userlist > div {
			margin: 3px 5px;
			line-height: 18px;
			
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
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

		this.toomany = false
		this.users = []

		throttleupdate() {
			if(!self.isupdating)
				self.update()
		}

		this.on('update', () => {
			self.isupdating = true
			if(!Tool.settings.showViewerList) return
			self.users.sort(function(a, b){
				if(a.sort > b.sort) return -1
				else if(a.sort < b.sort) return 1

				return a.user.localeCompare(b.user)
			})
		})
		this.on('updated', () => {
			var userels = self.root.querySelectorAll('.userlist_user')
			for(var i = 0; i < userels.length; i++) {
				userels[i].querySelector('.userlist_name').onclick = function(e) {
					self.showuseroptions(e.target.dataset.username, e.clientX, e.clientY)
				}
			}
			setTimeout(() => { self.isupdating = false}, 0)
		})

		showuseroptions(username, x, y) {
			var mt = [
				{
					label: username,
					enabled: false
				},
				{
					label: Tool.i18n.__('Clear messages'),
					click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('name')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.name, '/timeout ' + username + ' 5') } }
				},
				{ type: 'separator' },
				{
					label: Tool.i18n.__('Ban'),
					click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('name')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.name, '/ban ' + username) } }
				},
				{
					label: Tool.i18n.__('Timeout'),
					submenu: [
						{
							label: Tool.i18n.__('for {{sec}} {{seconds||sec}}', { sec: 60 }),
							click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('name')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.name, '/timeout ' + username + ' 60') } }
						},
						{
							label: Tool.i18n.__('for {{min}} {{minutes||min}}', { min: 5 }),
							click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('name')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.name, '/timeout ' + username + ' ' + (60*5).toString()) } }
						},
						{
							label: Tool.i18n.__('for {{min}} {{minutes||min}}', { min: 20 }),
							click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('name')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.name, '/timeout ' + username + ' ' + (60*20).toString()) } }
						}
					]
				}
			]
			var menu = Menu.buildFromTemplate(mt)
			menu.popup([null, x, y])
		}

		findentry(username) {
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == username) {
					return i
				}
			}
			return -1
		}
		searchuser(snipp) {
			snipp = snipp.toLowerCase()
			var users = []
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user.startsWith(snipp) || self.users[i].name.toLowerCase().startsWith(snipp)) {
					users.push(self.users[i])
				}
			}
			return users
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

		joinusr(user, noupdate) {
			if(typeof(noupdate) != "boolean") {
				noupdate = false
			}
			var index = self.findentry(user.user)
			if(index >= 0) {
				if(!user.hasOwnProperty('nooverwrite') || !user.nooverwrite) {
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
				}
			} else {
				self.users.push(user)
			}
			if(!noupdate && Tool.settings.showViewerList)
				self.throttleupdate()
		}
		partusr(username) {
			var index = self.findentry(username)
			if(index >= 0) {
				self.users.splice(index, 1)
			}
			self.throttleupdate()
		}

		clearUsers() {
			self.users = []
			self.toomany = false
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