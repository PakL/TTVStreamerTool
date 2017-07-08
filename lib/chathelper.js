const dateFormat = require('dateformat')

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
	['Red', '#FF0000'],
	['Blue', '#0000FF'],
	['Green', '#00FF00'],
	['FireBrick', '#B22222'],
	['Coral', '#FF7F50'],
	['YellowGreen', '#9ACD32'],
	['OrangeRed', '#FF4500'],
	['SeaGreen', '#2E8B57'],
	['GoldenRod', '#DAA520'],
	['Chocolate', '#D2691E'],
	['CadetBlue', '#5F9EA0'],
	['DodgerBlue', '#1E90FF'],
	['HotPink', '#FF69B4'],
	['BlueViolet', '#8A2BE2'],
	['SpringGreen', '#00FF7F']
]
let getColor = function(name) {
	if(typeof(name) != 'string') name = 'a'
	var n = name.charCodeAt(0) + name.charCodeAt(name.length - 1)
	var ni = n % defaultColors.length
	console.log(ni)
	if(ni >= defaultColors.length || ni < 0 || isNaN(ni)) ni = 0
	var c = defaultColors[ni][1]
	if(!isGoodYIQ(c)) c = makeColorLighter(c)
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
					emotestring += start+'-'+end+','
				}
				if(matched)
					emotestring = emotestring.substr(0, emotestring.length-1)
			}
		}
		emotestring = emotestring.substr(1)
	}
	return emotestring
};
var replaceEmoticons = function(text, emotes){
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
					if(indexes.length == 2)
						replacings.push({ 'replaceWith': '<img src="http://static-cdn.jtvnw.net/emoticons/v1/'+eid+'/1.0" alt="{__NEEDLE__}" title="{__NEEDLE__}">', 'start': parseInt(indexes[0]), 'end': parseInt(indexes[1]) })
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
		if(typeof(match[3]) == 'undefined' || match[3].length == 0) url = 'http://' + url

		var start = match.index + match[1].length;
		var end = start+match[2].length-1
		replacings.push({ 'replaceWith': '<a href="' + url + '" target="_blank">' + match[2] + '</a>', 'start': start, 'end': end })
	}

	replacings.sort(function(a, b){
		return (a.start < b.start ? -1 : 1)
	})

	var replacingsdump = replacings
	replacings = []
	for(var i = 0; i < replacingsdump.length; i++) {
		var overlaps = false
		for(var j = 0; j < replacings.length; j++) {
			if((replacingsdump[i].start > replacings[j].start && replacingsdump[i].start < replacings[j].end) || (replacingsdump[i].end > replacings[j].start && replacingsdump[i].end < replacings[j].end)) {
				console.log('Overlapping shit')
				overlaps = true
				break
			}
		}
		if(!overlaps) replacings.push(replacingsdump[i])
	}

	var lasti = 0;
	for(var i = 0; i < replacings.length; i++) {
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
			if(cmd == '/w' || cmd == '/timeout' || cmd == '/ban' || cmd == '/unban') {
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
				newval += ' ' + replace.display
			} else {
				newval += ' ' + words[i]
			}
		}
		if(newval.length > 0)
			el.value = newval.substr(1)
	})
}