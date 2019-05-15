const dateFormat = require('dateformat')
const stringz = require('stringz')

let timestamp = function(ts, returnday){
	var d = new Date()
	if(typeof(ts) != 'undefined')
		d = new Date(ts)

	if(typeof(returnday) != 'boolean')
		returnday = false

	return dateFormat(d, (returnday ? Tool.i18n.__('mm.dd.yyyy hh:MMtt') : Tool.i18n.__('hh:MMtt')))
}


let isGoodYIQ = function(hexcolor) {
	if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
	else if(hexcolor.length < 6) return

	var r = parseInt(hexcolor.substr(0, 2), 16)
	var g = parseInt(hexcolor.substr(2, 2), 16)
	var b = parseInt(hexcolor.substr(4, 2), 16)
	var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
	return (yiq >= 80) ? true : false
}

let makeColorLighter = function(hexcolor) {
	if(hexcolor.length > 6) hexcolor = hexcolor.substr(hexcolor.length-6, 6)
	else if(hexcolor.length < 6) return

	var r = (parseInt(hexcolor.substr(0, 2), 16) + 100).toString(16)
	var g = (parseInt(hexcolor.substr(2, 2), 16) + 100).toString(16)
	var b = (parseInt(hexcolor.substr(4, 2), 16) + 100).toString(16)
	if(r.length > 2) r = 'ff'; if(r.length < 2) r = '0' + r;
	if(g.length > 2) g = 'ff'; if(g.length < 2) g = '0' + g;
	if(b.length > 2) b = 'ff'; if(b.length < 2) b = '0' + b;
	return '#' + r + g + b
}

let defaultColors = [
	['Lime', '#bade00'],
	['Green', '#6ec21a'],
	['Emerald', '#00a300'],
	['Teal', '#00c4c2'],
	['Cyan', '#1eb4fc'],
	['Cobalt', '#5779ff'],
	['Indigo', '#8833ff'],
	['Violet', '#bb33ff'],
	['Pink', '#ff77d9'],
	['Magenta', '#f20081'],
	['Crimson', '#bd002b'],
	['Red', '#ff1600'],
	['Orange', '#ff6a00'],
	['Amber', '#ffad0b'],
	['Yellow', '#fcde00'],
	['Brown', '#9c6c35'],
	['Olive', '#82a177'],
	['Steel', '#778ca1'],
	['Mauve', '#8c72a3'],
	['Taupe', '#a1905d']
]
let getColor = function(name) {
	if(typeof(name) != 'string') name = 'a'
	var n = name.charCodeAt(0) + name.charCodeAt(name.length - 1)
	var ni = n % defaultColors.length
	if(ni >= defaultColors.length || ni < 0 || isNaN(ni)) ni = 0
	var c = defaultColors[ni][1]
	//if(!isGoodYIQ(c)) c = makeColorLighter(c)
	return c
}

var findEmoticons = function(text, emoticons){
	var emotestring = ''
	if(typeof(emoticons) !== 'undefined' && emoticons != null) {
		for(set in emoticons.emoticon_sets) {
			if(!emoticons.emoticon_sets.hasOwnProperty(set)) continue
			for(var i = 0; i < emoticons.emoticon_sets[set].length; i++) {
				var e = emoticons.emoticon_sets[set][i]

				var regex = new RegExp('(\\s|^)('+e.code.replace('\\&lt\\;', '<').replace('\\&gt\\;', '>')+')($|\\s)', 'g')
				var matched = false
				while(match = regex.exec(text)) {
					if(!matched) {
						emotestring += '/'+e.id+':'
						matched = true
					}
					regex.lastIndex = match.index+1
					var ni = -1

					var start = match.index
					if(match[1].length > 0) start++
					var end = start+match[2].length-1
					ni = end+1
					let stringUntil = stringz.substr(text, 0, start)
					let unicodeCorrection = stringUntil.length - stringz.length(stringUntil)
					emotestring += (start-unicodeCorrection)+'-'+(end-unicodeCorrection)+','
				}
				if(matched)
					emotestring = emotestring.substr(0, emotestring.length-1)
			}
		}
		emotestring = emotestring.substr(1)
	}
	return emotestring
};
var replaceEmoticons = function(text, emotes, cheermotes, bits){
	if(typeof(cheermotes) != 'object') cheermotes = []
	if(typeof(bits) != 'number') bits = 0
	var replacings = []
	var newtext = ''
	var textWoe = ''
	if(typeof(emotes) == 'string') {
		var e = emotes.split('/')
		for(var i = 0; i < e.length; i++) {
			var splits = e[i].split(':', 2)
			if(splits.length == 2) {
				var eid = splits[0]
				var ranges = splits[1].split(',')
				for(var j = 0; j < ranges.length; j++) {
					var indexes = []
					indexes = ranges[j].split('-', 2)
					if(indexes.length == 2) {
						let startPos = parseInt(indexes[0])
						let endPos = parseInt(indexes[1])
						let stringUntil = stringz.substr(text, 0, startPos)
						let unicodeCorrection = stringUntil.length - stringz.length(stringUntil)
						
						replacings.push({ 'replaceWith': '<img src="https://static-cdn.jtvnw.net/emoticons/v1/'+eid+'/1.0" srcset="https://static-cdn.jtvnw.net/emoticons/v1/'+eid+'/1.0 1x, https://static-cdn.jtvnw.net/emoticons/v1/'+eid+'/2.0 2x, https://static-cdn.jtvnw.net/emoticons/v1/'+eid+'/3.0 4x" alt="{__NEEDLE__}" title="{__NEEDLE__}" class="emote">', 'start': startPos + unicodeCorrection, 'end': endPos + unicodeCorrection })
					}
				}
			}
		}
		replacings.sort(function(a, b){
			return (a.start < b.start ? -1 : 1)
		});
		var lasti = 0
		for(var i = 0; i < replacings.length; i++) {
			textWoe += text.substring(lasti, replacings[i].start)
			lasti = (replacings[i].end+1)
		}
		textWoe += text.substring(lasti)
	} else {
		textWoe = text
	}

	//if(typeof(username) != 'undefined') {
	/*	var regex = new RegExp('(@[a-z0-9_-]+)', 'gi')
		var match = text.match(regex)
		if(match !== null) match = match[0]
		if(match && textWoe.match(regex)) {
			gui.Window.get().requestAttention(3)
			var start = text.indexOf(match)
			var end = start+(match.length-1)
			replacings.push({ 'replaceWith': '<span class="nick">{__NEEDLE__}</span>', 'start': start, 'end': end })
		}*/
	//}

	/*var highlights = loadHighlights()
	var highlightMessage = false
	var highlightMessageCol = ''
	for(var i = 0; i < highlights.length; i++) {
		try {
			var regex = new RegExp(highlights[i].regex, 'gi')
			if(textWoe.match(regex) && text.match(regex)) {
				gui.Window.get().requestAttention(1)
				switch(highlights[i].type) {
					case '1':
						var match = text.match(regex)
						if(match !== null) match = match[0]
						var start = text.indexOf(match)
						var end = start+(match.length-1)
						replacings.push({ 'replaceWith': '<span style="font-weight:bold;'+(highlights[i].color.length > 0 ? 'color:'+highlights[i].color+';' : '')+'">{__NEEDLE__}</span>', 'start': start, 'end': end })
						break
					case '2':
						highlightMessage = true
						highlightMessageCol = highlights[i].color
						break
				}
			}
		} catch(e) {}
	}*/

	var regex = new RegExp('(^|\\s)((http(s?):\\/\\/)?([a-z0-9_\\-\\.]+)?[a-z0-9_\\-]\\.[a-z0-9_\\-]([a-z]+)(\\/[a-z0-9_\\-\\/%\\.\\?=#&\\*]+)?)', 'gi')
	while(match = regex.exec(text)) {
		//console.dir(match)
		var url = match[2]
		if(typeof(match[3]) == 'undefined' || match[3].length == 0) url = 'https://' + url

		var start = match.index + match[1].length;
		var end = start+match[2].length-1
		replacings.push({ 'replaceWith': '<a href="' + url + '" target="_blank">' + match[2] + '</a>', 'start': start, 'end': end })
	}

	if(bits > 0) {
		cheermotes = cheermotes.sort((a, b) => {
			return a.priority - b.priority;
		})
		for(let i = 0; i < cheermotes.length; i++) {
			if(bits <= 0) continue;

			let cheer = cheermotes[i]
			let regex = new RegExp('(^|\\s)(' + cheer.prefix + '(\\d+))(\\s|$)', 'gi')
			let match = null
			while(match = regex.exec(text)) {
				let usedBits = parseInt(match[3])
				if(usedBits > bits) continue;

				let color = '';
				let images = [];
				let minbits = 0;

				cheer.tiers.forEach((tier) => {
					if(tier.min_bits > minbits && tier.min_bits <= usedBits) {
						color = tier.color
						images = [tier.images.dark.animated['1'], tier.images.dark.animated['2'], tier.images.dark.animated['4']]
					}
				})

				if(color.length > 0 && images.length > 0) {
					var start = match.index + match[1].length
					var end = start+match[2].length + match[4].length-1
					replacings.push({ 'replaceWith': ' <img src="' + images[0] + '" srcset="' + images[0]+ ' 1x, ' + images[1] + ' 2x, ' + images[2] + ' 4x" alt="' + cheer.prefix + '" title="' + cheer.prefix + '" class="emote"><span style="color:' + color + ';font-weight:bold;">' + usedBits + '</span> ', 'start': start, 'end': end })
				}

				regex.lastIndex--;
			}
		}
	}

	if(typeof(Tool) != 'undefined') {
		replacings = replacings.concat(Tool.addons.findAndReplaceInMessage(text))
	}

	replacings.sort(function(a, b){
		return (a.start < b.start ? -1 : 1)
	})

	var replacingsdump = replacings
	replacings = []
	for(var i = 0; i < replacingsdump.length; i++) {
		var overlaps = false
		for(var j = 0; j < replacings.length; j++) {
			if(
				replacingsdump[i].start == replacings[j].start || replacingsdump[i].end == replacings[j].end ||
				(replacingsdump[i].start > replacings[j].start && replacingsdump[i].start < replacings[j].end) || (replacingsdump[i].end > replacings[j].start && replacingsdump[i].end < replacings[j].end)
			) {
				//console.log('Overlapping shit')
				overlaps = true
				break
			}
		}
		if(!overlaps) replacings.push(replacingsdump[i])
	}


	var lasti = 0;
	for(var i = 0; i < replacings.length; i++) {
		// Skip replacement if invalid. Might be due to bad programmed addons
		if(!replacings[i].hasOwnProperty('start') || !replacings[i].hasOwnProperty('end') || !replacings[i].hasOwnProperty('replaceWith'))
			continue

		newtext += text.substring(lasti, replacings[i].start).replace(/\</g, '&lt;').replace(/\>/g, '&gt;')
		newtext += replacings[i].replaceWith.replace(/\{__NEEDLE__\}/g, text.substring(replacings[i].start, replacings[i].end+1))
		lasti = (replacings[i].end+1)
	}
	newtext += text.substring(lasti).replace(/\</g, '&lt;').replace(/\>/g, '&gt;')
	text = newtext

	//text = text.replace(/(([a-z0-9\-\.]{5,128})(\/([^ ]+)?)?)/ig, '<a href="http://$1" target="_external">$1</a>')
	/*if(highlightMessage)
		text = '<span style="font-weight:bold;'+(highlightMessageCol.length > 0 ? 'color:'+highlightMessageCol+';' : '')+'">'+text+'</span>';*/

	return text
}

let userSuggestion = function() {
	document.querySelector('#ac_message_usernames')._tag.setParentInput(document.querySelector('#chat_message'), 'above', (str) => {
		var words = str.split(' ')
		if(words.length == 2) {
			var cmd = words[0].toLowerCase()
			if(cmd == '/w' || cmd == '/timeout' || cmd == '/ban' || cmd == '/unban' || cmd == '/user') {
				var users = document.querySelector('#channeluser')._tag.searchuser(words[1])
				var ret = []
				for(var i = 0; i < users.length; i++) {
					ret.push({ display: users[i].name, value: users[i].user })
				}
				return ret
			}
		}
		for(var i = 0; i < words.length; i++) {
			if(words[i].startsWith('@')) {
				var users = document.querySelector('#channeluser')._tag.searchuser(words[i].substr(1))
				var ret = []
				for(var i = 0; i < users.length; i++) {
					ret.push({ display: users[i].name, value: users[i].user })
				}
				return ret
			}
		}
		return []
	}, (el, replace) => {
		var words = el.value.split(' ')
		if(words.length == 2) {
			var cmd = words[0].toLowerCase()
			if(cmd == '/w' || cmd == '/timeout' || cmd == '/ban' || cmd == '/unban') {
				el.value = words[0] + ' ' + replace.value + ' '
				return
			}
		}

		var newval = ''
		for(var i = 0; i < words.length; i++) {
			if(words[i].startsWith('@')) {
				newval += ' @' + replace.display
			} else {
				newval += ' ' + words[i]
			}
		}
		if(newval.length > 0)
			el.value = newval.substr(1)
	})
}