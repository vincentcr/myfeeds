export APP_NAME  = myfeeds
export ENV      ?= dev
GO_SRC   = $(shell find . -type f -name '*.go')

SQL_DIR  = ./db
DOCKER_REGISTRY=tutum.co/polymatix
API_CONTAINER_NAME=${DOCKER_REGISTRY}/myfeeds-api
DB_CONTAINER_NAME=${DOCKER_REGISTRY}/myfeeds-db

default: build

build: $(APP_NAME)
$(APP_NAME): $(GO_SRC)
	godep go build -o $(APP_NAME) .


docker-build:
	docker-compose build

docker-run: docker-build
	docker-compose stop
	docker-compose up -d --force-recreate
	DB_HOST=$(docker-machine ip default) make db-views
	docker-compose logs

dev: build db-views
	./$(APP_NAME) -bind :3000

db-%:
	cd $(SQL_DIR) && ./build.sh $*

redis-flush:
	redis-cli flushall

clean:
	rm -f $(APP_NAME)

publish:
	docker build -t $(API_CONTAINER_NAME) .
	docker push $(API_CONTAINER_NAME)
	docker build -t $(DB_CONTAINER_NAME) db
	docker push $(DB_CONTAINER_NAME)
