package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/company/cjpayment/pkg/cache"
)

// CachedBaseRepository extends BaseRepository with caching capabilities
type CachedBaseRepository struct {
	*BaseRepository
	cache           cache.Cache
	invalidator     *cache.CacheInvalidator
	queryOptimizer  *cache.SmartQueryOptimizer
	strategyManager *cache.CacheStrategyManager
}

// NewCachedBaseRepository creates a new cached base repository
func NewCachedBaseRepository(db *sqlx.DB, cacheClient cache.Cache) *CachedBaseRepository {
	base := NewBaseRepository(db)
	
	return &CachedBaseRepository{
		BaseRepository:  base,
		cache:           cacheClient,
		invalidator:     cache.NewCacheInvalidator(cacheClient),
		queryOptimizer:  cache.NewSmartQueryOptimizer(cacheClient),
		strategyManager: cache.NewCacheStrategyManager(),
	}
}

// GetCache returns the cache instance
func (r *CachedBaseRepository) GetCache() cache.Cache {
	return r.cache
}

// GetInvalidator returns the cache invalidator
func (r *CachedBaseRepository) GetInvalidator() *cache.CacheInvalidator {
	return r.invalidator
}

// GetQueryOptimizer returns the query optimizer
func (r *CachedBaseRepository) GetQueryOptimizer() *cache.SmartQueryOptimizer {
	return r.queryOptimizer
}

// GetWithCache retrieves data with caching support
func (r *CachedBaseRepository) GetWithCache(ctx context.Context, dest interface{}, cacheKey string, ttl time.Duration, query string, args ...interface{}) error {
	// Try to get from cache first
	err := r.cache.Get(cacheKey, dest)
	if err == nil {
		return nil // Cache hit
	}
	
	if err != cache.ErrCacheMiss {
		// Log cache error but continue with database query
		// In production, you might want to use a proper logger here
	}
	
	// Cache miss, get from database
	err = r.BaseRepository.GetOne(ctx, dest, query, args...)
	if err != nil {
		return err
	}
	
	// Cache the result
	if err := r.cache.Set(cacheKey, dest, ttl); err != nil {
		// Log cache set error but don't fail the request
	}
	
	return nil
}

// GetManyWithCache retrieves multiple records with caching support
func (r *CachedBaseRepository) GetManyWithCache(ctx context.Context, dest interface{}, cacheKey string, ttl time.Duration, query string, args ...interface{}) error {
	// Try to get from cache first
	err := r.cache.Get(cacheKey, dest)
	if err == nil {
		return nil // Cache hit
	}
	
	if err != cache.ErrCacheMiss {
		// Log cache error but continue with database query
	}
	
	// Cache miss, get from database
	err = r.BaseRepository.GetMany(ctx, dest, query, args...)
	if err != nil {
		return err
	}
	
	// Cache the result
	if err := r.cache.Set(cacheKey, dest, ttl); err != nil {
		// Log cache set error but don't fail the request
	}
	
	return nil
}

// GetByIDWithCache retrieves a record by ID with caching
func (r *CachedBaseRepository) GetByIDWithCache(ctx context.Context, dest interface{}, table string, id interface{}, cacheStrategy string) error {
	// Generate cache key using strategy
	cacheKey := r.strategyManager.GetStrategy(cacheStrategy).GetKey(fmt.Sprintf("%v", id))
	if cacheKey == "" {
		// Fallback to direct database query if no cache key
		return r.BaseRepository.GetByID(ctx, dest, table, id)
	}
	
	// Try cache first
	err := r.cache.Get(cacheKey, dest)
	if err == nil {
		return nil // Cache hit
	}
	
	if err != cache.ErrCacheMiss {
		// Log cache error but continue
	}
	
	// Get from database
	err = r.BaseRepository.GetByID(ctx, dest, table, id)
	if err != nil {
		return err
	}
	
	// Cache with strategy
	strategy := r.strategyManager.GetStrategy(cacheStrategy)
	if strategy != nil && strategy.ShouldCache(dest) {
		if err := r.cache.Set(cacheKey, dest, strategy.GetExpiration()); err != nil {
			// Log cache set error
		}
	}
	
	return nil
}

// InsertWithInvalidation inserts a record and invalidates related cache
func (r *CachedBaseRepository) InsertWithInvalidation(ctx context.Context, query string, entityType string, args ...interface{}) (string, error) {
	id, err := r.BaseRepository.Insert(ctx, query, args...)
	if err != nil {
		return "", err
	}
	
	// Invalidate related cache
	if err := r.invalidator.InvalidateByEvent(cache.InvalidationEvent{
		Type:      entityType,
		EntityID:  id,
		Action:    "create",
		Timestamp: time.Now(),
	}); err != nil {
		// Log invalidation error but don't fail the request
	}
	
	return id, nil
}

// UpdateWithInvalidation updates records and invalidates related cache
func (r *CachedBaseRepository) UpdateWithInvalidation(ctx context.Context, query string, entityType string, entityID string, args ...interface{}) (int64, error) {
	rowsAffected, err := r.BaseRepository.Update(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	
	// Invalidate related cache
	if err := r.invalidator.InvalidateByEvent(cache.InvalidationEvent{
		Type:      entityType,
		EntityID:  entityID,
		Action:    "update",
		Timestamp: time.Now(),
	}); err != nil {
		// Log invalidation error but don't fail the request
	}
	
	return rowsAffected, nil
}

// DeleteWithInvalidation deletes records and invalidates related cache
func (r *CachedBaseRepository) DeleteWithInvalidation(ctx context.Context, query string, entityType string, entityID string, args ...interface{}) (int64, error) {
	rowsAffected, err := r.BaseRepository.Delete(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	
	// Invalidate related cache
	if err := r.invalidator.InvalidateByEvent(cache.InvalidationEvent{
		Type:      entityType,
		EntityID:  entityID,
		Action:    "delete",
		Timestamp: time.Now(),
	}); err != nil {
		// Log invalidation error but don't fail the request
	}
	
	return rowsAffected, nil
}

// CountWithCache returns count with caching support
func (r *CachedBaseRepository) CountWithCache(ctx context.Context, table string, condition string, cacheKey string, ttl time.Duration, args ...interface{}) (int64, error) {
	// Try cache first
	var count int64
	err := r.cache.Get(cacheKey, &count)
	if err == nil {
		return count, nil // Cache hit
	}
	
	if err != cache.ErrCacheMiss {
		// Log cache error but continue
	}
	
	// Get from database
	count, err = r.BaseRepository.Count(ctx, table, condition, args...)
	if err != nil {
		return 0, err
	}
	
	// Cache the result
	if err := r.cache.Set(cacheKey, count, ttl); err != nil {
		// Log cache set error
	}
	
	return count, nil
}

// ExistsWithCache checks existence with caching support
func (r *CachedBaseRepository) ExistsWithCache(ctx context.Context, table string, condition string, cacheKey string, ttl time.Duration, args ...interface{}) (bool, error) {
	// Try cache first
	var exists bool
	err := r.cache.Get(cacheKey, &exists)
	if err == nil {
		return exists, nil // Cache hit
	}
	
	if err != cache.ErrCacheMiss {
		// Log cache error but continue
	}
	
	// Get from database
	exists, err = r.BaseRepository.Exists(ctx, table, condition, args...)
	if err != nil {
		return false, err
	}
	
	// Cache the result
	if err := r.cache.Set(cacheKey, exists, ttl); err != nil {
		// Log cache set error
	}
	
	return exists, nil
}

// InvalidateEntity invalidates cache for a specific entity
func (r *CachedBaseRepository) InvalidateEntity(entityType string, entityID string) error {
	return r.invalidator.InvalidateByEvent(cache.InvalidationEvent{
		Type:      entityType,
		EntityID:  entityID,
		Action:    "invalidate",
		Timestamp: time.Now(),
	})
}

// InvalidatePattern invalidates cache matching a pattern
func (r *CachedBaseRepository) InvalidatePattern(pattern string) error {
	return r.cache.DeletePattern(pattern)
}

// WarmupCache pre-loads data into cache
func (r *CachedBaseRepository) WarmupCache(cacheKey string, data interface{}, ttl time.Duration) error {
	return r.cache.Set(cacheKey, data, ttl)
}

// GetCacheStats returns cache statistics
func (r *CachedBaseRepository) GetCacheStats() map[string]interface{} {
	return r.queryOptimizer.GetCacheStats()
}