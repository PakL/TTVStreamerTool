# TTVTool

« [Overview](Overview.md)

This module initializes pretty much everything and other modules have access to other modules over here.

» [Source](https://github.com/PakL/TTVStreamerTool/blob/master/mod/tool.js)

### Properties
* **ui** `readonly`
  > **Gives you the UI module.**<br>
  > type [ToolUI](ToolUI.md)
* **i18n** `readonly`
  > **Gives you the i18n-nodejs module.**<br>
  > type [i18n-nodejs](https://www.npmjs.com/package/i18n-nodejs)
* **settings** `readonly`
  > **Gives you the settings module.**<br>
  > type [ToolSettings](ToolSettings.md)
* **twitchapi** `readonly`
  > **Gives you the Twitch-API module.**<br>
  > type [TwitchTv](TwitchTv.md)
* **auth** `readonly`
  > **Gives you the auth module.**<br>
  > type [TTVLogin](TTVLogin.md)
* **chat** `readonly`
  > **Gives you the chat module.**<br>
  > type [Chat](Chat.md)
* **cockpit** `readonly`
  > **Gives you the cockpit module.**<br>
  > type [Cockpit](Cockpit.md)
* **overlays** `readonly`
  > **Gives you the overlay module.**<br>
  > type [Overlays](Overlays.md)
* **channel** `readonly`
  > **Gives you the channel data module.**<br>
  > type [Channel](Channel.md)
* **follows** `readonly`
  > **Gives you the follow data module.**<br>
  > type [Follows](Follows.md)
* <del>**subscriptions** `readonly`</del> `removed`
  > <del>**Gives you a subscription module.**</del><br>
  > type **undefined**
* **addons** `readonly`
  > **Gives you the addons module.**<br>
  > type [Addons](Addons.md)

### Events
* **load**
  > **Fires after the document was loaded. Basically window.onload. Use this instead of window.onload to not overwrite the onload function and breaking the entire application. Thank you. :)**<br>
  > No parameters.
* **exit**
  > **Fires before the application is exited. Once again just window.onbeforeunload. Don't overwrite window.onbeforeunload please.**<br>
  > No parameters.