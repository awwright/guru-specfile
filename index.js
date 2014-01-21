
function debug(name, data, p){
	//console.log(name+'@'+p.l+':'+p.c+' '+JSON.stringify(data&&data.substr(p.o,100)));
}

function initSpecfile(s){
	var p = initPosition(s&&s.p || {});
	// p is position state: o is codepoint/offset, l is line, c is character in line
	return {p:p};
}

function initPosition(p){
	return {o:p.o||0, l:p.l||0, c:p.c||0};
}

function advanceCharacter(c){
	this.o++;
	if(c=="\n"){
		this.l++;
		this.c=0;
	}else{
		this.c++;
	}
}

function tokenErrorString(tok, p){
	return 'Unexpected token '+JSON.stringify(tok)+' on line '+p.l;
}

function consumeSpecfile(data, p){
	debug('Document', data, p);
	var r;
	var res =
		{ p: initPosition(p)
		, directives: []
		, resources: []
		};
	while(data[res.p.o]){
		if(r=consumeWhitespace(data, res.p)){
			res.p=r.p;
			continue;
		}
		if(r=consumeStatement(data, res.p)){
			res.p=r.p;
			res.resources.push({subject:r.subject, properties:r.properties});
			continue;
		}
		if(r=consumeDirective(data, res.p)){
			res.p=r.p;
			res.directives.push(r.directive);
			continue;
		}
		if(r=consumePattern(data, res.p)){
			res.p=r.p;
			res.resources.push({pattern:r.pattern, directive:r.directive});
			continue;
		}
		throw new Error(tokenErrorString(data[res.p.o],res.p));
	}
	return res;
}

function consumeWhitespace(data, x){
	var r, p=initPosition(x);
	//debug('Whitespace', data, p);
	while(data[p.o]){
		if(r=data[p.o].match(/[ \t\n]/)){ advanceCharacter.call(p, data[p.o]); continue; }
		// Comments are allowed anywhere whitespace is, so, define whitespace to include comments
		if(data[p.o]=='#' || data[p.o]=='/' && data[p.o+1]=='/'){
			// Read to end of line
			while(data[p.o]){
				if(data[p.o]==='\n') break;
				advanceCharacter.call(p, data[p.o]);
			}
			continue;
		}
		if(data[p.o]=='/' && data[p.o+1]=='*'){
			// Advance to end of block comment
			while(data[p.o]){
				if(data[p.o]==='*' && data[p.o+1]==='/') break;
				advanceCharacter.call(p, data[p.o]);
			}
			continue;
		}
		break;
	}
	if(x.o!=p.o) return {p:p};
}

function consumeDirective(data, p){
	debug('Directive', data, p);
	var r, p=initPosition(p), directive='';
	if(r=consumeWhitespace(data, p)){
		p=r.p;
	}
	if(data[p.o]!='@') return;
	//advanceCharacter.call(p, data[p.o]);
	while(data[p.o]){
		if(data[p.o]==='.') break;
		directive += data[p.o];
		advanceCharacter.call(p, data[p.o]);
	}
	advanceCharacter.call(p, data[p.o]);
	if(directive.length) return {p:p, directive:directive};
}

function consumePattern(data, p){
	debug('Pattern', data, p);
	var r, p=initPosition(p);
	var pattern='';
	while(data[p.o]){
		if(data[p.o]==='['){
			advanceCharacter.call(p, data[p.o]);
			break;
		}
		pattern += data[p.o];
		advanceCharacter.call(p, data[p.o]);
	}
	if(r=consumePatternDirective(data, p)){
		p=r.p;
		directive=r.statements;
	}else{
		directive=[];
	}
	if(r=consumeWhitespace(data, p)){
		p=r.p;
	}
	if(data[p.o]!==']') return;
	advanceCharacter.call(p, data[p.o]);
	if(directive.length) return {p:p, pattern:pattern, directive:directive};
}

function consumeStatement(data, p){
	debug('Statement.Subject', data, p);
	var r, p=initPosition(p);
	var subject='';
	var properties=[];

	// Consume the subject
	// TODO allow a URI, a Glob, or a CURIE
	while(data[p.o]){
		if(data[p.o].match(/\s/)) break;
		subject += data[p.o];
		advanceCharacter.call(p, data[p.o]);
	}
	advanceCharacter.call(p, data[p.o]);

	debug('Statement.Properties', data, p);
	// Consume one or more properties
	if(r=consumeProperty(data, p)){
		properties.push({predicate:r.predicate, objects:r.objects});
		p=r.p;
	}else return;
	while(data[p.o]){
		// Consume whitespace, a ";", then another property
		if(r=consumeWhitespace(data, p)) p=r.p;
		if(data[p.o]!=';') break;
		advanceCharacter.call(p, data[p.o]);
		if(r=consumeProperty(data, p)){
			properties.push({predicate:r.predicate, objects:r.objects});
			p=r.p;
		}else break;
	}
	if(r=consumeWhitespace(data, p)) p=r.p;
	if(data[p.o]!=='.') return;
	advanceCharacter.call(p, data[p.o]);
	if(properties.length) return {p:p, subject:subject, properties:properties};
}

function consumePatternDirective(data, p){
	debug('PatternDirective', data, p);
	var r, p=initPosition(p);
	var statements = [];
	if(r=consumeProperty(data, p)){
		statements.push({predicate:r.predicate, objects:r.objects});
		p=r.p;
	}else return;
	while(data[p.o]){
		// Consume whitespace, a ";", then another property
		if(r=consumeWhitespace(data, p)) p=r.p;
		if(data[p.o]!=';') break;
		advanceCharacter.call(p, data[p.o]);
		if(r=consumeProperty(data, p)){
			statements.push({predicate:r.predicate, objects:r.objects});
			p=r.p;
		}else break;
	}
	if(statements.length) return {p:p, statements:statements};
}

function consumeProperty(data, p){
	var r, p=initPosition(p);
	var predicate='';
	var objects=[];
	if(r=consumeWhitespace(data, p)){
		p=r.p;
	}
	debug('Property', data, p);
	// An invalid statement is no statement
	if(!data[p.o] || !data[p.o].match(/[a-zA-Z<>]/)) return;
	// Consume the statement name
	while(data[p.o] && data[p.o].match(/[a-zA-Z0-9:_\-\/<>]/)){
		predicate += data[p.o];
		advanceCharacter.call(p, data[p.o]);
	}
	if(r=consumeObject(data, p)){
		objects.push(r.object);
		p=r.p;
	}else return;
	while(data[p.o]){
		// Consume whitespace, a ",", then another object
		if(r=consumeWhitespace(data, p)) p=r.p;
		if(data[p.o]!=',') break;
		advanceCharacter.call(p, data[p.o]);
		if(r=consumeObject(data, p)){
			objects.push(r.object);
			p=r.p;
		}else break;
	}
	if(objects.length) return {p:p, predicate:predicate, objects:objects};
}

function consumeObject(data, p){
	var r, p=initPosition(p);
	var object='';
	if(r=consumeWhitespace(data, p)){
		p=r.p;
	}
	debug('Object', data, p);
	// FIXME consume a string, or token
	if(r=(consumeString(data, p)||consumeURI(data, p))){
		p=r.p;
		object=r.value;
	}else{
		// consume a token until the next whitespace
		while(data[p.o]){
			if(data[p.o].match(/[ \t\n,;.\]]/)) break;
			object += data[p.o];
			advanceCharacter.call(p, data[p.o]);
		}
	}
	if(object) return {p:p, object:object};
}

function consumeString(data, p){
	debug('String', data, p);
	var r, p=initPosition(p);
	if(data[p.o]!='"') return;
	var json='';
	while(data[p.o]){
		if(data[p.o]==='\\'){
			// Skip two characters
			json += data[p.o];
			advanceCharacter.call(p, data[p.o]);
		}
		json += data[p.o];
		advanceCharacter.call(p, data[p.o]);
		if(data[p.o]==='"'){
			json += data[p.o];
			advanceCharacter.call(p, data[p.o]);
			break;
		}
	}
	if(json.length){
		return {p:p, value:JSON.parse(json)};
	}
}

function consumeURI(data, p){
	debug('URI', data, p);
	var r, p=initPosition(p);
	if(data[p.o]!='<') return;
	var json='';
	while(data[p.o]){
		if(data[p.o]==='\\'){
			// Skip two characters
			json += data[p.o];
			advanceCharacter.call(p, data[p.o]);
		}
		json += data[p.o];
		advanceCharacter.call(p, data[p.o]);
		if(data[p.o].match(/[ \t\n]/)) throw new Error(tokenErrorString(data[p.o], p));
		if(data[p.o]==='>') break;
	}
	if(json.length){
		return {p:p, value:json.substring(1,json.length-2)};
	}
}

exports.parseSpecfile0 = parseSpecfile0;
function parseSpecfile0(data){
	return consumeSpecfile(data, initPosition({}));
}
