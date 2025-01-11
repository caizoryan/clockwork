import { htmlEntities } from "./html.js";

let mapped = {}
let reverse = {}

Object.entries(htmlEntities).forEach(([key, value]) => {
	mapped[key.replace("&", "").replace(";", "")] = value.characters
})

Object.entries(mapped).forEach(([key, value]) => {
	reverse[value] = key
})

export const decodeHTML = function(str) {
	var map = mapped;
	return str.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, function($0, $1) {
		if ($1[0] === "#") {
			return String.fromCharCode(
				$1[1].toLowerCase() === "x"
					? parseInt($1.substr(2), 16)
					: parseInt($1.substr(1), 10),
			);
		} else {
			return map.hasOwnProperty($1) ? map[$1] : $0;
		}
	});
};



export function encodeHTML(s) {
	let escapeChars = reverse;
	let regexString = '[';
	for (let key in escapeChars) {
		regexString += key;
	}
	regexString += ']';

	let regex = new RegExp(regexString, 'g');

	return str.replace(regex, function(m) { return '&' + escapeChars[m] + ';'; });

}
