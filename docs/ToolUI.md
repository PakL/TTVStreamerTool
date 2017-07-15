This module helps control and manage the user interface. You can add viewable pages, menus or display error messages.

» [Source](https://github.com/PakL/TTVStreamerTool/blob/master/mod/toolui.js)

### Properties
* **pageBefore** `deprecated`
  > **Contains the page name that was open before the current. Has no use anymore.**<br>
  > type [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String)
* **currentPage**
  > **Contains the page name of the current page.**<br>
  > type [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String)
* **pages**
  > **Contains an array with [[UIPage]] elements. Please use addPage() to add pages!**<br>
  > type [Array](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array)
* **loadingElement**
  > **When loading this contains the loading HTML element with the animation and stuff.**<br>
  > type [null](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/null) | [HTMLElement](https://developer.mozilla.org/de/docs/Web/API/HTMLElement)
* **tool** `readonly`
  > **Gives you the main tool module.**<br>
  > type [TTVTool](TTVTool.md)
* **i18n** `readonly`
  > **Gives you the i18n module.**<br>
  > type [i18n-nodejs](https://www.npmjs.com/package/i18n-nodejs)

### Functions
* **findPage(name)**
  > **Finds a page by its name.**<br>
  > returns [null](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/null) | [UIPage](UIPage.md)

  | Parameter | Type                                     | Description                   |
  | --------- | ---------------------------------------- | ----------------------------- |
  | name      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The name of the page you want |
* **addPage(page)**
  > **Adds a page and creates a menu entry.**

  | Parameter | Type                | Description              |
  | --------- | ------------------- | ------------------------ |
  | page      | [UIPage](UIPage.md) | The page you want to add |
* **openPage(name)**
  > **Opens a page by its name. If no page is found by this name nothing happens.**

  | Parameter | Type                                     | Description                           |
  | --------- | ---------------------------------------- | ------------------------------------- |
  | name      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The name of the page you want to open |
* **addMenu(menuitem)**
  > **Adds a new menuitem to the application menu.**

  | Parameter | Type                                     | Description                   |
  | --------- | ---------------------------------------- | ----------------------------- |
  | menuitem  | [MenuItem](https://electron.atom.io/docs/api/menu-item/) | The menu item you want to add |
* **getMenuItemById(menuitemid[, menu])**
  > **Finds and returns a menu item by its id. Optionally you can pass a menu that should be searched. Submenus are being searched automatically.**
  > returns [null](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/null) | [MenuItem](https://electron.atom.io/docs/api/menu-item/)

  | Parameter  | Type                                     | Description                              |
  | ---------- | ---------------------------------------- | ---------------------------------------- |
  | menuitemid | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The menu item id you want to get         |
  | menu       | [Menu](https://electron.atom.io/docs/api/menu/) | *Optional.* The menu that is being searched. If non is given the application menu is searched. |

* **startLoading()**
  > **Displays the loading overlay.**
* **stopLoading()**
  > **Removes the loading overlay.**
* **showErrorMessage(error[, autohide])**
  > **Creates and displays a error message as an modal overlay and returns the created element.**
  > returns [HTMLElement](https://developer.mozilla.org/de/docs/Web/API/HTMLElement)

  | Parameter | Type                                     | Description                              |
  | --------- | ---------------------------------------- | ---------------------------------------- |
  | error     | [Error](https://nodejs.org/api/errors.html#errors_class_error) | The error you want to display. If an invalid error is given an unknown error message is shown. |
  | autohide  | [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | *Optional.* If this is set to true the message is being hidden after 5 seconds. Defaults to false. |