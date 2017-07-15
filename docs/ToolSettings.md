# ToolSettings

« [Overview](Overview.md)

This module manages a few settings and gives you easy functions to store your settings in the localStorage.

» [Source](https://github.com/PakL/TTVStreamerTool/blob/master/lib/settings.js)

### Properties

* **language** `readonly`

  > **Loads and returns the selected application language.**<br>
  > type [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String)

* **showLocalizedNames** `readonly`

  > **Loads and returns weither or not localized names should be displayed.**<br>
  > type [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

* **autoRecoverMessages** `readonly`

  > **Loads and returns weither or not to auto recover deleted messages.**<br>
  > type [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

* **highlights** `readonly`

  > **Loads and returns an array of configured highlight objects.**<br>
  > type [Array](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array)

* **menu** `readonly`

  > **Creates and returns a settings menu. This always creates a new MenuItem. If you want access to the items in the application menu use getMenuItemById of the ToolUI.**<br>
  > type [MenuItem](https://electron.atom.io/docs/api/menu-item/)

### Functions

* **setLanguage(lang)**

  > **Sets the application language to `lang`. Please don't use this without explicit user interaction.**

  | Parameter | Type                                     | Description                              |
  | --------- | ---------------------------------------- | ---------------------------------------- |
  | lang      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The short i18n languge description. Currently only `en` and `de` are really supported. |

* **addHighlight()**

  > **Opens the dialog to add a new highlight.**

* checkHighlightRegexSyntax()

  > **Checks if the regex in the new highlight dialog is valid.**<br>
  > returns [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

* cancelNewHighlight()

  > **Hides the dialog to add a new highlight.**

* saveNewHighlight()

  > **Saves the currently entered new Highlight and hides the dialog.**

* removeHighlight(item)

  > **Removes a highlight by its menu entry. Will show a confirm dialog to the user.**

* creates_highlight_menu()

  > **Generates a highlight menu template for the menu generation. Wouldn't know why you would want to call this...**

* **getBoolean(name, defaultValue)**

  > **Load a boolean from the localStorage.**<br>
  > returns [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

  | Parameter    | Type                                     | Description                              |
  | ------------ | ---------------------------------------- | ---------------------------------------- |
  | name         | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value           |
  | defaultValue | [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | The default value you want returned if storage value was not found |

* **setBoolean(name, value)**

  > **Sets a boolean to the localStorage.**

  | Parameter | Type                                     | Description                    |
  | --------- | ---------------------------------------- | ------------------------------ |
  | name      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value |
  | value     | [Boolean](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | The value you want to set      |

* **getString(name, defaultValue)**

  > **Gets a string from the localStorage.**<br>
  > returns [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String)

  | Parameter    | Type                                     | Description                              |
  | ------------ | ---------------------------------------- | ---------------------------------------- |
  | name         | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value           |
  | defaultValue | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The default value you want returned if storage value was not found |

* **setString(name, value)**

  > **Sets a string to the localStroage.**

  | Parameter | Type                                     | Description                    |
  | --------- | ---------------------------------------- | ------------------------------ |
  | name      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value |
  | value     | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | The value you want to set      |

* **getJSON(name, defaultValue)**

  > **Gets a object from the localStorage.**<br>
  > returns [Object](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object)

  | Parameter    | Type                                     | Description                              |
  | ------------ | ---------------------------------------- | ---------------------------------------- |
  | name         | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value           |
  | defaultValue | [Object](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object) | The default value you want returned if storage value was not found |

* **setJSON(name, value)**

  > **Sets a JSON object to the localStorage.**

  | Parameter | Type                                     | Description                    |
  | --------- | ---------------------------------------- | ------------------------------ |
  | name      | [String](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String) | Name of the localStorage value |
  | value     | [Object](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object) | The value you want to set      |

