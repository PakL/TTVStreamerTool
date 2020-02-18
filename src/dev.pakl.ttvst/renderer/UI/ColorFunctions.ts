export interface IColorHSL {
	h: number;
	s: number;
	l: number;
}

export interface IColorRGB {
	r: number;
	g: number;
	b: number;
}

export function hexToRGB(hex: string): IColorRGB {
	hex = hex.replace(/#/, '');
	if(hex.length == 3) {
		hex = hex.replace(/(.)/g, '$1$1');
	}
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);
	return { r, g, b };
}

export function rgbToHex(rgb: IColorRGB) {
	let v = rgb.b | (rgb.g << 8) | (rgb.r << 16);
	let str = v.toString(16);
	if(str.length < 6) {
		str = '0' + str;
	}
	return str;
}

export function hexToLuma(color: string): number {
	let { r, g, b } = hexToRGB(color);
	return [
		0.299 * r,
		0.587 * g,
		0.114 * b
	].reduce((a, b) => a + b) / 255;
};

export function increaseBrightness(color: IColorRGB, amount: number): IColorRGB {
	let hsl = rgbToHsl(color.r, color.g, color.b);
	hsl.l += (amount / 100);
	if( hsl.l > 1 ) hsl.l = 1;
	if( hsl.l < 0 ) hsl.l = 0;
	let rgb = hslToRgb(hsl.h, hsl.s, hsl.l);

	return rgb;
}

export function setBrightness(color: IColorRGB, amount: number): IColorRGB {
	let hsl = rgbToHsl(color.r, color.g, color.b);
	hsl.l = (amount / 100);
	if( hsl.l > 1 ) hsl.l = 1;
	if( hsl.l < 0 ) hsl.l = 0;
	let rgb = hslToRgb(hsl.h, hsl.s, hsl.l);

	return rgb;
}

export function getBrightness(color: IColorRGB): number {
	let hsl = rgbToHsl(color.r, color.g, color.b);
	return (hsl.l * 100);
}

export function rgbToHsl(r: number, g: number, b: number): IColorHSL {
	r /= 255, g /= 255, b /= 255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if(max == min){
		h = s = 0; // achromatic
	}else{
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): IColorRGB {
	var r, g, b;

	if(s == 0) {
		r = g = b = l; // achromatic
	} else {
		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}

	return { 'r': r * 255, 'g': g * 255, 'b': b * 255 };
}

export function hue2rgb(p: number, q: number, t: number): number {
	if(t < 0) t += 1;
	if(t > 1) t -= 1;
	if(t < 1/6) return p + (q - p) * 6 * t;
	if(t < 1/2) return q;
	if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	return p;
}