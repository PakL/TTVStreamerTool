<viewerplotter>
	<div class="plotter">
		<div class="plotlines">
			<div class="line" each={ data } no-reorder title={ viewers + ' @ ' + timestamp }><div style="height:{ height }%;background:{ color }"></div></div>
		</div>
	</div>
	<div class="currentviewers" style="color:{ color }">{ viewerscount }</div>

	<style>
		viewerplotter {
			display: table;
			height: 100%;
			width: 100%;
		}
		viewerplotter > div {
			display: table-cell;
		}

		viewerplotter > .plotter {
			vertical-align: bottom;
			min-width: 200px;
		}
		viewerplotter > .plotter > .plotlines {
			display: block;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}
		viewerplotter > .plotter > .plotlines > .line {
			width: 1%;
			height: 100%;
			display: inline-block;
		}
		viewerplotter > .plotter > .plotlines > .line > div {
			display: inline-block;
			width: 100%;
			vertical-align: bottom;
			min-height: 3px;
		}


		viewerplotter > .currentviewers {
			font-size: 2.5em;
			text-align: right;
			vertical-align: middle;
			padding-right: 5px;
		}
	</style>
	<script>
		const self = this

		this.data = []
		this.viewerscount = '0'
		this.colorIndex = -1
		this.color = defaultColors[0][1]

		newColor() {
			self.colorIndex++
			if(self.colorIndex >= defaultColors.length) self.colorIndex = 0
			let c = defaultColors[self.colorIndex][1]
			if(!isGoodYIQ(c)) c = makeColorLighter(c)
			self.color = c
		}

		clearPlotter() {
			self.data = []
			self.viewerscount = '0'
			self.colorIndex = -1
			self.color = defaultColors[0][1]
		}

		plotViewersCount(count, timestamp) {
			var c = count
			self.viewerscount = c.toString()
			if(c >= 10000) {
				c = c / 1000
				if(c >= 1000) {
					c = c / 1000
					var decnum = 4 - Math.floor(c).toString().length
					if(decnum < 1) decnum = 1;
					self.viewerscount = c.toFixed(decnum) + 'M'
				} else {
					var decnum = 4 - Math.floor(c).toString().length
					if(decnum < 1) decnum = 1;
					self.viewerscount = c.toFixed(decnum) + 'k'
				}
			}
			if(Tool.settings.language == 'de') {
				self.viewerscount = self.viewerscount.replace(/\./, ',')
			}

			self.data.push({ height: 0, viewers: count, timestamp: timestamp, color: self.color })
			while(self.data.length > 100) {
				self.data.shift()
			}
			var max = 0
			var min = -1
			for(var i = 0; i < self.data.length; i++) {
				if(self.data[i].viewers > max) {
					max = self.data[i].viewers
				}
				if(self.data[i].viewers < min || min < 0) {
					min = self.data[i].viewers
				}
			}
			for(var i = 0; i < self.data.length; i++) {
				self.data[i].height = (100 / (max-min) * (self.data[i].viewers-min))
			}
			self.update()
		}
	</script>
</viewerplotter>