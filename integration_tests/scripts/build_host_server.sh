mkdir -p host_server

cd ..
npm run build
cp ./dist/* ./integration_tests/mocks/host_server/
