package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/company/cjpayment/pkg/cache"
)

// agentSuggestionRepository implements AgentSuggestionRepository interface
type agentSuggestionRepository struct {
	*BaseRepository
}

// NewAgentSuggestionRepository creates a new agent suggestion repository
func NewAgentSuggestionRepository(db *sqlx.DB) AgentSuggestionRepository {
	return &agentSuggestionRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new agent suggestion
func (r *agentSuggestionRepository) Create(ctx context.Context, suggestion *AgentSuggestion) error {
	if suggestion.ID == uuid.Nil {
		suggestion.ID = uuid.New()
	}
	suggestion.CreatedAt = time.Now()
	suggestion.UpdatedAt = time.Now()
	suggestion.LastUsedAt = time.Now()
	
	if suggestion.UsageCount == 0 {
		suggestion.UsageCount = 1
	}

	query := `
		INSERT INTO agent_suggestions (id, agent_name, usage_count, last_used_at, created_at, updated_at)
		VALUES (:id, :agent_name, :usage_count, :last_used_at, :created_at, :updated_at)`

	_, err := r.db.NamedExecContext(ctx, query, suggestion)
	if err != nil {
		return fmt.Errorf("failed to create agent suggestion: %w", err)
	}
	return nil
}

// GetByAgentName retrieves an agent suggestion by agent name
func (r *agentSuggestionRepository) GetByAgentName(ctx context.Context, agentName string) (*AgentSuggestion, error) {
	var suggestion AgentSuggestion
	query := "SELECT * FROM agent_suggestions WHERE agent_name = $1"
	err := r.db.GetContext(ctx, &suggestion, query, agentName)
	if err != nil {
		return nil, err
	}
	return &suggestion, nil
}

// Update updates an agent suggestion
func (r *agentSuggestionRepository) Update(ctx context.Context, suggestion *AgentSuggestion) error {
	suggestion.UpdatedAt = time.Now()

	query := `
		UPDATE agent_suggestions 
		SET agent_name = :agent_name, usage_count = :usage_count, last_used_at = :last_used_at, updated_at = :updated_at
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, suggestion)
	if err != nil {
		return fmt.Errorf("failed to update agent suggestion: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("agent suggestion with id %s not found", suggestion.ID)
	}

	return nil
}

// Delete deletes an agent suggestion by ID
func (r *agentSuggestionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM agent_suggestions WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete agent suggestion: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("agent suggestion with id %s not found", id)
	}

	return nil
}

// List retrieves agent suggestions with filtering
func (r *agentSuggestionRepository) List(ctx context.Context, filter *AgentSuggestionFilter) ([]*AgentSuggestion, error) {
	var suggestions []*AgentSuggestion
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM agent_suggestions"

	// Build WHERE conditions
	if filter.AgentName != nil {
		conditions = append(conditions, fmt.Sprintf("agent_name = $%d", argIndex))
		args = append(args, *filter.AgentName)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("agent_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "usage_count"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}

	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
	}

	err := r.db.SelectContext(ctx, &suggestions, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list agent suggestions: %w", err)
	}
	return suggestions, nil
}

// Search searches agent suggestions by keyword with limit
func (r *agentSuggestionRepository) Search(ctx context.Context, keyword string, limit int) ([]*AgentSuggestion, error) {
	var suggestions []*AgentSuggestion
	query := `
		SELECT * FROM agent_suggestions 
		WHERE agent_name ILIKE $1 
		ORDER BY usage_count DESC, last_used_at DESC
		LIMIT $2`

	searchTerm := "%" + keyword + "%"
	err := r.db.SelectContext(ctx, &suggestions, query, searchTerm, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search agent suggestions: %w", err)
	}
	return suggestions, nil
}

// IncrementUsage increments the usage count for an agent suggestion or creates it if it doesn't exist
func (r *agentSuggestionRepository) IncrementUsage(ctx context.Context, agentName string) error {
	query := `
		INSERT INTO agent_suggestions (id, agent_name, usage_count, last_used_at, created_at, updated_at)
		VALUES ($1, $2, 1, $3, $3, $3)
		ON CONFLICT (agent_name) 
		DO UPDATE SET 
			usage_count = agent_suggestions.usage_count + 1,
			last_used_at = $3,
			updated_at = $3`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, uuid.New(), agentName, now)
	if err != nil {
		return fmt.Errorf("failed to increment agent suggestion usage: %w", err)
	}
	return nil
}

// GetTopSuggestions retrieves the top agent suggestions by usage count
func (r *agentSuggestionRepository) GetTopSuggestions(ctx context.Context, limit int) ([]*AgentSuggestion, error) {
	var suggestions []*AgentSuggestion
	query := `
		SELECT * FROM agent_suggestions 
		ORDER BY usage_count DESC, last_used_at DESC
		LIMIT $1`

	err := r.db.SelectContext(ctx, &suggestions, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top agent suggestions: %w", err)
	}
	return suggestions, nil
}

// cachedAgentSuggestionRepository implements AgentSuggestionRepository interface with caching
type cachedAgentSuggestionRepository struct {
	*CachedBaseRepository
}

// NewAgentSuggestionRepositoryWithCache creates a new cached agent suggestion repository
func NewAgentSuggestionRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) AgentSuggestionRepository {
	return &cachedAgentSuggestionRepository{
		CachedBaseRepository: NewCachedBaseRepository(db, cacheClient),
	}
}

// Create creates a new agent suggestion with cache invalidation
func (r *cachedAgentSuggestionRepository) Create(ctx context.Context, suggestion *AgentSuggestion) error {
	if suggestion.ID == uuid.Nil {
		suggestion.ID = uuid.New()
	}
	suggestion.CreatedAt = time.Now()
	suggestion.UpdatedAt = time.Now()
	suggestion.LastUsedAt = time.Now()
	
	if suggestion.UsageCount == 0 {
		suggestion.UsageCount = 1
	}

	query := `
		INSERT INTO agent_suggestions (id, agent_name, usage_count, last_used_at, created_at, updated_at)
		VALUES (:id, :agent_name, :usage_count, :last_used_at, :created_at, :updated_at)`

	_, err := r.db.NamedExecContext(ctx, query, suggestion)
	if err != nil {
		return fmt.Errorf("failed to create agent suggestion: %w", err)
	}

	// Invalidate cache
	r.InvalidatePattern("agent_suggestion:*")
	return nil
}

// GetByAgentName retrieves an agent suggestion by agent name with caching
func (r *cachedAgentSuggestionRepository) GetByAgentName(ctx context.Context, agentName string) (*AgentSuggestion, error) {
	cacheKey := fmt.Sprintf("agent_suggestion:name:%s", agentName)
	var suggestion AgentSuggestion
	
	err := r.GetWithCache(ctx, &suggestion, cacheKey, cache.MediumExpiration,
		"SELECT * FROM agent_suggestions WHERE agent_name = $1", agentName)
	if err != nil {
		return nil, err
	}
	return &suggestion, nil
}

// Update updates an agent suggestion with cache invalidation
func (r *cachedAgentSuggestionRepository) Update(ctx context.Context, suggestion *AgentSuggestion) error {
	suggestion.UpdatedAt = time.Now()

	query := `
		UPDATE agent_suggestions 
		SET agent_name = :agent_name, usage_count = :usage_count, last_used_at = :last_used_at, updated_at = :updated_at
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, suggestion)
	if err != nil {
		return fmt.Errorf("failed to update agent suggestion: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("agent suggestion with id %s not found", suggestion.ID)
	}

	// Invalidate cache
	r.InvalidatePattern("agent_suggestion:*")
	return nil
}

// Delete deletes an agent suggestion by ID with cache invalidation
func (r *cachedAgentSuggestionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM agent_suggestions WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete agent suggestion: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("agent suggestion with id %s not found", id)
	}

	// Invalidate cache
	r.InvalidatePattern("agent_suggestion:*")
	return nil
}

// List retrieves agent suggestions with caching
func (r *cachedAgentSuggestionRepository) List(ctx context.Context, filter *AgentSuggestionFilter) ([]*AgentSuggestion, error) {
	cacheKey := r.generateAgentSuggestionListCacheKey(filter)
	
	var suggestions []*AgentSuggestion
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM agent_suggestions"

	// Build WHERE conditions
	if filter.AgentName != nil {
		conditions = append(conditions, fmt.Sprintf("agent_name = $%d", argIndex))
		args = append(args, *filter.AgentName)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("agent_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "usage_count"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}

	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
	}

	// Use cache for simple queries
	if r.shouldCacheAgentSuggestionList(filter) {
		err := r.GetManyWithCache(ctx, &suggestions, cacheKey, cache.MediumExpiration, query, args...)
		return suggestions, err
	}

	// Direct database query for complex filters
	err := r.db.SelectContext(ctx, &suggestions, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list agent suggestions: %w", err)
	}
	return suggestions, nil
}

// Search searches agent suggestions by keyword with caching
func (r *cachedAgentSuggestionRepository) Search(ctx context.Context, keyword string, limit int) ([]*AgentSuggestion, error) {
	cacheKey := fmt.Sprintf("agent_suggestion:search:%s:%d", keyword, limit)
	
	var suggestions []*AgentSuggestion
	query := `
		SELECT * FROM agent_suggestions 
		WHERE agent_name ILIKE $1 
		ORDER BY usage_count DESC, last_used_at DESC
		LIMIT $2`

	searchTerm := "%" + keyword + "%"
	
	err := r.GetManyWithCache(ctx, &suggestions, cacheKey, cache.ShortExpiration, query, searchTerm, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search agent suggestions: %w", err)
	}
	return suggestions, nil
}

// IncrementUsage increments the usage count with cache invalidation
func (r *cachedAgentSuggestionRepository) IncrementUsage(ctx context.Context, agentName string) error {
	query := `
		INSERT INTO agent_suggestions (id, agent_name, usage_count, last_used_at, created_at, updated_at)
		VALUES ($1, $2, 1, $3, $3, $3)
		ON CONFLICT (agent_name) 
		DO UPDATE SET 
			usage_count = agent_suggestions.usage_count + 1,
			last_used_at = $3,
			updated_at = $3`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, uuid.New(), agentName, now)
	if err != nil {
		return fmt.Errorf("failed to increment agent suggestion usage: %w", err)
	}

	// Invalidate cache
	r.InvalidatePattern("agent_suggestion:*")
	return nil
}

// GetTopSuggestions retrieves the top agent suggestions with caching
func (r *cachedAgentSuggestionRepository) GetTopSuggestions(ctx context.Context, limit int) ([]*AgentSuggestion, error) {
	cacheKey := fmt.Sprintf("agent_suggestion:top:%d", limit)
	
	var suggestions []*AgentSuggestion
	query := `
		SELECT * FROM agent_suggestions 
		ORDER BY usage_count DESC, last_used_at DESC
		LIMIT $1`

	err := r.GetManyWithCache(ctx, &suggestions, cacheKey, cache.MediumExpiration, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top agent suggestions: %w", err)
	}
	return suggestions, nil
}

// generateAgentSuggestionListCacheKey generates a cache key for agent suggestion list queries
func (r *cachedAgentSuggestionRepository) generateAgentSuggestionListCacheKey(filter *AgentSuggestionFilter) string {
	key := "agent_suggestion_list"
	
	if filter.AgentName != nil {
		key += fmt.Sprintf(":name:%s", *filter.AgentName)
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		key += fmt.Sprintf(":keyword:%s", *filter.Keyword)
	}
	
	key += fmt.Sprintf(":order:%s:%s", filter.OrderBy, filter.OrderDir)
	key += fmt.Sprintf(":page:%d:%d", filter.Offset, filter.Limit)
	
	return key
}

// shouldCacheAgentSuggestionList determines if an agent suggestion list query should be cached
func (r *cachedAgentSuggestionRepository) shouldCacheAgentSuggestionList(filter *AgentSuggestionFilter) bool {
	// Cache simple queries without complex filters
	return filter.Keyword == nil || *filter.Keyword == ""
}