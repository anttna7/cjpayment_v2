package handler

import (
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DepartmentHandler struct {
	departmentService service.DepartmentService
}

func NewDepartmentHandler(departmentService service.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{
		departmentService: departmentService,
	}
}

// POST /api/departments - 创建部门
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req service.CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	req.TenantID = tenantID.(uuid.UUID)

	department, err := h.departmentService.CreateDepartment(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Department created successfully",
		"data":    department,
	})
}

// GET /api/departments/:id - 获取部门详情
func (h *DepartmentHandler) GetDepartment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	department, err := h.departmentService.GetDepartmentByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": department})
}

// PUT /api/departments/:id - 更新部门
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	var req service.UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.departmentService.UpdateDepartment(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Department updated successfully"})
}

// DELETE /api/departments/:id - 删除部门
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	err = h.departmentService.DeleteDepartment(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Department deleted successfully"})
}

// GET /api/departments - 部门列表
func (h *DepartmentHandler) ListDepartments(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	departments, total, err := h.departmentService.ListDepartments(
		c.Request.Context(),
		tenantID.(uuid.UUID),
		page,
		pageSize,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      departments,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// POST /api/departments/:id/users - 分配用户到部门
func (h *DepartmentHandler) AssignUser(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	var req struct {
		UserID uuid.UUID `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.departmentService.AssignUserToDepartment(c.Request.Context(), req.UserID, departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User assigned to department successfully"})
}

// DELETE /api/departments/:id/users/:user_id - 从部门移除用户
func (h *DepartmentHandler) RemoveUser(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.departmentService.RemoveUserFromDepartment(c.Request.Context(), userID, departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User removed from department successfully"})
}

// POST /api/departments/:id/roles - 分配角色到部门
func (h *DepartmentHandler) AssignRole(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	var req struct {
		RoleID uuid.UUID `json:"role_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.departmentService.AssignRoleToDepartment(c.Request.Context(), departmentID, req.RoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned to department successfully"})
}

// DELETE /api/departments/:id/roles/:role_id - 从部门移除角色
func (h *DepartmentHandler) RemoveRole(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	roleID, err := uuid.Parse(c.Param("role_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	err = h.departmentService.RemoveRoleFromDepartment(c.Request.Context(), departmentID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role removed from department successfully"})
}

// GET /api/departments/:id/permissions - 获取部门权限
func (h *DepartmentHandler) GetPermissions(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	permissions, err := h.departmentService.GetDepartmentPermissions(c.Request.Context(), departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}

// GET /api/departments/:id/users - 获取部门用户列表
func (h *DepartmentHandler) GetDepartmentUsers(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	users, err := h.departmentService.GetDepartmentUsers(c.Request.Context(), departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}

// GET /api/departments/:id/roles - 获取部门角色列表
func (h *DepartmentHandler) GetDepartmentRoles(c *gin.Context) {
	departmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid department ID"})
		return
	}

	roles, err := h.departmentService.GetDepartmentRoles(c.Request.Context(), departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": roles})
}

// GET /api/users/:id/effective-permissions - 获取用户有效权限（含继承）
func (h *DepartmentHandler) GetUserEffectivePermissions(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	permissions, err := h.departmentService.GetUserEffectivePermissions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}
