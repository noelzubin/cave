build-client:
	cd client && pnpm run build

build-server:
	cd server && pnpm tsc

build: build-client build-server
	cp -r ./client/build ./server/dist/client

