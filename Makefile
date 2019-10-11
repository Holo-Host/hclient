
NAME			= holo_hosting_web_sdk.js

build/index.js:		src/index.ts
	npx tsc --esModuleInterop --lib es2015,dom --outDir ./build ./src/index.ts

dist/$(NAME).js:	build/index.js
	npx webpack --mode production ./build/index.js --output-filename $(NAME).js

docs/index.html:	build/index.js
	npx jsdoc --verbose -c ./docs/.jsdoc.json --destination ./docs build/index.js


.PHONY:		src build dist docs watch-docs

build:			build/index.js
dist:			dist/$(NAME).js
docs:			docs/index.html

watch-docs:
	npx chokidar -d 3000 'src/**/*.ts' -c "make --no-print-directory docs" 2> /dev/null

clean-docs:
	git clean -df ./docs
