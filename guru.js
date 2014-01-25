#!/usr/bin/env node

var fs=require('fs');
var parse=require('./').parseDocument;
var glob=require('glob');

var gulp=require('gulp');
var gulp_jshint=require('gulp-jshint');

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

//console.log('Parsing '+JSON.stringify(specfilePath));
var data = fs.readFileSync(specfilePath, 'utf8');
var rules = parse(data);

//console.log('Parsed data:');
//console.log(require('util').inspect(rules, null, null));

var types = {};

var remaining = 0;
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
		if(--remaining===0) return void haveTypes();
	})
});

var actionHandlers = {
	default: function defaultAction(){
		console.log(types);
	},
	JSHintTest: function JSHintTest(){
		var files = types['JSHintTest'] || [];
		gulp.src(files).pipe(gulp_jshint('.jshintrc')).pipe(gulp_jshint.reporter('default'));
	}
};

function haveTypes(){
	//console.log('TYPES:\n',console.log(types);
	if(!actions.length) actions.push('default');
	actions.forEach(function(v){
		var a = actionHandlers[v];
		if(!a) throw new Error('Unknown action '+v);
		a();
	});
}
