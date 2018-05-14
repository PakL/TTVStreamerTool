<userlist>
	<raw content="{ listHTML }" />

	<style>
		userlist {
			display: block;
			height: 100%;
			overflow-y: auto;
			overflow-x: hidden;
		}
		
		userlist div {
			margin: 3px 5px;
			line-height: 18px;
			
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		userlist div .userlist_name {
			cursor: pointer;
		}
		userlist div img {
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
		this.listHTML = ''
		this.userDictonary = {}

		this.lastSorting = 0
		this.lastLength = 0
		this.minsorting = 0

		this.on('mount', () => {
			self.root.onclick = function(e) {
				if(typeof(e.target.dataset.username) == 'string') {
					self.showuseroptions(e.target.dataset.username, e.clientX, e.clientY)
				}
			}
		})

		shouldUpdate() {
			if(self.isupdating) return false
			if(self.lastLength != Object.keys(self.userDictonary).length) return true
			let time = new Date().getTime()
			if(self.lastSorting < (time-5000)) return true
			return false
		}
		this.on('update', () => {
			self.isupdating = true
			if(!Tool.settings.showViewerList) return

			self.users = Object.values(self.userDictonary)
			self.lastLength = self.users.length

			let time = new Date().getTime()
			self.lastSorting = time
			self.users.sort(function(a, b){
				if(a.sort < self.minsorting) return -1
				if(b.sort < self.minsorting) return 1

				if(a.sort > b.sort) return -1
				else if(a.sort < b.sort) return 1

				return a.user.localeCompare(b.user)
			})

			self.listHTML = ''
			let ellipsis = false
			self.users.forEach((u, i) => {
				if(i == 500) {
					ellipsis = true
					self.listHTML += '<div class="userlist_user" style="background:#fff;color:#000;text-align:center;">…</div>'
					self.minsorting = u.sort
					return
				} else if(i > 500) return

				self.listHTML +=	'<div class="userlist_user">\
										<span class="userlist_badges">' + u.badges + '</span>\
										<span class="userlist_name" style="color:' + u.color + '" data-username="' + u.user.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">' + u.name.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>\
									</div>'
			})
			if(self.minsorting > 0 && ! ellipsis) {
				self.listHTML += '<div class="userlist_user" style="background:#fff;color:#000;text-align:center;">…</div>'
			}
		})
		this.on('updated', () => {
			window.requestAnimationFrame(() => {
				self.isupdating = false
			})
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
			for(let i in self.userDictonary) {
				if(!self.userDictonary.hasOwnProperty(i)) continue
				if(self.userDictonary[i].user.startsWith(snipp) || self.userDictonary[i].name.toLowerCase().startsWith(snipp)) {
					users.push(self.userDictonary[i])
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
			
			if(self.userDictonary.hasOwnProperty(user.user)) {
				let index = user.user
				if(!user.hasOwnProperty('nooverwrite') || !user.nooverwrite) {
					if(user.user != user.name && self.userDictonary[index].name != user.name) {
						self.userDictonary[index].name = user.name
					}
					if(self.userDictonary[index].badges != user.badges) {
						self.userDictonary[index].badges = user.badges
					}
					if(self.userDictonary[index].color != user.color) {
						self.userDictonary[index].color = user.color
					}
					if(self.userDictonary[index].sort < user.sort) {
						self.userDictonary[index].sort = user.sort
					} else {
						self.userDictonary[index].sort++
					}
				}
			} else {
				self.userDictonary[user.user] = user
			}
			if(!noupdate && Tool.settings.showViewerList)
				self.update()
		}
		partusr(username) {
			if(self.userDictonary.hasOwnProperty(username)) {
				delete self.userDictonary[username]
			}
			self.update()
		}

		clearUsers() {
			self.userDictonary = {}
			self.toomany = false
			self.minsorting = 0
		}

		getUserColor(username) {
			if(self.userDictonary.hasOwnProperty(username)) {
				return self.userDictonary[username].color
			}
			return getColor(username)
		}
	</script>
</userlist>