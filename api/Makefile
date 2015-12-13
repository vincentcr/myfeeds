export APP_NAME  = myfeeds
export ENV      ?= dev
GO_SRC   = $(shell find . -type f -name '*.go')

SQL_DIR  = ./db
DOCKER_REGISTRY=tutum.co/polymatix
API_CONTAINER_NAME=${DOCKER_REGISTRY}/myfeeds-api
DB_CONTAINER_NAME=${DOCKER_REGISTRY}/myfeeds-db
export POSTGRES_PASSWORD=soweak
DOCKER_DB_HOST=$(shell docker-machine ip default)
DOCKER_DB_PASSWD=$(shell cat docker-compose.yml| sed -n -e "s/^ *DB_PASSWD: *'\(.*\)'.*$$/\1/gp")
DOCKER_DB_NAME=$(shell cat docker-compose.yml| sed -n -e "s/^ *DB_NAME: *'\(.*\)'.*$$/\1/gp")
DOCKER_DB_USER=$(shell cat docker-compose.yml| sed -n -e "s/^ *DB_USER: *'\(.*\)'.*$$/\1/gp")
DOCKER_DB_ENV=$(shell echo DB_HOST=$(DOCKER_DB_HOST) DB_NAME=$(DOCKER_DB_NAME) DB_USER=$(DOCKER_DB_USER) DB_PASSWD=$(DOCKER_DB_PASSWD) )

default: build

build: $(APP_NAME)
$(APP_NAME): $(GO_SRC)
	godep go build -o $(APP_NAME) .

docker-build:
	docker-compose build api

docker-db-rebuild:
	docker-compose build postgres && \
	docker-compose stop postgres && \
	docker-compose rm -f -v postgres && \
	docker-compose up -d postgres && \
	docker-compose logs postgres

docker-db-%:
	$(DOCKER_DB_ENV) make db-$*

docker-run: docker-build
	docker-compose stop api
	docker-compose up -d api
	make docker-db-views
	docker-compose logs api

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
