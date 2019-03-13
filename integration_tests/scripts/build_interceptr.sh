cd ./mocks/interceptr
npm install

cd ../../..
npm run clean
npm run build
cp ./dist/*.js ./integration_tests/mocks/interceptr/static/hclient.browser.min.js