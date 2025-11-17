package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test helper functions
func setupMockDB(t *testing.T) (*sqlx.DB, sqlmock.Sqlmock) {
	mockDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	
	sqlxDB := sqlx.NewDb(mockDB, "postgres")
	return sqlxDB, mock
}

func createTestReceiveAccountForRepo() *ReceiveAccount {
	return &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "1234567890",
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "public",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.Zero,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		LastResetDate: time.Now().Truncate(24 * time.Hour),
	}
}

// Test Create
func TestReceiveAccountRepository_Create(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	account := createTestReceiveAccountForRepo()

	tests := []struct {
		name          string
		account       *ReceiveAccount
		setupMock     func()
		expectedError string
	}{
		{
			name:    "successful creation",
			account: account,
			setupMock: func() {
				mock.ExpectExec(`INSERT INTO receive_accounts`).
					WithArgs(
						sqlmock.AnyArg(), // id
						account.AccountName,
						account.AccountNumber,
						account.AccountType,
						account.BankName,
						account.BankBranch,
						account.AccountHolder,
						account.PaymentType,
						account.Status,
						account.DailyLimit,
						account.SingleLimit,
						account.DailyUsed,
						sqlmock.AnyArg(), // last_reset_date
						sqlmock.AnyArg(), // created_at
						sqlmock.AnyArg(), // updated_at
						account.CreatedBy,
						account.UpdatedBy,
					).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedError: "",
		},
		{
			name:    "database error",
			account: account,
			setupMock: func() {
				mock.ExpectExec(`INSERT INTO receive_accounts`).
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: "driver: bad connection",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := repo.Create(context.Background(), tt.account)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
				assert.NotEqual(t, uuid.Nil, tt.account.ID)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test GetByID
func TestReceiveAccountRepository_GetByID(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	account := createTestReceiveAccountForRepo()

	tests := []struct {
		name          string
		accountID     uuid.UUID
		setupMock     func()
		expectedError string
	}{
		{
			name:      "successful retrieval",
			accountID: account.ID,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{
					"id", "account_name", "account_number", "account_type", "custom_payment_provider",
					"bank_name", "bank_branch", "account_holder", "payment_type", "status",
					"daily_limit", "single_limit", "daily_used", "last_reset_date",
					"created_at", "updated_at", "created_by", "updated_by",
				}).AddRow(
					account.ID, account.AccountName, account.AccountNumber, account.AccountType, account.CustomPaymentProvider,
					account.BankName, account.BankBranch, account.AccountHolder, account.PaymentType, account.Status,
					account.DailyLimit, account.SingleLimit, account.DailyUsed, account.LastResetDate,
					account.CreatedAt, account.UpdatedAt, account.CreatedBy, account.UpdatedBy,
				)

				mock.ExpectQuery(`SELECT \* FROM receive_accounts WHERE id = \$1`).
					WithArgs(account.ID).
					WillReturnRows(rows)
			},
			expectedError: "",
		},
		{
			name:      "account not found",
			accountID: account.ID,
			setupMock: func() {
				mock.ExpectQuery(`SELECT \* FROM receive_accounts WHERE id = \$1`).
					WithArgs(account.ID).
					WillReturnError(sql.ErrNoRows)
			},
			expectedError: "sql: no rows in result set",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := repo.GetByID(context.Background(), tt.accountID)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, account.ID, result.ID)
				assert.Equal(t, account.AccountName, result.AccountName)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test Update
func TestReceiveAccountRepository_Update(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	account := createTestReceiveAccountForRepo()

	tests := []struct {
		name          string
		account       *ReceiveAccount
		setupMock     func()
		expectedError string
	}{
		{
			name:    "successful update",
			account: account,
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET`).
					WithArgs(
						account.AccountName,
						account.AccountNumber,
						account.AccountType,
						account.BankName,
						account.BankBranch,
						account.AccountHolder,
						account.PaymentType,
						account.Status,
						account.DailyLimit,
						account.SingleLimit,
						account.DailyUsed,
						account.LastResetDate,
						sqlmock.AnyArg(), // updated_at
						account.UpdatedBy,
						account.ID,
					).
					WillReturnResult(sqlmock.NewResult(0, 1))
			},
			expectedError: "",
		},
		{
			name:    "account not found",
			account: account,
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET`).
					WithArgs(
						account.AccountName,
						account.AccountNumber,
						account.AccountType,
						account.BankName,
						account.BankBranch,
						account.AccountHolder,
						account.PaymentType,
						account.Status,
						account.DailyLimit,
						account.SingleLimit,
						account.DailyUsed,
						account.LastResetDate,
						sqlmock.AnyArg(), // updated_at
						account.UpdatedBy,
						account.ID,
					).
					WillReturnResult(sqlmock.NewResult(0, 0))
			},
			expectedError: "receive account with id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := repo.Update(context.Background(), tt.account)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test List
func TestReceiveAccountRepository_List(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	account := createTestReceiveAccountForRepo()

	tests := []struct {
		name          string
		filter        *ReceiveAccountFilter
		setupMock     func()
		expectedError string
		expectedCount int
	}{
		{
			name: "successful list with no filter",
			filter: &ReceiveAccountFilter{
				Limit:  10,
				Offset: 0,
			},
			setupMock: func() {
				// Mock ping for database connection check
				mock.ExpectPing()

				rows := sqlmock.NewRows([]string{
					"id", "account_name", "account_number", "account_type", "custom_payment_provider",
					"bank_name", "bank_branch", "account_holder", "payment_type", "status",
					"daily_limit", "single_limit", "daily_used", "last_reset_date",
					"created_at", "updated_at", "created_by", "updated_by",
				}).AddRow(
					account.ID, account.AccountName, account.AccountNumber, account.AccountType, account.CustomPaymentProvider,
					account.BankName, account.BankBranch, account.AccountHolder, account.PaymentType, account.Status,
					account.DailyLimit, account.SingleLimit, account.DailyUsed, account.LastResetDate,
					account.CreatedAt, account.UpdatedAt, account.CreatedBy, account.UpdatedBy,
				)

				mock.ExpectQuery(`SELECT id, account_name, account_number`).
					WithArgs(10, 0).
					WillReturnRows(rows)
			},
			expectedError: "",
			expectedCount: 1,
		},
		{
			name: "successful list with account type filter",
			filter: &ReceiveAccountFilter{
				AccountType: stringPtr("alipay"),
				Limit:       10,
				Offset:      0,
			},
			setupMock: func() {
				// Mock ping for database connection check
				mock.ExpectPing()

				rows := sqlmock.NewRows([]string{
					"id", "account_name", "account_number", "account_type", "custom_payment_provider",
					"bank_name", "bank_branch", "account_holder", "payment_type", "status",
					"daily_limit", "single_limit", "daily_used", "last_reset_date",
					"created_at", "updated_at", "created_by", "updated_by",
				}).AddRow(
					account.ID, account.AccountName, account.AccountNumber, account.AccountType, account.CustomPaymentProvider,
					account.BankName, account.BankBranch, account.AccountHolder, account.PaymentType, account.Status,
					account.DailyLimit, account.SingleLimit, account.DailyUsed, account.LastResetDate,
					account.CreatedAt, account.UpdatedAt, account.CreatedBy, account.UpdatedBy,
				)

				mock.ExpectQuery(`SELECT id, account_name, account_number`).
					WithArgs("alipay", 10, 0).
					WillReturnRows(rows)
			},
			expectedError: "",
			expectedCount: 1,
		},
		{
			name: "database connection error",
			filter: &ReceiveAccountFilter{
				Limit:  10,
				Offset: 0,
			},
			setupMock: func() {
				mock.ExpectPing().WillReturnError(sql.ErrConnDone)
			},
			expectedError: "database connection failed",
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := repo.List(context.Background(), tt.filter)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, tt.expectedCount)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test Count
func TestReceiveAccountRepository_Count(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)

	tests := []struct {
		name          string
		filter        *ReceiveAccountFilter
		setupMock     func()
		expectedError string
		expectedCount int64
	}{
		{
			name: "successful count",
			filter: &ReceiveAccountFilter{
				AccountType: stringPtr("alipay"),
			},
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"count"}).AddRow(5)
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts`).
					WithArgs("alipay").
					WillReturnRows(rows)
			},
			expectedError: "",
			expectedCount: 5,
		},
		{
			name:   "nil filter",
			filter: nil,
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"count"}).AddRow(10)
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts`).
					WillReturnRows(rows)
			},
			expectedError: "",
			expectedCount: 10,
		},
		{
			name: "database error",
			filter: &ReceiveAccountFilter{
				AccountType: stringPtr("alipay"),
			},
			setupMock: func() {
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts`).
					WithArgs("alipay").
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: "failed to count accounts",
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := repo.Count(context.Background(), tt.filter)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Equal(t, int64(0), result)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedCount, result)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test ExistsByAccountNumber
func TestReceiveAccountRepository_ExistsByAccountNumber(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)

	tests := []struct {
		name          string
		accountNumber string
		setupMock     func()
		expectedError string
		expectedExists bool
	}{
		{
			name:          "account exists",
			accountNumber: "1234567890",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"count"}).AddRow(1)
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts WHERE account_number = \$1`).
					WithArgs("1234567890").
					WillReturnRows(rows)
			},
			expectedError:  "",
			expectedExists: true,
		},
		{
			name:          "account does not exist",
			accountNumber: "9876543210",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"count"}).AddRow(0)
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts WHERE account_number = \$1`).
					WithArgs("9876543210").
					WillReturnRows(rows)
			},
			expectedError:  "",
			expectedExists: false,
		},
		{
			name:          "database error",
			accountNumber: "1234567890",
			setupMock: func() {
				mock.ExpectQuery(`SELECT COUNT\(\*\) FROM receive_accounts WHERE account_number = \$1`).
					WithArgs("1234567890").
					WillReturnError(sql.ErrConnDone)
			},
			expectedError:  "failed to check account number existence",
			expectedExists: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			result, err := repo.ExistsByAccountNumber(context.Background(), tt.accountNumber)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.False(t, result)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedExists, result)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test UpdateDailyUsed
func TestReceiveAccountRepository_UpdateDailyUsed(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	accountID := uuid.New()
	amount := decimal.NewFromInt(100)

	tests := []struct {
		name          string
		accountID     uuid.UUID
		amount        decimal.Decimal
		setupMock     func()
		expectedError string
	}{
		{
			name:      "successful update",
			accountID: accountID,
			amount:    amount,
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET daily_used = daily_used \+ \$1, updated_at = NOW\(\) WHERE id = \$2`).
					WithArgs(amount, accountID).
					WillReturnResult(sqlmock.NewResult(0, 1))
			},
			expectedError: "",
		},
		{
			name:      "account not found",
			accountID: accountID,
			amount:    amount,
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET daily_used = daily_used \+ \$1, updated_at = NOW\(\) WHERE id = \$2`).
					WithArgs(amount, accountID).
					WillReturnResult(sqlmock.NewResult(0, 0))
			},
			expectedError: "receive account with id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := repo.UpdateDailyUsed(context.Background(), tt.accountID, tt.amount)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Test ResetDailyLimits
func TestReceiveAccountRepository_ResetDailyLimits(t *testing.T) {
	db, mock := setupMockDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)

	tests := []struct {
		name          string
		setupMock     func()
		expectedError string
	}{
		{
			name: "successful reset",
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET daily_used = 0, last_reset_date = \$1, updated_at = NOW\(\) WHERE last_reset_date < \$1`).
					WithArgs(sqlmock.AnyArg()).
					WillReturnResult(sqlmock.NewResult(0, 5))
			},
			expectedError: "",
		},
		{
			name: "database error",
			setupMock: func() {
				mock.ExpectExec(`UPDATE receive_accounts SET daily_used = 0, last_reset_date = \$1, updated_at = NOW\(\) WHERE last_reset_date < \$1`).
					WithArgs(sqlmock.AnyArg()).
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: "driver: bad connection",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMock()

			err := repo.ResetDailyLimits(context.Background())

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}