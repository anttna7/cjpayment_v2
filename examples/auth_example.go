package main

import (
	"context"
	"fmt"
	"log"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/company/cjpayment/pkg/database"
)

// This example demonstrates how to use the authentication and permission system
func main() {
	ctx := context.Background()

	// Initialize database (you would use your actual database configuration)
	dbConfig := config.DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "cjpayment",
		Password: "password",
		DBName:   "cjpayment",
		SSLMode:  "disable",
	}

	db, err := database.ConnectX(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize repositories
	repoManager := repository.NewManager(db)

	// Initialize services
	serviceConfig := service.DefaultServiceConfig()
	serviceManager := service.NewServiceManager(repoManager, nil, serviceConfig)

	// Example 1: Create a new user
	fmt.Println("=== Example 1: User Registration ===")
	registerReq := &service.RegisterRequest{
		Username: "john_doe",
		Email:    "john@example.com",
		Password: "securepassword123",
		FullName: "John Doe",
	}

	registerResp, err := serviceManager.AuthService.Register(ctx, registerReq)
	if err != nil {
		log.Printf("Registration failed: %v", err)
	} else {
		fmt.Printf("User registered successfully: %s\n", registerResp.User.Username)
	}

	// Example 2: Create roles and permissions
	fmt.Println("\n=== Example 2: Create Roles and Permissions ===")
	
	// Create permissions
	readUsersPermission, err := serviceManager.PermissionService.CreatePermission(ctx, &service.CreatePermissionRequest{
		Resource:    "users",
		Action:      "read",
		Description: "Read user information",
	})
	if err != nil {
		log.Printf("Failed to create permission: %v", err)
	} else {
		fmt.Printf("Permission created: %s:%s\n", readUsersPermission.Resource, readUsersPermission.Action)
	}

	writeUsersPermission, err := serviceManager.PermissionService.CreatePermission(ctx, &service.CreatePermissionRequest{
		Resource:    "users",
		Action:      "write",
		Description: "Write user information",
	})
	if err != nil {
		log.Printf("Failed to create permission: %v", err)
	} else {
		fmt.Printf("Permission created: %s:%s\n", writeUsersPermission.Resource, writeUsersPermission.Action)
	}

	// Create roles
	adminRole, err := serviceManager.PermissionService.CreateRole(ctx, &service.CreateRoleRequest{
		Name:        "admin",
		Description: "Administrator role with full access",
	})
	if err != nil {
		log.Printf("Failed to create admin role: %v", err)
	} else {
		fmt.Printf("Role created: %s\n", adminRole.Name)
	}

	userRole, err := serviceManager.PermissionService.CreateRole(ctx, &service.CreateRoleRequest{
		Name:        "user",
		Description: "Regular user role with limited access",
	})
	if err != nil {
		log.Printf("Failed to create user role: %v", err)
	} else {
		fmt.Printf("Role created: %s\n", userRole.Name)
	}

	// Example 3: Assign permissions to roles
	fmt.Println("\n=== Example 3: Assign Permissions to Roles ===")
	
	if adminRole != nil && readUsersPermission != nil {
		err = serviceManager.PermissionService.AssignPermissionToRole(ctx, adminRole.ID, readUsersPermission.ID)
		if err != nil {
			log.Printf("Failed to assign permission to admin role: %v", err)
		} else {
			fmt.Printf("Assigned %s:%s to %s role\n", readUsersPermission.Resource, readUsersPermission.Action, adminRole.Name)
		}
	}

	if adminRole != nil && writeUsersPermission != nil {
		err = serviceManager.PermissionService.AssignPermissionToRole(ctx, adminRole.ID, writeUsersPermission.ID)
		if err != nil {
			log.Printf("Failed to assign permission to admin role: %v", err)
		} else {
			fmt.Printf("Assigned %s:%s to %s role\n", writeUsersPermission.Resource, writeUsersPermission.Action, adminRole.Name)
		}
	}

	if userRole != nil && readUsersPermission != nil {
		err = serviceManager.PermissionService.AssignPermissionToRole(ctx, userRole.ID, readUsersPermission.ID)
		if err != nil {
			log.Printf("Failed to assign permission to user role: %v", err)
		} else {
			fmt.Printf("Assigned %s:%s to %s role\n", readUsersPermission.Resource, readUsersPermission.Action, userRole.Name)
		}
	}

	// Example 4: Assign role to user
	fmt.Println("\n=== Example 4: Assign Role to User ===")
	
	if registerResp != nil && adminRole != nil {
		err = serviceManager.PermissionService.AssignRoleToUser(ctx, registerResp.User.ID, adminRole.ID)
		if err != nil {
			log.Printf("Failed to assign role to user: %v", err)
		} else {
			fmt.Printf("Assigned %s role to user %s\n", adminRole.Name, registerResp.User.Username)
		}
	}

	// Example 5: User login and token generation
	fmt.Println("\n=== Example 5: User Login ===")
	
	loginReq := &service.LoginRequest{
		Username: "john_doe",
		Password: "securepassword123",
	}

	loginResp, err := serviceManager.AuthService.Login(ctx, loginReq)
	if err != nil {
		log.Printf("Login failed: %v", err)
	} else {
		fmt.Printf("Login successful for user: %s\n", loginResp.User.Username)
		fmt.Printf("Access token: %s...\n", loginResp.TokenResponse.AccessToken[:50])
		fmt.Printf("Token expires at: %s\n", loginResp.TokenResponse.ExpiresAt)
	}

	// Example 6: Check user permissions
	fmt.Println("\n=== Example 6: Check User Permissions ===")
	
	if registerResp != nil {
		hasReadPermission, err := serviceManager.PermissionService.CheckPermission(ctx, registerResp.User.ID, "users", "read")
		if err != nil {
			log.Printf("Failed to check permission: %v", err)
		} else {
			fmt.Printf("User has 'users:read' permission: %t\n", hasReadPermission)
		}

		hasWritePermission, err := serviceManager.PermissionService.CheckPermission(ctx, registerResp.User.ID, "users", "write")
		if err != nil {
			log.Printf("Failed to check permission: %v", err)
		} else {
			fmt.Printf("User has 'users:write' permission: %t\n", hasWritePermission)
		}

		hasDeletePermission, err := serviceManager.PermissionService.CheckPermission(ctx, registerResp.User.ID, "users", "delete")
		if err != nil {
			log.Printf("Failed to check permission: %v", err)
		} else {
			fmt.Printf("User has 'users:delete' permission: %t\n", hasDeletePermission)
		}
	}

	// Example 7: Token validation
	fmt.Println("\n=== Example 7: Token Validation ===")
	
	if loginResp != nil {
		claims, err := serviceManager.AuthService.ValidateToken(ctx, loginResp.TokenResponse.AccessToken)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
		} else {
			fmt.Printf("Token is valid for user: %s\n", claims.Username)
			fmt.Printf("User roles: %v\n", claims.Roles)
		}
	}

	fmt.Println("\n=== Authentication and Permission System Demo Complete ===")
}