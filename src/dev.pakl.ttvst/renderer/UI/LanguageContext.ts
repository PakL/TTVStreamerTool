import React from 'react';
import TTVST from '../TTVST';
import i18n from 'i18n-nodejs';

let LanguageContext: React.Context<i18n> = null;

function createContext(tool?: TTVST) {
	if(LanguageContext === null) {
		LanguageContext = React.createContext(tool.i18n);
	}
	return LanguageContext;
}

export = createContext;