# C8y-Core-Service 

## Description

This is the main service for data exporting and sharing solution based on [Cumulocity](https://cumulocity.com/guides/concepts/introduction/) 
The solution consists of three services: c8y-core-service(this), [c8y-data-service](https://github.com/martenka/c8y-data-service) and [c8y-admin](https://github.com/martenka/c8y-admin)

API documentation can be viewed by running the service and going to http://localhost:[PORT]/v1/api. API specification in JSON format is also found under [docs](docs) 
Port by default is 3001

## Installation

```bash
$ yarn install
```

## Running the solution

To run the whole solution, git clone this service,  [c8y-data-service](https://github.com/martenka/c8y-data-service) and [c8y-admin](https://github.com/martenka/c8y-admin),  
fill out necessary ENV variables and run the commands below. Dependencies (mongo, min.io, rabbitmq) will be run through  
docker, services will run on the host machine. 
For that Node.js V18 or greater should be used (lower may work but have not been tested with).  
You can use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) for easier Node.js version switching

The order of starting the services should be:
1. docker dependencies
2. c8y-data-service
3. c8y-core-service **Important:** Make sure data-service is running before starting core-service, otherwise the default user  
    may not be synced to data-service
4. c8y-admin

### ENV variables
Cumulocity account (that works with its API) is necessary for the solution to work.  
Please contact the author on getting the credentials if necessary for testing purposes

Before running the service, copy .env file from env folder to root path of this service and fill out the blank fields.
Default user is created using the .env variables (it can be turned off by removing the DEFAULT__USER) env variable.  
However user won't be overwritten on the next start, so it's safe to leave it be as well.

Other values don't have to be changed for **testing** purposes.

## Commands
```bash
# Databases
$ yarn docker:start

# Service in watch mode
$ yarn start:dev

# Production mode
$ yarn build && yarn start:prod
```

## Test

```bash
# Tests
$ yarn test

# Tests with coverage
$ yarn test:cov
```

## CKAN
CKAN is the external data portal to where downloaded files can be uploaded.  

### Running CKAN

To run copy the ckan-docker folder to somewhere outside this service and inside the ckan-docker folder run:
```bash
$ docker compose build
$ docker compose up
```

This will start CKAN, but startup will take some time.
After CKAN is ready, go to https://localhost:8443. Browser may not like the self-signed certificate, but in can be ignored for local testing.
Look up the default username from .env file in ckan-docker (CKAN_SYSADMIN_NAME) and default password (CKAN_SYSADMIN_PASSWORD)


See [c8y-data-service](https://github.com/martenka/c8y-data-service) on guide to setting up data-service specific env variables for CKAN
## License

[MIT license](LICENSE).
