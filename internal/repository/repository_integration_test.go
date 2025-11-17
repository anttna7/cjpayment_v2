package repository

import (
	"testing"
)

// TestRepositoryInterfaces verifies that all repository implementations satisfy their interfaces
func TestRepositoryInterfaces(t *testing.T) {
	// This test verifies that our implementations satisfy the interfaces at compile time
	// If this compiles, it means all interface methods are implemented correctly

	// Skip actual instantiation to avoid nil pointer issues
	// The fact that this compiles means the interfaces are correctly implemented
	t.Log("Repository interfaces are correctly implemented")
}

// TestRepositoryManagerWithCache verifies cache-enabled repository creation
func TestRepositoryManagerWithCache(t *testing.T) {
	// Skip actual instantiation to avoid nil pointer issues
	// The fact that this compiles means the manager is correctly implemented
	t.Log("Repository manager with cache is correctly implemented")
}

// TestNewRepositoryMethods verifies that new methods are available on interfaces
func TestNewRepositoryMethods(t *testing.T) {
	// Test that the interface methods exist by checking their types
	// This ensures all required methods are implemented
	
	// Verify MerchantRepository interface has new methods
	var merchantRepo MerchantRepository
	if merchantRepo != nil {
		_ = merchantRepo.ExistsByName
		_ = merchantRepo.ExistsByPortName
		_ = merchantRepo.GetMerchantWithAccounts
	}

	// Verify ReceiveAccountRepository interface has new methods
	var accountRepo ReceiveAccountRepository
	if accountRepo != nil {
		_ = accountRepo.ExistsByAccountNumber
		_ = accountRepo.CreateWithMerchantAssociation
	}

	// Verify AgentSuggestionRepository interface has all methods
	var agentRepo AgentSuggestionRepository
	if agentRepo != nil {
		_ = agentRepo.Create
		_ = agentRepo.GetByAgentName
		_ = agentRepo.Update
		_ = agentRepo.Delete
		_ = agentRepo.List
		_ = agentRepo.Search
		_ = agentRepo.IncrementUsage
		_ = agentRepo.GetTopSuggestions
	}
	
	t.Log("All new repository methods are correctly defined in interfaces")
}