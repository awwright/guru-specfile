A Specfile lets you declare what files in your project _are_ using a Turtle-like markup that lets you match filenames by a glob pattern.

It is used by Guru, the declarative, semantic, hugely extendable build system.

## API

	var specfile = require('guru-specfile');


### The Parser

	var info = specfile.parseDocument('someData goes "here".');
