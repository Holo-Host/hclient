
NAME			= holo_hosting_web_sdk

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

CURRENT_BRANCH = $(shell git branch | grep \* | cut -d ' ' -f2)
publish-docs:
	git branch -D gh-pages || true
	git checkout -b gh-pages
	make docs
	ln -s docs v$$( cat package.json | jq -r .version )
	git add -f docs
	git add v$$( cat package.json | jq -r .version )
	git commit -m "JSdocs v$$( cat package.json | jq -r .version )"
	git push -f origin gh-pages
	git checkout $(CURRENT_BRANCH)
