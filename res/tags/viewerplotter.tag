<viewerplotter>
	<div class="plotter">
		<div class="plotlines">
			<div class="line" each={ line in data } no-reorder title={ line.viewers + ' @ ' + line.timestamp }><div style="height:{ line.height }%;background:{ line.color }"></div></div>
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
		export default {
			onBeforeMount() {	
				this.data = []
				this.viewerscount = '0'
				this.colorIndex = -1
				this.color = defaultColors[0][1]
				this.makeAccessible()
			},

			newColor() {
				this.colorIndex++
				if(this.colorIndex >= defaultColors.length) this.colorIndex = 0
				let c = defaultColors[this.colorIndex][1]
				if(!isGoodYIQ(c)) c = makeColorLighter(c)
				this.color = c
			},

			clearPlotter() {
				this.data = []
				this.viewerscount = '0'
				this.colorIndex = -1
				this.color = defaultColors[0][1]
			},

			updateViewersCountOnly(count) {
				this.viewerscount = count.toString()
				this.update()
			},

			plotViewersCount(count, timestamp) {
				var c = count
				this.viewerscount = c.toString()
				if(c >= 10000) {
					c = c / 1000
					if(c >= 1000) {
						c = c / 1000
						var decnum = 4 - Math.floor(c).toString().length
						if(decnum < 1) decnum = 1;
						this.viewerscount = c.toFixed(decnum) + 'M'
					} else {
						var decnum = 4 - Math.floor(c).toString().length
						if(decnum < 1) decnum = 1;
						this.viewerscount = c.toFixed(decnum) + 'k'
					}
				}
				if(Tool.settings.language == 'de') {
					this.viewerscount = this.viewerscount.replace(/\./, ',')
				}

				this.data.push({ height: 0, viewers: count, timestamp: timestamp, color: this.color })
				while(this.data.length > 100) {
					this.data.shift()
				}
				var max = 0
				var min = -1
				for(var i = 0; i < this.data.length; i++) {
					if(this.data[i].viewers > max) {
						max = this.data[i].viewers
					}
					if(this.data[i].viewers < min || min < 0) {
						min = this.data[i].viewers
					}
				}
				let highestHigh = 0
				for(var i = 0; i < this.data.length; i++) {
					this.data[i].height = (100 / (max-min) * (this.data[i].viewers-min))
					if(this.data[i].height > highestHigh) highestHigh = this.data[i].height
				}
				if(highestHigh <= 0 || isNaN(highestHigh)) {
					for(var i = 0; i < this.data.length; i++) {
						this.data[i].height = 100
					}
				}
				this.update()
			}
		}
	</script>
</viewerplotter>