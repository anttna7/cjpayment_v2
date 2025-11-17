.PHONY: build run test clean migrate-up migrate-down migrate-create migrate-status migrate-version migrate-force migrate-reset migrate-validate docker-build docker-run

# Build the application
build:
	go build -o bin/api cmd/api/main.go
	go build -o bin/migrate cmd/migrate/main.go

# Run the application
run:
	go run cmd/api/main.go

# Run validation environment on port 8091
run-validation:
	CONFIG_ENV=validation CONFIG_FILE=./configs/config.validation.yaml go run cmd/api/main.go

# Run validation environment on port 8091 in background
run-validation-bg:
	@echo "Starting CJPayment validation server in background..."
	@CONFIG_ENV=validation CONFIG_FILE=./configs/config.validation.yaml nohup go run cmd/api/main.go > validation.log 2>&1 &
	@sleep 2
	@echo "🚀 Validation server started on port 8091"
	@echo "📊 Validation Dashboard: http://localhost:8091/validation"
	@echo "🏠 Main Dashboard: http://localhost:8091/dashboard"
	@echo "🔐 Login Page: http://localhost:8091/login"
	@echo "📝 Logs: tail -f validation.log"
	@echo "🛑 Stop server: make stop-validation"

# Stop validation environment
stop-validation:
	@echo "Stopping validation server..."
	@pkill -f "CONFIG_ENV=validation" || echo "No validation server running"
	@echo "Validation server stopped"

# Start validation environment with Docker
validation-start:
	docker-compose -f docker-compose.validation.yml up -d

# Stop validation environment
validation-stop:
	docker-compose -f docker-compose.validation.yml down

# View validation environment logs
validation-logs:
	docker-compose -f docker-compose.validation.yml logs -f

# Test commands
test:
	@echo "Running unit tests..."
	@./scripts/run_tests.sh -t unit

test-unit:
	@echo "Running unit tests..."
	@./scripts/run_tests.sh -t unit -v

test-integration:
	@echo "Running integration tests..."
	@./scripts/run_tests.sh -t integration -v

test-performance:
	@echo "Running performance tests..."
	@./scripts/run_tests.sh -t performance -v

test-e2e:
	@echo "Running end-to-end tests..."
	@./scripts/run_tests.sh -t e2e -v

test-all:
	@echo "Running all tests..."
	@./scripts/run_tests.sh -t all -v

test-coverage:
	@echo "Running tests with coverage..."
	@./scripts/run_tests.sh -t unit -c
	@echo "Coverage report generated: coverage.html"

test-race:
	@echo "Running tests with race detection..."
	@./scripts/run_tests.sh -t unit -r

test-benchmark:
	@echo "Running benchmark tests..."
	@go test -bench=. -benchmem ./internal/service/...

test-clean:
	@echo "Cleaning test artifacts..."
	@rm -f coverage.out coverage.html
	@mysql -u root -ppassword -e "DROP DATABASE IF EXISTS cjpayment_test;" 2>/dev/null || true

test-setup:
	@echo "Setting up test environment..."
	@mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS cjpayment_test;" 2>/dev/null || echo "Database may already exist"
	@echo "Test environment ready"

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Database migrations
migrate-up:
	go run cmd/migrate/main.go -command=up

migrate-down:
	go run cmd/migrate/main.go -command=down -steps=1

migrate-status:
	go run cmd/migrate/main.go -command=status

migrate-version:
	go run cmd/migrate/main.go -command=version

migrate-create:
	@read -p "Enter migration name: " name; \
	go run cmd/migrate/main.go -command=create -name="$$name"

migrate-force:
	@read -p "Enter version to force: " version; \
	go run cmd/migrate/main.go -command=force -version=$$version

migrate-reset:
	@echo "WARNING: This will drop all data and re-run migrations!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		go run cmd/migrate/main.go -command=drop && \
		go run cmd/migrate/main.go -command=up; \
	else \
		echo "Operation cancelled"; \
	fi

migrate-validate:
	go run scripts/validate-migrations.go

# Docker commands
docker-build:
	docker build -t cjpayment:latest .

docker-build-dev:
	docker build --target development -t cjpayment:dev .

docker-build-prod:
	docker build --target production -t cjpayment:prod .

docker-run:
	docker-compose up -d

docker-run-dev:
	docker-compose -f docker-compose.yml -f docker-compose.development.yml up -d

docker-run-staging:
	docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

docker-run-prod:
	docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

docker-stop:
	docker-compose down

docker-stop-all:
	docker-compose -f docker-compose.yml -f docker-compose.development.yml -f docker-compose.staging.yml -f docker-compose.production.yml down

docker-logs:
	docker-compose logs -f

docker-clean:
	docker system prune -f
	docker volume prune -f

# Deployment commands
deploy-dev:
	./scripts/deploy.sh -e development

deploy-staging:
	./scripts/deploy.sh -e staging

deploy-prod:
	./scripts/deploy.sh -e production

# Monitoring commands
monitoring-start:
	./scripts/start-monitoring.sh -e development

monitoring-start-full:
	./scripts/start-monitoring.sh -e development -l -t

monitoring-stop:
	docker-compose -f docker-compose.monitoring.yml down

monitoring-logs:
	docker-compose -f docker-compose.monitoring.yml logs -f

monitoring-restart:
	docker-compose -f docker-compose.monitoring.yml restart

# Development helpers
fmt:
	go fmt ./...

lint:
	golangci-lint run

mod-tidy:
	go mod tidy

# Install development tools
install-tools:
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Setup development environment
setup: install-tools mod-tidy
	@echo "Development environment setup complete"

# Show help
help:
	@echo "Available commands:"
	@echo "  build           - Build the application"
	@echo "  run             - Run the application"
	@echo "  run-validation  - Run validation environment on port 8091"
	@echo "  validation-start- Start validation environment with Docker"
	@echo "  validation-stop - Stop validation environment"
	@echo "  validation-logs - View validation environment logs"
	@echo "  test            - Run unit tests"
	@echo "  test-coverage   - Run tests with coverage report"
	@echo "  test-integration- Run integration tests"
	@echo "  test-performance- Run performance tests"
	@echo "  test-all        - Run all tests (unit + integration + performance)"
	@echo "  clean           - Clean build artifacts"
	@echo "  migrate-up      - Run database migrations up"
	@echo "  migrate-down    - Run database migrations down"
	@echo "  migrate-status  - Show migration status"
	@echo "  migrate-version - Show current migration version"
	@echo "  migrate-create  - Create new migration file"
	@echo "  migrate-force   - Force database to specific version"
	@echo "  migrate-reset   - Reset database (drop and re-migrate)"
	@echo "  migrate-validate- Validate migration files"
	@echo "  docker-build    - Build Docker image"
	@echo "  docker-build-dev- Build development Docker image"
	@echo "  docker-build-prod- Build production Docker image"
	@echo "  docker-run      - Run with Docker Compose"
	@echo "  docker-run-dev  - Run development environment"
	@echo "  docker-run-staging- Run staging environment"
	@echo "  docker-run-prod - Run production environment"
	@echo "  docker-stop     - Stop Docker Compose"
	@echo "  docker-stop-all - Stop all environments"
	@echo "  docker-logs     - View Docker logs"
	@echo "  docker-clean    - Clean Docker system"
	@echo "  deploy-dev      - Deploy to development"
	@echo "  deploy-staging  - Deploy to staging"
	@echo "  deploy-prod     - Deploy to production"
	@echo "  monitoring-start- Start basic monitoring stack"
	@echo "  monitoring-start-full- Start full monitoring stack (with logging & tracing)"
	@echo "  monitoring-stop - Stop monitoring stack"
	@echo "  monitoring-logs - View monitoring logs"
	@echo "  monitoring-restart- Restart monitoring services"
	@echo "  fmt             - Format Go code"
	@echo "  lint            - Run linter"
	@echo "  mod-tidy        - Tidy Go modules"
	@echo "  setup           - Setup development environment"
	@echo "  help            - Show this help message"

# Run validation environment with hot reload
run-validation-hot:
	@echo "Starting CJPayment validation server with hot reload..."
	@CONFIG_ENV=validation CONFIG_FILE=./configs/config.validation.yaml ~/go/bin/air -c .air.toml
