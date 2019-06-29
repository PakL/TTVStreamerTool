<userlist>
	<raw content={ listHTML } />

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
		export default {
			onBeforeMount() {
				this.toomany = false
				this.users = []
				this.listHTML = ''
				this.userDictonary = {}

				this.lastSorting = 0
				this.lastLength = 0
				this.minsorting = 0
				this.makeAccessible()
			},
			onMounted() {
				const self = this
				this.root.onclick = function(e) {
					if(typeof(e.target.dataset.username) == 'string') {
						self.showuseroptions(e.target.dataset.username, e.clientX, e.clientY)
					}
				}
			},

			throttleUpdate() {
				if(this.isupdating) return
				this.isupdating = true
				this.update()
			},

			shouldUpdate() {
				if(this.lastLength != Object.keys(this.userDictonary).length) return true
				let time = new Date().getTime()
				if(this.lastSorting < (time-5000)) return true

				this.isupdating = false
				return false
			},
			onBeforeUpdate() {
				this.isupdating = true
				if(!Tool.settings.showViewerList) return

				this.users = Object.values(this.userDictonary)
				this.lastLength = this.users.length

				let time = new Date().getTime()
				this.lastSorting = time
				const self = this
				this.users.sort(function(a, b){
					if(a.sort < self.minsorting) return -1
					if(b.sort < self.minsorting) return 1

					if(a.sort > b.sort) return -1
					else if(a.sort < b.sort) return 1

					return a.user.localeCompare(b.user)
				})

				this.listHTML = ''
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
				if(this.minsorting > 0 && ! ellipsis) {
					this.listHTML += '<div class="userlist_user" style="background:#fff;color:#000;text-align:center;">…</div>'
				}
			},
			onUpdated() {
				const self = this
				window.requestAnimationFrame(() => {
					self.isupdating = false
				})
			},

			showuseroptions(username, x, y) {
				var mt = [
					{
						label: username,
						enabled: false
					},
					{
						label: Tool.i18n.__('Clear messages'),
						click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/timeout ' + username + ' 5') } }
					},
					{ type: 'separator' },
					{
						label: Tool.i18n.__('Moderation'),
						click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/user ' + username) } }
					},
					{
						label: Tool.i18n.__('Ban'),
						click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/ban ' + username) } }
					},
					{
						label: Tool.i18n.__('Timeout'),
						submenu: [
							{
								label: Tool.i18n.__('for {{sec}} {{seconds||sec}}', { sec: 60 }),
								click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/timeout ' + username + ' 60') } }
							},
							{
								label: Tool.i18n.__('for {{min}} {{minutes||min}}', { min: 5 }),
								click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/timeout ' + username + ' ' + (60*5).toString()) } }
							},
							{
								label: Tool.i18n.__('for {{min}} {{minutes||min}}', { min: 20 }),
								click() { if(Tool.cockpit.openChannelObject.hasOwnProperty('login')) { Tool.chat.sendmsg(Tool.cockpit.openChannelObject.login, '/timeout ' + username + ' ' + (60*20).toString()) } }
							}
						]
					}
				]
				var menu = Menu.buildFromTemplate(mt)
				menu.popup([null, x, y])
			},

			findentry(username) {
				for(var i = 0; i < this.users.length; i++) {
					if(this.users[i].user == username) {
						return i
					}
				}
				return -1
			},

			searchuser(snipp) {
				snipp = snipp.toLowerCase()
				var users = []
				for(let i in this.userDictonary) {
					if(!this.userDictonary.hasOwnProperty(i)) continue
					if(this.userDictonary[i].user.startsWith(snipp) || this.userDictonary[i].name.toLowerCase().startsWith(snipp)) {
						users.push(this.userDictonary[i])
					}
				}
				return users
			},
			sortat(user) {
				for(var i = 0; i < this.users.length; i++) {
					if(this.users[i].user == user.user) {
						return -1
					}
					if(this.users[i].sort < user.sort) return i
					if(this.users[i].sort == user.sort && this.users[i].user.localeCompare(user.user) > 0) return i
				}
				return this.users.length
			},

			joinusr(user, noupdate) {
				if(typeof(noupdate) != "boolean") {
					noupdate = false
				}
				
				if(this.userDictonary.hasOwnProperty(user.user)) {
					let index = user.user
					if(!user.hasOwnProperty('nooverwrite') || !user.nooverwrite) {
						if(user.user != user.name && this.userDictonary[index].name != user.name) {
							this.userDictonary[index].name = user.name
						}
						if(this.userDictonary[index].badges != user.badges) {
							this.userDictonary[index].badges = user.badges
						}
						if(this.userDictonary[index].color != user.color) {
							this.userDictonary[index].color = user.color
						}
						if(this.userDictonary[index].sort < user.sort) {
							this.userDictonary[index].sort = user.sort
						} else {
							this.userDictonary[index].sort++
						}
					}
				} else {
					this.userDictonary[user.user] = user
				}
				if(!noupdate && Tool.settings.showViewerList)
					this.throttleUpdate()
			},

			partusr(username) {
				if(this.userDictonary.hasOwnProperty(username)) {
					delete this.userDictonary[username]
				}
				this.update()
			},

			clearUsers() {
				this.userDictonary = {}
				this.toomany = false
				this.minsorting = 0
			},

			getUserColor(username) {
				if(this.userDictonary.hasOwnProperty(username)) {
					return this.userDictonary[username].color
				}
				return getColor(username)
			}
		}
	</script>
</userlist>