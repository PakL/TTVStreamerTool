const ffi = require('ffi')
const ref = require('ref')
const wchar_t = require('ref-wchar')
const wchar_string = wchar_t.string
const ArrayType = require('ref-array')

const ByteArray = ArrayType(ref.types.byte)

let lib = { l: {} }

/** It follows a number of definitions for documentation purporses. Those definitions are getting overwritten immediately. */

/**
 * The LogiLcdInit () function makes necessary initializations. You must call this function prior to any other function in the library.
 * @param {string} friendlyName the name of your applet, you can’t change it after initialization
 * @param {number} lcdType defines the type of your applet lcd target, it can be one of the following: LOGI_LCD_TYPE_MONO, LOGI_LCD_TYPE_COLOR If you want to initialize your applet for both LCD types just use LOGI_LCD_TYPE_MONO | LOGI_LCD_TYPE_COLOR
 * @returns {Boolean} If the function succeeds, it returns true. Otherwise false.
 */
lib.l.LogiLcdInit = (friendlyName, lcdType) => {return false;}
/**
 * The LogiLcdIsConnected () function checks if a device of the type specified by the parameter is connected.
 * @param {number} lcdType defines the lcd type to look for, it can be one of the following: LOGI_LCD_TYPE_MONO, LOGI_LCD_TYPE_COLOR If you want to initialize your applet for both LCD types just use LOGI_LCD_TYPE_MONO | LOGI_LCD_TYPE_COLOR
 * @returns {Boolean} If a device supporting the lcd type specified is found, it returns true. If the device has not been found or the LogiLcdInit function has not been called before, returns false.
 */
lib.l.LogiLcdIsConnected = (lcdType) => {return false;}
/**
 * The LogiLcdIsButtonPressed () function checks if the button specified by the parameter is being pressed.
 * @param {number} button defines the button to check on, it can be one of the following: LOGI_LCD_MONO_BUTTON_0, LOGI_LCD_MONO_BUTTON_1, LOGI_LCD_MONO_BUTTON_2, LOGI_LCD_MONO_BUTTON_3, LOGI_LCD_COLOR_BUTTON_LEFT, LOGI_LCD_COLOR_BUTTON_RIGHT, LOGI_LCD_COLOR_BUTTON_OK, LOGI_LCD_COLOR_BUTTON_CANCEL, LOGI_LCD_COLOR_BUTTON_UP, LOGI_LCD_COLOR_BUTTON_DOWN, LOGI_LCD_COLOR_BUTTON_MENU
 * @returns {Boolean} If the button specified is being pressed it returns true. Otherwise false.
 */
lib.l.LogiLcdIsButtonPressed = (button) => {return false;}
/**
 * The LogiLcdUpdate () function updates the lcd display.
 */
lib.l.LogiLcdUpdate = () => {}
/**
 * The LogiLcdShutdown () function kills the applet and frees memory used by the SDK.
 */
lib.l.LogiLcdShutdown = () => {}
/**
 * The LogiLcdMonoSetBackground () function sets the specified image as background for the monochrome lcd device connected.
 * @param {Object} monoBitmap the array of pixels that define the actual monochrome bitmap
 * @returns {Boolean} True if it succeeds, false otherwise.
 */
lib.l.LogiLcdMonoSetBackground = (monoBitmap) => {return false;}
/**
 * The LogiLcdMonoSetText () function sets the specified text in the requested line on the monochrome lcd device connected.
 * @param {number} lineNumber the line on the screen you want the text to appear. The monochrome lcd display has 4 lines, so this parameter can be any number from 0 to 3.
 * @param {string} text defines the text you want to display
 * @returns {Boolean} True if it succeeds, false otherwise.
 */
lib.l.LogiLcdMonoSetText = (lineNumber, text) => {return false;}
/**
 * The LogiLcdColorSetBackground () function sets the specified image as background for the color lcd device connected.
 * @param {Object} colorBitmap the array of pixels that define the actual color bitmap
 * @returns {Boolean} True if it succeeds, false otherwise.
 */
lib.l.LogiLcdColorSetBackground = (colorBitmap) => {return false;}
/**
 * The LogiLcdColorSetTitle () function sets the specified text in the first line on the color lcd device connected. The font size that will be displayed is bigger than the one used in the other lines, so you can use this function to set the title of your applet/page.
 * @param {string} text defines the text you want to display as title
 * @param {number} red this lcd can display a full RGB color gamma, you can define the color of your title using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your title will be white.
 * @param {number} green this lcd can display a full RGB color gamma, you can define the color of your title using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your title will be white.
 * @param {number} blue this lcd can display a full RGB color gamma, you can define the color of your title using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your title will be white.
 * @returns {Boolean} True if it succeeds, false otherwise.
 */
lib.l.LogiLcdColorSetTitle = (text, red, green, blue) => {return false;}
/**
 * The LogiLcdColorSetText () function sets the specified text in the requested line on the color lcd device connected.
 * @param {number} lineNumber the line on the screen you want the text to appear. The color lcd display has 8 lines for standard text, so this parameter can be any number from 0 to 7.
 * @param {string} text defines the text you want to display
 * @param {number} red this lcd can display a full RGB color gamma, you can define the color of your text using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your text will be white.
 * @param {number} green this lcd can display a full RGB color gamma, you can define the color of your text using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your text will be white.
 * @param {number} blue this lcd can display a full RGB color gamma, you can define the color of your text using this parameters. Values between 0 and 255 are accepted. The default value for this parameters is 255, so if you don’t specify any color, your text will be white.
 * @returns {Boolean} True if it succeeds, false otherwise.
 */
lib.l.LogiLcdColorSetText = (lineNumber, text, red, green, blue) => {return false;}

/** Actual stuff is going on now */


lib.load = function(libpath) {
	lib.l = ffi.Library(libpath, {
		'LogiLcdInit': ['bool', [wchar_string, 'int']],
		'LogiLcdIsConnected': ['bool', ['int']],
		'LogiLcdIsButtonPressed': ['bool', ['int']],
		'LogiLcdUpdate': ['void', []],
		'LogiLcdShutdown': ['void', []],

		'LogiLcdMonoSetBackground': ['bool', [ByteArray]],
		'LogiLcdMonoSetText': ['bool', ['int', wchar_string]],

		'LogiLcdColorSetBackground': ['bool', [ByteArray]],
		'LogiLcdColorSetTitle': ['bool', [wchar_string, 'int', 'int', 'int']],
		'LogiLcdColorSetText': ['bool', ['int', wchar_string, 'int', 'int', 'int']]
	})
}

lib.PIXEL_ARRAY = ByteArray

lib.LOGI_LCD_TYPE_MONO = 1
lib.LOGI_LCD_TYPE_COLOR = 2

lib.LOGI_LCD_MONO_BUTTON_0 = 1
lib.LOGI_LCD_MONO_BUTTON_1 = 2
lib.LOGI_LCD_MONO_BUTTON_2 = 4
lib.LOGI_LCD_MONO_BUTTON_3 = 8

lib.LOGI_LCD_COLOR_BUTTON_LEFT = 100
lib.LOGI_LCD_COLOR_BUTTON_RIGHT = 200
lib.LOGI_LCD_COLOR_BUTTON_OK = 400
lib.LOGI_LCD_COLOR_BUTTON_CANCEL = 800
lib.LOGI_LCD_COLOR_BUTTON_UP = 1000
lib.LOGI_LCD_COLOR_BUTTON_DOWN = 2000
lib.LOGI_LCD_COLOR_BUTTON_MENU = 4000

lib.LOGI_LCD_MONO_WIDTH = 160
lib.LOGI_LCD_MONO_HEIGHT = 43

lib.LOGI_LCD_COLOR_WIDTH = 320
lib.LOGI_LCD_COLOR_HEIGHT = 240

exports = module.exports = lib