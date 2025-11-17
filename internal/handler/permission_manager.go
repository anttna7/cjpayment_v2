package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// PermissionAction 权限操作枚举
type PermissionAction string

const (
	ActionView   PermissionAction = "view"   // 查看
	ActionCreate PermissionAction = "create" // 创建
	ActionUpdate PermissionAction = "update" // 更新
	ActionDelete PermissionAction = "delete" // 删除
	ActionExport PermissionAction = "export" // 导出
	ActionImport PermissionAction = "import" // 导入
	ActionAudit  PermissionAction = "audit"  // 审核
	ActionManage PermissionAction = "manage" // 管理（所有权限）
)

// PermissionResource 权限资源类型
type PermissionResource string

const (
	ResourceDashboard       PermissionResource = "dashboard"        // 仪表板
	ResourceMerchant        PermissionResource = "merchant"         // 商户管理
	ResourceAccount         PermissionResource = "account"          // 账户管理
	ResourceTransaction     PermissionResource = "transaction"      // 交易管理
	ResourceFinancialAudit  PermissionResource = "financial_audit" // 财务审核
	ResourceReport          PermissionResource = "report"           // 数据报表
	ResourceUser            PermissionResource = "user"             // 用户管理
	ResourceRole            PermissionResource = "role"             // 角色管理
	ResourcePermission      PermissionResource = "permission"       // 权限管理
	ResourceSystem          PermissionResource = "system"           // 系统管理
	ResourceSecurity        PermissionResource = "security"         // 安全中心
	ResourceAPI             PermissionResource = "api"              // API管理
	ResourceMonitoring      PermissionResource = "monitoring"       // 监控告警
	ResourceBackup          PermissionResource = "backup"           // 备份管理
	ResourceConfig          PermissionResource = "config"           // 系统配置
	ResourceRecharge        PermissionResource = "recharge"         // 充值管理
	ResourceReceivingAccount PermissionResource = "receiving_account" // 收款账户
	ResourcePollingRule     PermissionResource = "polling_rule"     // 轮询规则
)

// Permission 权限点结构
type Permission struct {
	ID          string             `json:"id"`
	Resource    PermissionResource `json:"resource"`
	Action      PermissionAction   `json:"action"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"`
	Level       int                `json:"level"` // 权限级别 1-5，5为最高
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// Role 角色结构
type Role struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"` // 权限ID列表
	Level       int      `json:"level"`       // 角色级别
	IsActive    bool     `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// User 用户结构
type User struct {
	ID            string    `json:"id"`
	Username      string    `json:"username"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	RoleID        string    `json:"role_id"`
	Status        string    `json:"status"` // ACTIVE, SUSPENDED, DISABLED
	LastLoginAt   *time.Time `json:"last_login_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PermissionManager 权限管理器
type PermissionManager struct {
	permissions map[string]*Permission
	roles       map[string]*Role
	users       map[string]*User
}

// NewPermissionManager 创建权限管理器
func NewPermissionManager() *PermissionManager {
	pm := &PermissionManager{
		permissions: make(map[string]*Permission),
		roles:       make(map[string]*Role),
		users:       make(map[string]*User),
	}

	pm.initializeDefaultPermissions()
	pm.initializeDefaultRoles()

	return pm
}

// initializeDefaultPermissions 初始化默认权限
func (pm *PermissionManager) initializeDefaultPermissions() {
	resources := []PermissionResource{
		ResourceDashboard, ResourceMerchant, ResourceAccount, ResourceTransaction,
		ResourceFinancialAudit, ResourceReport, ResourceUser, ResourceRole,
		ResourcePermission, ResourceSystem, ResourceSecurity, ResourceAPI,
		ResourceMonitoring, ResourceBackup, ResourceConfig, ResourceRecharge,
		ResourceReceivingAccount, ResourcePollingRule,
	}

	actions := []struct {
		action      PermissionAction
		name        string
		description string
		level       int
	}{
		{ActionView, "查看", "查看和浏览数据", 1},
		{ActionCreate, "创建", "创建新记录", 2},
		{ActionUpdate, "更新", "修改现有记录", 3},
		{ActionDelete, "删除", "删除记录", 4},
		{ActionExport, "导出", "导出数据", 2},
		{ActionImport, "导入", "导入数据", 3},
		{ActionAudit, "审核", "审核操作", 4},
		{ActionManage, "管理", "完全管理权限", 5},
	}

	resourceNames := map[PermissionResource]string{
		ResourceDashboard:       "仪表板",
		ResourceMerchant:        "商户管理",
		ResourceAccount:         "账户管理",
		ResourceTransaction:     "交易管理",
		ResourceFinancialAudit:  "财务审核",
		ResourceReport:          "数据报表",
		ResourceUser:            "用户管理",
		ResourceRole:            "角色管理",
		ResourcePermission:      "权限管理",
		ResourceSystem:          "系统管理",
		ResourceSecurity:        "安全中心",
		ResourceAPI:             "API管理",
		ResourceMonitoring:      "监控告警",
		ResourceBackup:          "备份管理",
		ResourceConfig:          "系统配置",
		ResourceRecharge:        "充值管理",
		ResourceReceivingAccount: "收款账户",
		ResourcePollingRule:     "轮询规则",
	}

	resourceCategories := map[PermissionResource]string{
		ResourceDashboard:       "核心功能",
		ResourceMerchant:        "业务管理",
		ResourceAccount:         "业务管理",
		ResourceTransaction:     "业务管理",
		ResourceFinancialAudit:  "财务管理",
		ResourceReport:          "数据分析",
		ResourceUser:            "用户权限",
		ResourceRole:            "用户权限",
		ResourcePermission:      "用户权限",
		ResourceSystem:          "系统管理",
		ResourceSecurity:        "系统管理",
		ResourceAPI:             "系统管理",
		ResourceMonitoring:      "系统管理",
		ResourceBackup:          "系统管理",
		ResourceConfig:          "系统管理",
		ResourceRecharge:        "充值管理",
		ResourceReceivingAccount: "充值管理",
		ResourcePollingRule:     "充值管理",
	}

	for _, resource := range resources {
		for _, action := range actions {
			// 某些资源不需要某些操作
			if !pm.isValidResourceAction(resource, action.action) {
				continue
			}

			id := fmt.Sprintf("%s:%s", resource, action.action)
			permission := &Permission{
				ID:          id,
				Resource:    resource,
				Action:      action.action,
				Name:        fmt.Sprintf("%s%s", resourceNames[resource], action.name),
				Description: fmt.Sprintf("对%s进行%s操作", resourceNames[resource], action.description),
				Category:    resourceCategories[resource],
				Level:       action.level,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
			pm.permissions[id] = permission
		}
	}
}

// isValidResourceAction 检查资源和操作的有效性
func (pm *PermissionManager) isValidResourceAction(resource PermissionResource, action PermissionAction) bool {
	// 某些资源的特殊规则
	switch resource {
	case ResourceDashboard:
		// 仪表板只支持查看和导出
		return action == ActionView || action == ActionExport
	case ResourcePermission:
		// 权限管理不支持删除（安全考虑）
		return action != ActionDelete
	case ResourceSystem, ResourceSecurity:
		// 系统和安全模块不支持导入
		return action != ActionImport
	default:
		return true
	}
}

// initializeDefaultRoles 初始化默认角色
func (pm *PermissionManager) initializeDefaultRoles() {
	roles := []struct {
		id          string
		name        string
		description string
		level       int
		permissions []string
	}{
		{
			id:          "SUPER_ADMIN",
			name:        "超级管理员",
			description: "拥有系统所有权限",
			level:       5,
			permissions: pm.getAllPermissionIDs(),
		},
		{
			id:          "ADMIN",
			name:        "管理员",
			description: "拥有大部分管理权限",
			level:       4,
			permissions: pm.getAdminPermissions(),
		},
		{
			id:          "FINANCIAL_MANAGER",
			name:        "财务主管",
			description: "财务相关完全权限",
			level:       3,
			permissions: pm.getFinancialManagerPermissions(),
		},
		{
			id:          "AUDITOR",
			name:        "审核员",
			description: "审核和查看权限",
			level:       2,
			permissions: pm.getAuditorPermissions(),
		},
		{
			id:          "OPERATOR",
			name:        "操作员",
			description: "基本操作权限",
			level:       2,
			permissions: pm.getOperatorPermissions(),
		},
		{
			id:          "VIEWER",
			name:        "查看员",
			description: "只读查看权限",
			level:       1,
			permissions: pm.getViewerPermissions(),
		},
	}

	for _, roleData := range roles {
		role := &Role{
			ID:          roleData.id,
			Name:        roleData.name,
			Description: roleData.description,
			Level:       roleData.level,
			Permissions: roleData.permissions,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		pm.roles[roleData.id] = role
	}
}

// 获取各角色的权限ID列表
func (pm *PermissionManager) getAllPermissionIDs() []string {
	var ids []string
	for id := range pm.permissions {
		ids = append(ids, id)
	}
	return ids
}

func (pm *PermissionManager) getAdminPermissions() []string {
	var ids []string
	for id, perm := range pm.permissions {
		// 管理员不能管理权限和超级用户
		if perm.Resource == ResourcePermission && perm.Action == ActionManage {
			continue
		}
		if perm.Level <= 4 {
			ids = append(ids, id)
		}
	}
	return ids
}

func (pm *PermissionManager) getFinancialManagerPermissions() []string {
	var ids []string
	financialResources := []PermissionResource{
		ResourceDashboard, ResourceAccount, ResourceTransaction,
		ResourceFinancialAudit, ResourceReport,
	}

	for id, perm := range pm.permissions {
		for _, resource := range financialResources {
			if perm.Resource == resource {
				ids = append(ids, id)
				break
			}
		}
	}
	return ids
}

func (pm *PermissionManager) getAuditorPermissions() []string {
	var ids []string
	for id, perm := range pm.permissions {
		// 审核员主要处理查看和审核操作
		if perm.Action == ActionView || perm.Action == ActionAudit || perm.Action == ActionExport {
			ids = append(ids, id)
		}
	}
	return ids
}

func (pm *PermissionManager) getOperatorPermissions() []string {
	var ids []string
	operatorResources := []PermissionResource{
		ResourceDashboard, ResourceMerchant, ResourceAccount,
		ResourceTransaction, ResourceRecharge,
	}

	for id, perm := range pm.permissions {
		for _, resource := range operatorResources {
			if perm.Resource == resource && perm.Level <= 3 {
				ids = append(ids, id)
				break
			}
		}
	}
	return ids
}

func (pm *PermissionManager) getViewerPermissions() []string {
	var ids []string
	for id, perm := range pm.permissions {
		if perm.Action == ActionView {
			ids = append(ids, id)
		}
	}
	return ids
}

// CheckPermission 检查用户权限
func (pm *PermissionManager) CheckPermission(userID string, resource PermissionResource, action PermissionAction) bool {
	user, exists := pm.users[userID]
	if !exists || user.Status != "ACTIVE" {
		return false
	}

	role, exists := pm.roles[user.RoleID]
	if !exists || !role.IsActive {
		return false
	}

	permissionID := fmt.Sprintf("%s:%s", resource, action)
	for _, pid := range role.Permissions {
		if pid == permissionID {
			return true
		}
		// 检查是否有管理权限（manage包含所有操作）
		if strings.HasPrefix(pid, string(resource)+":") && strings.HasSuffix(pid, ":manage") {
			return true
		}
	}

	return false
}

// API处理器

// HandleGetPermissions 获取权限列表
func (pm *PermissionManager) HandleGetPermissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 按分类组织权限
	permissionsByCategory := make(map[string][]*Permission)
	for _, perm := range pm.permissions {
		permissionsByCategory[perm.Category] = append(permissionsByCategory[perm.Category], perm)
	}

	response := map[string]interface{}{
		"success":     true,
		"permissions": permissionsByCategory,
		"total":       len(pm.permissions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleGetRoles 获取角色列表
func (pm *PermissionManager) HandleGetRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var roles []*Role
	for _, role := range pm.roles {
		roles = append(roles, role)
	}

	response := map[string]interface{}{
		"success": true,
		"roles":   roles,
		"total":   len(roles),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleCreateRole 创建角色
func (pm *PermissionManager) HandleCreateRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var roleData struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
		Level       int      `json:"level"`
	}

	if err := json.NewDecoder(r.Body).Decode(&roleData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 验证权限ID
	for _, permID := range roleData.Permissions {
		if _, exists := pm.permissions[permID]; !exists {
			http.Error(w, fmt.Sprintf("Invalid permission ID: %s", permID), http.StatusBadRequest)
			return
		}
	}

	roleID := fmt.Sprintf("ROLE_%d", time.Now().Unix())
	role := &Role{
		ID:          roleID,
		Name:        roleData.Name,
		Description: roleData.Description,
		Permissions: roleData.Permissions,
		Level:       roleData.Level,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	pm.roles[roleID] = role

	response := map[string]interface{}{
		"success": true,
		"message": "角色创建成功",
		"role":    role,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleUpdateRole 更新角色
func (pm *PermissionManager) HandleUpdateRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	roleID := r.URL.Query().Get("id")
	if roleID == "" {
		http.Error(w, "Role ID is required", http.StatusBadRequest)
		return
	}

	role, exists := pm.roles[roleID]
	if !exists {
		http.Error(w, "Role not found", http.StatusNotFound)
		return
	}

	var updateData struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
		Level       int      `json:"level"`
		IsActive    bool     `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 更新角色
	role.Name = updateData.Name
	role.Description = updateData.Description
	role.Permissions = updateData.Permissions
	role.Level = updateData.Level
	role.IsActive = updateData.IsActive
	role.UpdatedAt = time.Now()

	response := map[string]interface{}{
		"success": true,
		"message": "角色更新成功",
		"role":    role,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandlePermissionCheck 权限检查API
func (pm *PermissionManager) HandlePermissionCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var checkData struct {
		UserID   string             `json:"user_id"`
		Resource PermissionResource `json:"resource"`
		Action   PermissionAction   `json:"action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&checkData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	hasPermission := pm.CheckPermission(checkData.UserID, checkData.Resource, checkData.Action)

	response := map[string]interface{}{
		"success":        true,
		"has_permission": hasPermission,
		"user_id":        checkData.UserID,
		"resource":       checkData.Resource,
		"action":         checkData.Action,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}