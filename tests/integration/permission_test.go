package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

// PermissionTestSuite tests the permission and access control system
type PermissionTestSuite struct {
	IntegrationTestSuite
}

// TestPermissionTestSuite runs the permission test suite
func TestPermissionTestSuite(t *testing.T) {
	suite.Run(t, new(PermissionTestSuite))
}

// TestRoleBasedAccessControl tests RBAC functionality
func (suite *PermissionTestSuite) TestRoleBasedAccessControl() {
	// Step 1: Create roles and permissions
	adminRole := suite.createTestRole("admin", "Administrator")
	financeRole := suite.createTestRole("finance", "Finance Officer")
	operatorRole := suite.createTestRole("operator", "Operator")

	// Create permissions
	rechargeCreatePerm := suite.createTestPermission("recharge", "create", "allow")
	rechargeViewPerm := suite.createTestPermission("recharge", "view", "allow")
	rechargeAuditPerm := suite.createTestPermission("recharge", "audit", "allow")
	merchantManagePerm := suite.createTestPermission("merchant", "manage", "allow")
	reportViewPerm := suite.createTestPermission("report", "view", "allow")

	// Assign permissions to roles
	// Admin has all permissions
	suite.assignPermissionToRole(adminRole.ID, rechargeCreatePerm.ID)
	suite.assignPermissionToRole(adminRole.ID, rechargeViewPerm.ID)
	suite.assignPermissionToRole(adminRole.ID, rechargeAuditPerm.ID)
	suite.assignPermissionToRole(adminRole.ID, merchantManagePerm.ID)
	suite.assignPermissionToRole(adminRole.ID, reportViewPerm.ID)

	// Finance can audit and view recharges, view reports
	suite.assignPermissionToRole(financeRole.ID, rechargeViewPerm.ID)
	suite.assignPermissionToRole(financeRole.ID, rechargeAuditPerm.ID)
	suite.assignPermissionToRole(financeRole.ID, reportViewPerm.ID)

	// Operator can only create and view recharges
	suite.assignPermissionToRole(operatorRole.ID, rechargeCreatePerm.ID)
	suite.assignPermissionToRole(operatorRole.ID, rechargeViewPerm.ID)

	// Step 2: Create users with different roles
	adminUser := suite.createTestUser("admin_user", "admin@example.com", "password123")
	financeUser := suite.createTestUser("finance_user", "finance@example.com", "password123")
	operatorUser := suite.createTestUser("operator_user", "operator@example.com", "password123")

	suite.assignRoleToUser(adminUser.ID, adminRole.ID)
	suite.assignRoleToUser(financeUser.ID, financeRole.ID)
	suite.assignRoleToUser(operatorUser.ID, operatorRole.ID)

	// Step 3: Test admin access (should have access to all endpoints)
	adminToken := suite.loginUser("admin_user", "password123")
	
	// Admin can create merchants
	merchantReq := map[string]interface{}{
		"name": "Test Merchant",
		"code": "TM001",
	}
	resp := suite.makeAuthenticatedRequest("POST", "/api/merchants", adminToken, merchantReq)
	suite.Equal(http.StatusCreated, resp.Code)

	// Admin can view reports
	resp = suite.makeAuthenticatedRequest("GET", "/api/reports/transactions", adminToken, nil)
	suite.Equal(http.StatusOK, resp.Code)

	// Step 4: Test finance user access
	financeToken := suite.loginUser("finance_user", "password123")

	// Finance cannot create merchants
	resp = suite.makeAuthenticatedRequest("POST", "/api/merchants", financeToken, merchantReq)
	suite.Equal(http.StatusForbidden, resp.Code)

	// Finance can view reports
	resp = suite.makeAuthenticatedRequest("GET", "/api/reports/transactions", financeToken, nil)
	suite.Equal(http.StatusOK, resp.Code)

	// Step 5: Test operator access
	operatorToken := suite.loginUser("operator_user", "password123")

	// Operator cannot create merchants
	resp = suite.makeAuthenticatedRequest("POST", "/api/merchants", operatorToken, merchantReq)
	suite.Equal(http.StatusForbidden, resp.Code)

	// Operator cannot view reports
	resp = suite.makeAuthenticatedRequest("GET", "/api/reports/transactions", operatorToken, nil)
	suite.Equal(http.StatusForbidden, resp.Code)

	// Operator can create recharge orders (assuming merchant exists)
	merchant := suite.createTestMerchant("Test Merchant", "TM001")
	account := suite.createTestReceiveAccount("Test Account", "12345678901", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "1000.00",
		"merchant_name":  "Test Merchant",
		"ad_account":     "AD123456",
		"remark":         "Test recharge",
	}
	resp = suite.makeAuthenticatedRequest("POST", "/api/recharge/create", operatorToken, rechargeReq)
	suite.Equal(http.StatusCreated, resp.Code)
}

// TestJWTTokenValidation tests JWT token validation
func (suite *PermissionTestSuite) TestJWTTokenValidation() {
	// Step 1: Test access without token
	resp := suite.makeRequest("GET", "/api/merchants", nil)
	suite.Equal(http.StatusUnauthorized, resp.Code)

	// Step 2: Test access with invalid token
	resp = suite.makeAuthenticatedRequest("GET", "/api/merchants", "invalid-token", nil)
	suite.Equal(http.StatusUnauthorized, resp.Code)

	// Step 3: Test access with valid token
	user := suite.createTestUser("test_user", "test@example.com", "password123")
	role := suite.createTestRole("test_role", "Test Role")
	perm := suite.createTestPermission("merchant", "view", "allow")
	suite.assignPermissionToRole(role.ID, perm.ID)
	suite.assignRoleToUser(user.ID, role.ID)

	token := suite.loginUser("test_user", "password123")
	resp = suite.makeAuthenticatedRequest("GET", "/api/merchants", token, nil)
	suite.Equal(http.StatusOK, resp.Code)
}

// TestPermissionInheritance tests permission inheritance from roles
func (suite *PermissionTestSuite) TestPermissionInheritance() {
	// Step 1: Create a role with permissions
	role := suite.createTestRole("test_role", "Test Role")
	perm1 := suite.createTestPermission("resource1", "action1", "allow")
	perm2 := suite.createTestPermission("resource2", "action2", "allow")
	
	suite.assignPermissionToRole(role.ID, perm1.ID)
	suite.assignPermissionToRole(role.ID, perm2.ID)

	// Step 2: Create user and assign role
	user := suite.createTestUser("test_user", "test@example.com", "password123")
	suite.assignRoleToUser(user.ID, role.ID)

	// Step 3: Login and get user permissions
	token := suite.loginUser("test_user", "password123")
	resp := suite.makeAuthenticatedRequest("GET", "/api/auth/permissions", token, nil)
	suite.Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	suite.NoError(err)

	permissions := result["data"].([]interface{})
	suite.Len(permissions, 2, "User should inherit all permissions from role")
}

// TestMultipleRoles tests users with multiple roles
func (suite *PermissionTestSuite) TestMultipleRoles() {
	// Step 1: Create roles with different permissions
	role1 := suite.createTestRole("role1", "Role 1")
	role2 := suite.createTestRole("role2", "Role 2")
	
	perm1 := suite.createTestPermission("resource1", "action1", "allow")
	perm2 := suite.createTestPermission("resource2", "action2", "allow")
	
	suite.assignPermissionToRole(role1.ID, perm1.ID)
	suite.assignPermissionToRole(role2.ID, perm2.ID)

	// Step 2: Create user and assign both roles
	user := suite.createTestUser("multi_role_user", "multi@example.com", "password123")
	suite.assignRoleToUser(user.ID, role1.ID)
	suite.assignRoleToUser(user.ID, role2.ID)

	// Step 3: Verify user has permissions from both roles
	token := suite.loginUser("multi_role_user", "password123")
	resp := suite.makeAuthenticatedRequest("GET", "/api/auth/permissions", token, nil)
	suite.Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	suite.NoError(err)

	permissions := result["data"].([]interface{})
	suite.Len(permissions, 2, "User should have permissions from all assigned roles")
}

// TestPermissionDenial tests explicit permission denial
func (suite *PermissionTestSuite) TestPermissionDenial() {
	// Step 1: Create role with deny permission
	role := suite.createTestRole("restricted_role", "Restricted Role")
	allowPerm := suite.createTestPermission("resource1", "action1", "allow")
	denyPerm := suite.createTestPermission("resource2", "action2", "deny")
	
	suite.assignPermissionToRole(role.ID, allowPerm.ID)
	suite.assignPermissionToRole(role.ID, denyPerm.ID)

	// Step 2: Create user and assign role
	user := suite.createTestUser("restricted_user", "restricted@example.com", "password123")
	suite.assignRoleToUser(user.ID, role.ID)

	// Step 3: Test that deny permissions override allow permissions
	token := suite.loginUser("restricted_user", "password123")
	
	// This should be allowed
	resp := suite.makeAuthenticatedRequest("GET", "/api/test/resource1/action1", token, nil)
	suite.NotEqual(http.StatusForbidden, resp.Code)

	// This should be denied
	resp = suite.makeAuthenticatedRequest("GET", "/api/test/resource2/action2", token, nil)
	suite.Equal(http.StatusForbidden, resp.Code)
}

// TestSessionManagement tests session and token management
func (suite *PermissionTestSuite) TestSessionManagement() {
	// Step 1: Create user and login
	user := suite.createTestUser("session_user", "session@example.com", "password123")
	token := suite.loginUser("session_user", "password123")

	// Step 2: Test token is valid
	resp := suite.makeAuthenticatedRequest("GET", "/api/auth/profile", token, nil)
	suite.Equal(http.StatusOK, resp.Code)

	// Step 3: Test logout
	resp = suite.makeAuthenticatedRequest("POST", "/api/auth/logout", token, nil)
	suite.Equal(http.StatusOK, resp.Code)

	// Step 4: Test token is invalid after logout
	resp = suite.makeAuthenticatedRequest("GET", "/api/auth/profile", token, nil)
	suite.Equal(http.StatusUnauthorized, resp.Code)
}

// Helper methods for permission testing

func (suite *PermissionTestSuite) createTestRole(name, description string) *repository.Role {
	role := &repository.Role{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
	}

	query := `INSERT INTO roles (id, name, description, created_at, updated_at) 
			  VALUES ($1, $2, $3, NOW(), NOW())`
	_, err := suite.DB.Exec(query, role.ID, role.Name, role.Description)
	suite.NoError(err)

	return role
}

func (suite *PermissionTestSuite) createTestPermission(resource, action, effect string) *repository.Permission {
	permission := &repository.Permission{
		ID:       uuid.New().String(),
		Resource: resource,
		Action:   action,
		Effect:   effect,
	}

	query := `INSERT INTO permissions (id, resource, action, effect, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, NOW(), NOW())`
	_, err := suite.DB.Exec(query, permission.ID, permission.Resource, permission.Action, permission.Effect)
	suite.NoError(err)

	return permission
}

func (suite *PermissionTestSuite) assignPermissionToRole(roleID, permissionID string) {
	query := `INSERT INTO role_permissions (id, role_id, permission_id, created_at) 
			  VALUES ($1, $2, $3, NOW())`
	_, err := suite.DB.Exec(query, uuid.New().String(), roleID, permissionID)
	suite.NoError(err)
}

func (suite *PermissionTestSuite) assignRoleToUser(userID, roleID string) {
	query := `INSERT INTO user_roles (id, user_id, role_id, created_at) 
			  VALUES ($1, $2, $3, NOW())`
	_, err := suite.DB.Exec(query, uuid.New().String(), userID, roleID)
	suite.NoError(err)
}

func (suite *PermissionTestSuite) createTestUser(username, email, password string) *repository.User {
	user := &repository.User{
		ID:       uuid.New().String(),
		Username: username,
		Email:    email,
		Password: password, // In real implementation, this should be hashed
		Status:   "active",
	}

	query := `INSERT INTO users (id, username, email, password, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`
	_, err := suite.DB.Exec(query, user.ID, user.Username, user.Email, user.Password, user.Status)
	suite.NoError(err)

	return user
}

func (suite *PermissionTestSuite) createTestMerchant(name, code string) *repository.Merchant {
	merchant := &repository.Merchant{
		ID:     uuid.New().String(),
		Name:   name,
		Code:   code,
		Status: "active",
	}

	query := `INSERT INTO merchants (id, name, code, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, NOW(), NOW())`
	_, err := suite.DB.Exec(query, merchant.ID, merchant.Name, merchant.Code, merchant.Status)
	suite.NoError(err)

	return merchant
}

func (suite *PermissionTestSuite) createTestReceiveAccount(name, number, paymentType string) *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		ID:            uuid.New().String(),
		AccountName:   name,
		AccountNumber: number,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   paymentType,
		Status:        "active",
	}

	query := `INSERT INTO receive_accounts (id, account_name, account_number, account_type, 
			  account_holder, payment_type, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`
	_, err := suite.DB.Exec(query, account.ID, account.AccountName, account.AccountNumber, 
		account.AccountType, account.AccountHolder, account.PaymentType, account.Status)
	suite.NoError(err)

	return account
}

func (suite *PermissionTestSuite) linkMerchantAccount(merchantID, accountID string) {
	query := `INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at) 
			  VALUES ($1, $2, $3, 1, true, NOW())`
	_, err := suite.DB.Exec(query, uuid.New().String(), merchantID, accountID)
	suite.NoError(err)
}

func (suite *PermissionTestSuite) loginUser(username, password string) string {
	loginReq := map[string]interface{}{
		"username": username,
		"password": password,
	}

	resp := suite.makeRequest("POST", "/api/auth/login", loginReq)
	suite.Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	suite.NoError(err)

	return result["data"].(map[string]interface{})["token"].(string)
}