# Getting Started

As you surely know by now TTVStreamerTool uses Addons to add optional functionality. This is so that you can have features on a need to have basis and save a few system resources you might need for streaming.

Since everything is running through [Electron](https://electron.atom.io/) you build your addons in JavaScript. You can use node modules so you don't need to reinvent the wheel.

An addon must be either be placed in an subfolder of the `addons` folder (you can create on with non exists) or packed into an `asar` file to put in to the `resources` folder.
In every addon root must be a valid `package.json` and an `addon.js` file.

### package.json
Similar to a normal node module package.json but the only really important bits are
* **name**<br>
  Should be readable. I don't really care about it but if you want you can follow the npm rules.
* **systems**<br>
  An array with supported platforms. Now this is a thing I made because I still hope I can make TTVST cross platform. But this is more dependent on my time than anything.

### addon.js
This should be a node module that has an constructor that takes a TTVTool object (we get to that later) and an optional [i18n object](https://www.npmjs.com/package/i18n-nodejs) when a `language.json` file exist. A simple example would be
```javascript
"use strict"

const path = require("path")

class Addon {
	constructor(tool, i18n) {
		this._tool = tool
	}
}
module.exports = Addon
```

### language.json (optional)
This is a language json file for the [i18n-nodejs](https://www.npmjs.com/package/i18n-nodejs) module. It's optional but recommended.

***

From here on you can do basically anything. You can modify the main document and destroy everything or build upon it. Now to the important parts. You get a TTVTool object when the addon is created. With this object you have access to pretty much every function of the tool. [Read more information about it here](TTVTool.md).