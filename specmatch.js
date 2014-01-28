#!/usr/bin/env node

var fs=require('fs');
var parse=require('./').parseDocument;
var glob=require('glob');

var specfilePath = 'Specfile';
var variables = {};
var printTypes = [];

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
			console.log('USAGE: specmatch [-f <file>] [-V] [-?]');
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
			printTypes.push(args[i]);
			break;
	}
}

//console.log('Parsing '+JSON.stringify(specfilePath));
var data = fs.readFileSync(specfilePath, 'utf8');
var rules = parse(data);

//console.log('Parsed data:');
//console.log(require('util').inspect(rules, null, null));

var types = {};

var remaining = 1;
rules.resources.forEach(function(n){
	//var files = n.split(',').map(function(v){return v.trim()}).forEach(function(pattern){});
	remaining++;
	var pattern = n.pattern;
	if(!pattern){
		if(n.subject && n.subject[0]==='`' && n.subject[n.subject.length-1]==='`'){
			pattern = n.subject.substring(1,n.subject.length-1);
		}
	}

	if(!pattern) return;
	glob(pattern, {}, function (er, files) {
		n.properties.forEach(function(statement){
			if(statement.predicate==='type' || statement.predicate==='a'){
				statement.objects.forEach(function(object){
					var a = types[object] = types[object] || [];
					files.forEach(function(n){
						a.push(n);
					});
				});
			}
		});
		end();
	});
	
	function end(){
		if(--remaining===0) return void haveTypes();
	}
	end();
});

function haveTypes(){
	if(printTypes.length){
		printTypes.forEach(function(v){
			(types[v]||[]).forEach(function(w){
				console.log(w);
			});
		});
	}else{
		console.log(types);
	}
}
