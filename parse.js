#!/usr/bin/env node

var fs=require('fs');
var parse=require('./').parseDocument;
var glob=require('glob');

var specfilePath = 'Specfile';
var variables = {};
var actions = [];

var args = process.argv.slice(2);
for(var i=0; i<args.length; i++){
	switch(args[i]){
		case '-f':
			specfilePath = args[++i];
			break;
		case '-V':
		case '--version':
			console.log('Guru Specfile v0');
			return;
		case '-?':
		case '--help':
			console.log('Guru Specfile very young');
			return;
		default:
			if(args[i][0]=='-'){
				console.error('Unknown argument '+JSON.stringify(args[i]));
				process.exit(2);
				return;
			}
			if(args[i].indexOf('=')>0){
				var vName = args[i].split('=',1)[0];
				var vValue = args[i].substring(vName.length+1);
				variables[vName] = vValue;
				break;
			}
			actions.push(args[i]);
			break;
	}
}

console.log('Parsing '+JSON.stringify(specfilePath));
var data = fs.readFileSync(specfilePath, 'utf8');
var rules = parse(data);

console.log('Parsed data:');
console.log(require('util').inspect(rules, null, null));
