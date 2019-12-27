import { EOL as eol } from 'os';

export function encode(obj, opt){
	const children = [];
	let out = '';

	// opt.section is passed in recursively. If passed in on top-level, it'll affect both the top-level ini keys, and any children
	if(typeof opt === 'string'){
		opt = {
			section: opt,
			whitespace: false,
			inlineArrays: false
		};
	}else{
		opt = opt || {};
		opt.whitespace = opt.whitespace === true;
	}
	const separator = opt.whitespace ? ' = ' : '=';

	for(const [key, val] of Object.entries(obj)){
		if(val && Array.isArray(val)){
			val.forEach(function(item){
				if(opt.inlineArrays){
					out += safe(key) + separator + safe(item) + eol;
				}else{
					// real code
					out += safe(key + '[]') + separator + safe(item) + eol;
				}
			});
		}else if(val && typeof val === 'object'){
			children.push(key);
		}else{
			out += safe(key) + separator + safe(val) + eol;
		}
	}

	if(opt.section && out.length){
		out = '[' + safe(opt.section) + ']' + eol + out;
	}

	children.forEach(function(key){
		const parsedSection = dotSplit(key).join('\\.');
		const section = (opt.section ? opt.section + '.' : '') + parsedSection;
		const child = encode(obj[key], {
			section: section,
			whitespace: opt.whitespace,
			inlineArrays: opt.inlineArrays
		});
		if(out.length && child.length){
			out += eol;
		}
		out += child;
	});

	return out;
}

function dotSplit(str){
	return str.replace(/\1/g, '\u0002LITERAL\\1LITERAL\u0002')
		.replace(/\\\./g, '\u0001')
		.split(/\./).map(function(part){
			return part.replace(/\1/g, '\\.')
				.replace(/\2LITERAL\\1LITERAL\2/g, '\u0001');
		});
}

export function decode(str, opt = {}){
	const out = {};
	let ref = out;
	let section = null;
	//          section       |key        = value
	const re = /^\[([^\]]*)\]$|^([^=]+)(?:=(.*))?$/i;
	const lines = str.split(/[\r\n]+/g);
	const commentMatch = /^\s*[;#]/;
	lines.forEach(function(line){
		if(!line || line.match(commentMatch)){ return; }
		const match = line.match(re);
		if(!match){ return; }
		if(match[1] !== undefined){
			section = unsafe(match[1]);
			ref = out[section] = out[section] || {};
			return;
		}
		let key = unsafe(match[2]);
		let value = match[3] ? unsafe(match[3]) : true;
		switch(value){
			case 'true':
			case 'false':
			case 'null': value = JSON.parse(value);
		}

		// Convert keys with '[]' suffix to an array
		if(key.length > 2 && key.slice(-2) === '[]'){
			key = key.substring(0, key.length - 2);
			if(!ref[key]){
				ref[key] = [];
			}else if(!Array.isArray(ref[key])){
				ref[key] = [ref[key]];
			}
		}else if(opt.inlineArrays && typeof(ref[key]) !== 'undefined' && !Array.isArray(ref[key])){
			ref[key] = [ref[key]];
		}

		// safeguard against resetting a previously defined
		// array by accidentally forgetting the brackets
		if(Array.isArray(ref[key])){
			ref[key].push(value);
		}else{
			ref[key] = value;
		}
	});

	// {a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}
	// use a filter to return the keys that have to be deleted.
	Object.keys(out).filter(function(key){
		if(!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])){
			return false;
		}
		// see if the parent section is also an object.
		// if so, add it to that, and mark this one for deletion
		const parts = dotSplit(key);
		let p = out;
		const lastKey = parts.pop();
		const unescapedLastKey = lastKey.replace(/\\\./g, '.');
		parts.forEach(function(part){
			if(!p[part] || typeof p[part] !== 'object'){
				p[part] = {};
			}
			p = p[part];
		});
		if(p === out && unescapedLastKey === lastKey){
			return false;
		}
		p[unescapedLastKey] = out[key];
		return true;
	}).forEach(function(del){
		delete out[del];
	});

	return out;
}

// determines if string is encased in quotes
function isQuoted(val){
	return (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
}

// escapes the string val such that it is safe to be used as a key or value in an ini-file. Basically escapes quotes
function safe(val){
	// all kinds of values and keys
	if(typeof val !== 'string' || val.match(/[=\r\n]/) || val.match(/^\[/) || (val.length > 1 && isQuoted(val)) || val !== val.trim()){
		return JSON.stringify(val);
	}
	// comments
	return val.replace(/;/g, '\\;').replace(/#/g, '\\#');
}

// unescapes the string val
function unsafe(val){
	const escapableChars = '\\;#',
		commentChars = ';#';

	val = (val || '').trim();
	if(isQuoted(val)){
		// remove the single quotes before calling JSON.parse
		if(val.charAt(0) === "'"){
			val = val.substr(1, val.length - 2);
		}
		try{
			val = JSON.parse(val);
		}catch(e){
			// we tried :(
		}
		return val;
	}
	// walk the val to find the first not-escaped ; character
	let isEscaping = false;
	let escapedVal = '';
	for(let i = 0, l = val.length; i < l; i++){
		const c = val.charAt(i);
		if(isEscaping){
			// check if this character is an escapable character like \ or ; or #
			if(escapableChars.indexOf(c) !== -1){
				escapedVal += c;
			}else{
				escapedVal += '\\' + c;
			}
			isEscaping = false;
		}else if(commentChars.indexOf(c) !== -1){
			break;
		}else if(c === '\\'){
			isEscaping = true;
		}else{
			escapedVal += c;
		}
	}
	// we're still escaping - something isn't right. Close out with an escaped escape char
	if(isEscaping){
		escapedVal += '\\';
	}
	return escapedVal.trim();
}
