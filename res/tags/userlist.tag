<userlist>
	<div class="userlist_user" each={ users }>
		<span class="userlist_badges"><raw content={ badges } /></span>
		<span class="userlist_name" style="color:{ color }">{ name }</span>
	</div>

	<style>
		userlist {
			display: block;
			height: 100%;
			overflow: auto;
		}
	</style>
	<script>
		const self = this

		this.users = []

		isGoodYIQ(hexcolor) {
			if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
			else if(hexcolor.length < 6) return

			var r = parseInt(hexcolor.substr(0, 2), 16)
			var g = parseInt(hexcolor.substr(2, 2), 16)
			var b = parseInt(hexcolor.substr(4, 2), 16)
			var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
			return (yiq >= 80) ? true : false
		}

		makeColorLighter(hexcolor) {
			if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
			else if(hexcolor.length < 6) return

			var r = (parseInt(hexcolor.substr(0, 2), 16) + 100).toString(16)
			var g = (parseInt(hexcolor.substr(2, 2), 16) + 100).toString(16)
			var b = (parseInt(hexcolor.substr(4, 2), 16) + 100).toString(16)
			if(r.length > 2) r = 'ff'
			if(g.length > 2) g = 'ff'
			if(b.length > 2) b = 'ff'
			return '#' + r + g + b
		}

		joinusr(user) {
			if(!self.updateusr(user)) {
				self.users.push(user)
			}

			self.users.sort(function(a, b){
				if(a.sort > b.sort) return -1
				else if(a.sort < b.sort) return 1

				return a.user.localeCompare(b.user)
			})
			self.update()
		}
		updateusr(user) {
			if(!self.isGoodYIQ(user.color)) {
				user.color = self.makeColorLighter(user.color)
			}
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == user.user) {
					var changes = false
					if(user.user != user.name && self.users[i].name != user.name) {
						self.users[i].name = user.name
						changes = true
					}
					if(self.users[i].sort <= user.sort) {
						self.users[i].sort = user.sort
						self.users[i].badges = user.badges
						changes = true
					}
					if(self.users[i].color != user.color) {
						self.users[i].color = user.color
						changes = true
					}

					return true
				}
			}
			return false
		}
		partusr(username) {
			var index = -1
			for(var i = 0; i < self.users.length; i++) {
				if(self.users[i].user == username) {
					index = i
					break
				}
			}
			if(index >= 0) {
				self.users.splice(index, 1)
				self.update()
			}
		}
	</script>
</userlist>