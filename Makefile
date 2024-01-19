build-client:
	cd client && pnpm run build

build-server:
	cd server && pnpm lerna run build

build: build-client build-server
	cp -r ./client/build ./server/dist/client

