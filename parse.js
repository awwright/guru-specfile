#!/usr/bin/env node

var fs=require('fs');
var parse=require('./').parseSpecfile0;
var glob=require('glob');

var specfilePath = 'Specfile';
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
			actions.push(args[i]);
			break;
	}
}

console.log('Parsing '+JSON.stringify(specfilePath));
var data = fs.readFileSync(specfilePath, 'utf8');
var rules = parse(data);

console.log('Parsed data:');
console.log(require('util').inspect(rules, null, null));

var types = {};

var remaining = 0;
rules.resources.forEach(function(n){
	//var files = n.split(',').map(function(v){return v.trim()}).forEach(function(pattern){});
	remaining++;
	glob(n.pattern, {}, function (er, files) {
		n.directive.forEach(function(statement){
			if(statement.predicate==='type' || statement.predicate==='a'){
				statement.objects.forEach(function(object){
					var a = types[object] = types[object] || [];
					files.forEach(function(n){
						a.push(n);
					});
				});
			}
		});
		if(--remaining===0) return void haveTypes();
	})
});

function haveTypes(){
	console.log('TYPES:');
	console.log(types);
}
