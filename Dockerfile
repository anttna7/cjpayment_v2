# Build stage
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata make upx

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the application with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static" -X main.version=${VERSION:-dev} -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)' \
    -a -installsuffix cgo \
    -tags netgo \
    -o main cmd/api/main.go

# Build migration tool
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -tags netgo \
    -o migrate cmd/migrate/main.go

# Compress binaries (optional, comment out if causing issues)
RUN upx --best --lzma main migrate || true

# Final stage
FROM scratch AS runtime

# Copy CA certificates and timezone data from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Create minimal filesystem structure
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Set working directory
WORKDIR /app

# Copy binaries from builder stage
COPY --from=builder /app/main .
COPY --from=builder /app/migrate .

# Copy configuration files
COPY --from=builder /app/configs ./configs

# Copy web assets
COPY --from=builder /app/web ./web

# Copy health check script
COPY --from=builder /app/scripts/healthcheck.sh ./scripts/

# Create non-root user in scratch (using numeric IDs)
USER 1001:1001

# Expose port
EXPOSE 8080

# Health check using internal endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/app/main", "-health-check"] || exit 1

# Command to run
CMD ["./main"]

# Development stage (for development with hot reload)
FROM golang:1.24-alpine AS development

# Install development dependencies
RUN apk add --no-cache git ca-certificates tzdata make curl postgresql-client redis

# Install development tools
RUN go install github.com/cosmtrek/air@latest
RUN go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Change ownership
RUN chown -R appuser:appgroup /app /go

# Switch to non-root user
USER appuser

# Expose ports (app + debugger)
EXPOSE 8080 2345

# Command for development (will be overridden by docker-compose)
CMD ["air", "-c", ".air.toml"]

# Production stage (optimized for production)
FROM alpine:3.19 AS production

# Install runtime dependencies and security updates
RUN apk --no-cache add ca-certificates tzdata curl dumb-init \
    && apk --no-cache upgrade \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Create app directory and set permissions
WORKDIR /app
RUN chown -R appuser:appgroup /app

# Copy binaries from builder stage
COPY --from=builder --chown=appuser:appgroup /app/main .
COPY --from=builder --chown=appuser:appgroup /app/migrate .

# Copy configuration files
COPY --from=builder --chown=appuser:appgroup /app/configs ./configs

# Copy web assets
COPY --from=builder --chown=appuser:appgroup /app/web ./web

# Copy health check script
COPY --from=builder --chown=appuser:appgroup /app/scripts/healthcheck.sh ./scripts/

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /tmp \
    && chown -R appuser:appgroup /app/uploads /app/logs /tmp \
    && chmod +x ./scripts/healthcheck.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check using custom script
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["./scripts/healthcheck.sh"]

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Command to run
CMD ["./main"]