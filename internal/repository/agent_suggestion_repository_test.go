package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAgentSuggestionRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	suggestion := &AgentSuggestion{
		ID:         uuid.New(),
		AgentName:  "Test Agent",
		UsageCount: 1,
		LastUsedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := repo.Create(ctx, suggestion)
	require.NoError(t, err)

	// Verify creation
	retrieved, err := repo.GetByAgentName(ctx, suggestion.AgentName)
	require.NoError(t, err)

	assert.Equal(t, suggestion.ID, retrieved.ID)
	assert.Equal(t, suggestion.AgentName, retrieved.AgentName)
	assert.Equal(t, suggestion.UsageCount, retrieved.UsageCount)
}

func TestAgentSuggestionRepository_CreateWithDefaults(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	suggestion := &AgentSuggestion{
		AgentName: "Test Agent with Defaults",
	}

	err := repo.Create(ctx, suggestion)
	require.NoError(t, err)

	// Verify defaults were set
	retrieved, err := repo.GetByAgentName(ctx, suggestion.AgentName)
	require.NoError(t, err)

	assert.NotEqual(t, uuid.Nil, retrieved.ID)
	assert.Equal(t, 1, retrieved.UsageCount)
	assert.False(t, retrieved.LastUsedAt.IsZero())
	assert.False(t, retrieved.CreatedAt.IsZero())
	assert.False(t, retrieved.UpdatedAt.IsZero())
}

func TestAgentSuggestionRepository_GetByAgentName(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create test suggestion
	suggestion := &AgentSuggestion{
		ID:         uuid.New(),
		AgentName:  "Test Agent",
		UsageCount: 5,
		LastUsedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := repo.Create(ctx, suggestion)
	require.NoError(t, err)

	// Test successful retrieval
	retrieved, err := repo.GetByAgentName(ctx, "Test Agent")
	require.NoError(t, err)
	assert.Equal(t, suggestion.ID, retrieved.ID)
	assert.Equal(t, suggestion.AgentName, retrieved.AgentName)
	assert.Equal(t, suggestion.UsageCount, retrieved.UsageCount)

	// Test non-existing agent
	_, err = repo.GetByAgentName(ctx, "Non-existing Agent")
	assert.Error(t, err)
}

func TestAgentSuggestionRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create initial suggestion
	suggestion := &AgentSuggestion{
		ID:         uuid.New(),
		AgentName:  "Test Agent",
		UsageCount: 1,
		LastUsedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := repo.Create(ctx, suggestion)
	require.NoError(t, err)

	// Update suggestion
	suggestion.AgentName = "Updated Agent"
	suggestion.UsageCount = 10
	newLastUsed := time.Now().Add(time.Hour)
	suggestion.LastUsedAt = newLastUsed

	err = repo.Update(ctx, suggestion)
	require.NoError(t, err)

	// Verify update
	retrieved, err := repo.GetByAgentName(ctx, "Updated Agent")
	require.NoError(t, err)

	assert.Equal(t, suggestion.ID, retrieved.ID)
	assert.Equal(t, "Updated Agent", retrieved.AgentName)
	assert.Equal(t, 10, retrieved.UsageCount)
	assert.True(t, retrieved.UpdatedAt.After(retrieved.CreatedAt))
}

func TestAgentSuggestionRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create test suggestion
	suggestion := &AgentSuggestion{
		ID:         uuid.New(),
		AgentName:  "Test Agent",
		UsageCount: 1,
		LastUsedAt: time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := repo.Create(ctx, suggestion)
	require.NoError(t, err)

	// Delete suggestion
	err = repo.Delete(ctx, suggestion.ID)
	require.NoError(t, err)

	// Verify deletion
	_, err = repo.GetByAgentName(ctx, suggestion.AgentName)
	assert.Error(t, err)

	// Test deleting non-existing suggestion
	err = repo.Delete(ctx, uuid.New())
	assert.Error(t, err)
}

func TestAgentSuggestionRepository_List(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create test suggestions
	suggestions := []*AgentSuggestion{
		{
			ID:         uuid.New(),
			AgentName:  "Agent A",
			UsageCount: 10,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "Agent B",
			UsageCount: 5,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "Different Agent",
			UsageCount: 15,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
	}

	for _, suggestion := range suggestions {
		err := repo.Create(ctx, suggestion)
		require.NoError(t, err)
	}

	tests := []struct {
		name           string
		filter         *AgentSuggestionFilter
		expectedCount  int
		expectedFirst  string
	}{
		{
			name: "list all suggestions ordered by usage count desc",
			filter: &AgentSuggestionFilter{
				OrderBy:  "usage_count",
				OrderDir: "DESC",
			},
			expectedCount: 3,
			expectedFirst: "Different Agent", // Highest usage count (15)
		},
		{
			name: "list with keyword filter",
			filter: &AgentSuggestionFilter{
				Keyword:  stringPtr("Agent"),
				OrderBy:  "usage_count",
				OrderDir: "DESC",
			},
			expectedCount: 3, // All contain "Agent"
			expectedFirst: "Different Agent",
		},
		{
			name: "list with specific agent name",
			filter: &AgentSuggestionFilter{
				AgentName: stringPtr("Agent A"),
			},
			expectedCount: 1,
			expectedFirst: "Agent A",
		},
		{
			name: "list with limit",
			filter: &AgentSuggestionFilter{
				Limit:    2,
				OrderBy:  "usage_count",
				OrderDir: "DESC",
			},
			expectedCount: 2,
			expectedFirst: "Different Agent",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := repo.List(ctx, tt.filter)
			require.NoError(t, err)

			assert.Len(t, results, tt.expectedCount)
			if tt.expectedCount > 0 {
				assert.Equal(t, tt.expectedFirst, results[0].AgentName)
			}
		})
	}
}

func TestAgentSuggestionRepository_Search(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create test suggestions
	suggestions := []*AgentSuggestion{
		{
			ID:         uuid.New(),
			AgentName:  "ABC Company",
			UsageCount: 10,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "XYZ Corporation",
			UsageCount: 5,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "ABC Industries",
			UsageCount: 15,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
	}

	for _, suggestion := range suggestions {
		err := repo.Create(ctx, suggestion)
		require.NoError(t, err)
	}

	tests := []struct {
		name          string
		keyword       string
		limit         int
		expectedCount int
		expectedFirst string
	}{
		{
			name:          "search for ABC",
			keyword:       "ABC",
			limit:         10,
			expectedCount: 2,
			expectedFirst: "ABC Industries", // Higher usage count
		},
		{
			name:          "search for Company",
			keyword:       "Company",
			limit:         10,
			expectedCount: 1,
			expectedFirst: "ABC Company",
		},
		{
			name:          "search with limit",
			keyword:       "ABC",
			limit:         1,
			expectedCount: 1,
			expectedFirst: "ABC Industries",
		},
		{
			name:          "search non-existing",
			keyword:       "NonExisting",
			limit:         10,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := repo.Search(ctx, tt.keyword, tt.limit)
			require.NoError(t, err)

			assert.Len(t, results, tt.expectedCount)
			if tt.expectedCount > 0 {
				assert.Equal(t, tt.expectedFirst, results[0].AgentName)
			}
		})
	}
}

func TestAgentSuggestionRepository_IncrementUsage(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	agentName := "Test Agent"

	// Test creating new suggestion via increment
	err := repo.IncrementUsage(ctx, agentName)
	require.NoError(t, err)

	// Verify creation
	suggestion, err := repo.GetByAgentName(ctx, agentName)
	require.NoError(t, err)
	assert.Equal(t, agentName, suggestion.AgentName)
	assert.Equal(t, 1, suggestion.UsageCount)

	// Test incrementing existing suggestion
	err = repo.IncrementUsage(ctx, agentName)
	require.NoError(t, err)

	// Verify increment
	suggestion, err = repo.GetByAgentName(ctx, agentName)
	require.NoError(t, err)
	assert.Equal(t, 2, suggestion.UsageCount)

	// Test multiple increments
	for i := 0; i < 5; i++ {
		err = repo.IncrementUsage(ctx, agentName)
		require.NoError(t, err)
	}

	suggestion, err = repo.GetByAgentName(ctx, agentName)
	require.NoError(t, err)
	assert.Equal(t, 7, suggestion.UsageCount) // 2 + 5
}

func TestAgentSuggestionRepository_GetTopSuggestions(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewAgentSuggestionRepository(db)
	ctx := context.Background()

	// Create test suggestions with different usage counts
	suggestions := []*AgentSuggestion{
		{
			ID:         uuid.New(),
			AgentName:  "Agent A",
			UsageCount: 5,
			LastUsedAt: time.Now().Add(-time.Hour),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "Agent B",
			UsageCount: 10,
			LastUsedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "Agent C",
			UsageCount: 15,
			LastUsedAt: time.Now().Add(-2*time.Hour),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
		{
			ID:         uuid.New(),
			AgentName:  "Agent D",
			UsageCount: 10, // Same usage as Agent B
			LastUsedAt: time.Now().Add(-30*time.Minute), // More recent than Agent B
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		},
	}

	for _, suggestion := range suggestions {
		err := repo.Create(ctx, suggestion)
		require.NoError(t, err)
	}

	tests := []struct {
		name          string
		limit         int
		expectedCount int
		expectedOrder []string
	}{
		{
			name:          "get top 2 suggestions",
			limit:         2,
			expectedCount: 2,
			expectedOrder: []string{"Agent C", "Agent B"}, // Ordered by usage_count DESC, then last_used_at DESC
		},
		{
			name:          "get all suggestions",
			limit:         10,
			expectedCount: 4,
			expectedOrder: []string{"Agent C", "Agent B", "Agent D", "Agent A"},
		},
		{
			name:          "get top 1 suggestion",
			limit:         1,
			expectedCount: 1,
			expectedOrder: []string{"Agent C"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results, err := repo.GetTopSuggestions(ctx, tt.limit)
			require.NoError(t, err)

			assert.Len(t, results, tt.expectedCount)
			for i, expectedName := range tt.expectedOrder {
				if i < len(results) {
					assert.Equal(t, expectedName, results[i].AgentName)
				}
			}
		})
	}
}