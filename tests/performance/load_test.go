package performance

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// LoadTestConfig defines configuration for load testing
type LoadTestConfig struct {
	BaseURL           string
	Duration          time.Duration
	ConcurrentUsers   int
	RampUpTime        time.Duration
	RequestsPerSecond int
	TestScenarios     []TestScenario
}

// TestScenario defines a test scenario
type TestScenario struct {
	Name        string
	Method      string
	Path        string
	Body        interface{}
	Headers     map[string]string
	Weight      int // Relative weight for this scenario
	Validate    func(*http.Response) bool
}

// LoadTestResult contains the results of a load test
type LoadTestResult struct {
	TotalRequests     int64
	SuccessfulRequests int64
	FailedRequests    int64
	TotalDuration     time.Duration
	AverageLatency    time.Duration
	MinLatency        time.Duration
	MaxLatency        time.Duration
	P95Latency        time.Duration
	P99Latency        time.Duration
	RequestsPerSecond float64
	ErrorRate         float64
	Errors            map[string]int64
}

// TestSystemLoadCapacity tests the system's capacity under various load conditions
func TestSystemLoadCapacity(t *testing.T) {
	// Skip this test in short mode
	if testing.Short() {
		t.Skip("Skipping load test in short mode")
	}

	test := setupPerformanceTest(t)
	defer test.cleanup()

	// Setup test data
	test.setupTestData(t)
	tokens := test.createTestUsers(t, 10)

	// Define test scenarios
	scenarios := []TestScenario{
		{
			Name:   "Create Recharge",
			Method: "POST",
			Path:   "/api/recharge/create",
			Body: map[string]interface{}{
				"payer_name":     "Load Test User",
				"payer_account":  "98765432100",
				"payment_type":   "private",
				"amount":         "100.00",
				"merchant_name":  "Performance Test Merchant",
				"ad_account":     "AD123456",
				"remark":         "Load test",
			},
			Weight: 40,
			Validate: func(resp *http.Response) bool {
				return resp.StatusCode == http.StatusCreated
			},
		},
		{
			Name:   "Get Merchants",
			Method: "GET",
			Path:   "/api/merchants",
			Weight: 30,
			Validate: func(resp *http.Response) bool {
				return resp.StatusCode == http.StatusOK
			},
		},
		{
			Name:   "Get Reports",
			Method: "GET",
			Path:   "/api/reports/transactions",
			Weight: 20,
			Validate: func(resp *http.Response) bool {
				return resp.StatusCode == http.StatusOK
			},
		},
		{
			Name:   "Get User Profile",
			Method: "GET",
			Path:   "/api/auth/profile",
			Weight: 10,
			Validate: func(resp *http.Response) bool {
				return resp.StatusCode == http.StatusOK
			},
		},
	}

	// Test configurations for different load levels
	loadConfigs := []LoadTestConfig{
		{
			BaseURL:           test.Server.URL,
			Duration:          30 * time.Second,
			ConcurrentUsers:   10,
			RampUpTime:        5 * time.Second,
			RequestsPerSecond: 50,
			TestScenarios:     scenarios,
		},
		{
			BaseURL:           test.Server.URL,
			Duration:          60 * time.Second,
			ConcurrentUsers:   25,
			RampUpTime:        10 * time.Second,
			RequestsPerSecond: 100,
			TestScenarios:     scenarios,
		},
		{
			BaseURL:           test.Server.URL,
			Duration:          90 * time.Second,
			ConcurrentUsers:   50,
			RampUpTime:        15 * time.Second,
			RequestsPerSecond: 200,
			TestScenarios:     scenarios,
		},
	}

	// Run load tests with increasing intensity
	for i, config := range loadConfigs {
		t.Run(fmt.Sprintf("LoadLevel_%d", i+1), func(t *testing.T) {
			result := runLoadTest(t, config, tokens)
			
			// Print results
			printLoadTestResults(t, fmt.Sprintf("Load Level %d", i+1), result)
			
			// Assertions based on load level
			switch i {
			case 0: // Light load
				assert.Greater(t, result.RequestsPerSecond, 40.0, "Should handle at least 40 RPS under light load")
				assert.Less(t, result.ErrorRate, 1.0, "Error rate should be less than 1% under light load")
				assert.Less(t, result.P95Latency, 2*time.Second, "P95 latency should be under 2s under light load")
			case 1: // Medium load
				assert.Greater(t, result.RequestsPerSecond, 80.0, "Should handle at least 80 RPS under medium load")
				assert.Less(t, result.ErrorRate, 5.0, "Error rate should be less than 5% under medium load")
				assert.Less(t, result.P95Latency, 5*time.Second, "P95 latency should be under 5s under medium load")
			case 2: // Heavy load
				assert.Greater(t, result.RequestsPerSecond, 100.0, "Should handle at least 100 RPS under heavy load")
				assert.Less(t, result.ErrorRate, 10.0, "Error rate should be less than 10% under heavy load")
				assert.Less(t, result.P99Latency, 10*time.Second, "P99 latency should be under 10s under heavy load")
			}
		})
	}
}

// TestStressTest performs stress testing to find breaking points
func TestStressTest(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping stress test in short mode")
	}

	test := setupPerformanceTest(t)
	defer test.cleanup()

	test.setupTestData(t)
	tokens := test.createTestUsers(t, 5)

	// Stress test configuration - push the system to its limits
	config := LoadTestConfig{
		BaseURL:           test.Server.URL,
		Duration:          120 * time.Second,
		ConcurrentUsers:   100,
		RampUpTime:        20 * time.Second,
		RequestsPerSecond: 500,
		TestScenarios: []TestScenario{
			{
				Name:   "Create Recharge",
				Method: "POST",
				Path:   "/api/recharge/create",
				Body: map[string]interface{}{
					"payer_name":     "Stress Test User",
					"payer_account":  "98765432100",
					"payment_type":   "private",
					"amount":         "100.00",
					"merchant_name":  "Performance Test Merchant",
					"ad_account":     "AD123456",
					"remark":         "Stress test",
				},
				Weight: 100,
				Validate: func(resp *http.Response) bool {
					return resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusTooManyRequests
				},
			},
		},
	}

	result := runLoadTest(t, config, tokens)
	printLoadTestResults(t, "Stress Test", result)

	// Stress test assertions - more lenient as we're pushing limits
	assert.Greater(t, result.RequestsPerSecond, 50.0, "Should maintain at least 50 RPS under stress")
	assert.Less(t, result.ErrorRate, 50.0, "Error rate should be less than 50% under stress")
	
	// Log breaking point information
	t.Logf("System handled %.2f RPS with %.2f%% error rate under stress", 
		result.RequestsPerSecond, result.ErrorRate)
}

// TestSpikeTest tests system behavior under sudden load spikes
func TestSpikeTest(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping spike test in short mode")
	}

	test := setupPerformanceTest(t)
	defer test.cleanup()

	test.setupTestData(t)
	tokens := test.createTestUsers(t, 20)

	// Simulate normal load followed by a spike
	normalLoad := LoadTestConfig{
		BaseURL:           test.Server.URL,
		Duration:          30 * time.Second,
		ConcurrentUsers:   10,
		RampUpTime:        5 * time.Second,
		RequestsPerSecond: 50,
		TestScenarios: []TestScenario{
			{
				Name:   "Normal Load",
				Method: "GET",
				Path:   "/api/merchants",
				Weight: 100,
				Validate: func(resp *http.Response) bool {
					return resp.StatusCode == http.StatusOK
				},
			},
		},
	}

	spikeLoad := LoadTestConfig{
		BaseURL:           test.Server.URL,
		Duration:          10 * time.Second,
		ConcurrentUsers:   100,
		RampUpTime:        1 * time.Second,
		RequestsPerSecond: 1000,
		TestScenarios: []TestScenario{
			{
				Name:   "Spike Load",
				Method: "POST",
				Path:   "/api/recharge/create",
				Body: map[string]interface{}{
					"payer_name":     "Spike Test User",
					"payer_account":  "98765432100",
					"payment_type":   "private",
					"amount":         "100.00",
					"merchant_name":  "Performance Test Merchant",
					"ad_account":     "AD123456",
					"remark":         "Spike test",
				},
				Weight: 100,
				Validate: func(resp *http.Response) bool {
					return resp.StatusCode < 500 // Accept any non-server error
				},
			},
		},
	}

	// Run normal load
	t.Log("Running normal load phase...")
	normalResult := runLoadTest(t, normalLoad, tokens)
	printLoadTestResults(t, "Normal Load", normalResult)

	// Brief pause
	time.Sleep(5 * time.Second)

	// Run spike load
	t.Log("Running spike load phase...")
	spikeResult := runLoadTest(t, spikeLoad, tokens)
	printLoadTestResults(t, "Spike Load", spikeResult)

	// Assertions
	assert.Less(t, normalResult.ErrorRate, 2.0, "Normal load should have low error rate")
	assert.Less(t, spikeResult.ErrorRate, 80.0, "System should handle spike with reasonable error rate")
	
	// Recovery test - run normal load again
	time.Sleep(10 * time.Second)
	t.Log("Running recovery phase...")
	recoveryResult := runLoadTest(t, normalLoad, tokens)
	printLoadTestResults(t, "Recovery Load", recoveryResult)
	
	assert.Less(t, recoveryResult.ErrorRate, 5.0, "System should recover after spike")
}

// runLoadTest executes a load test with the given configuration
func runLoadTest(t *testing.T, config LoadTestConfig, tokens []string) *LoadTestResult {
	var (
		totalRequests     int64
		successfulRequests int64
		failedRequests    int64
		totalLatency      int64
		minLatency        int64 = int64(time.Hour)
		maxLatency        int64
		latencies         []time.Duration
		errors            = make(map[string]int64)
		latencyMutex      sync.Mutex
		errorMutex        sync.Mutex
	)

	startTime := time.Now()
	endTime := startTime.Add(config.Duration)

	// Create weighted scenario selector
	scenarios := createWeightedScenarios(config.TestScenarios)

	// Channel to control request rate
	rateLimiter := make(chan struct{}, config.RequestsPerSecond)
	go func() {
		ticker := time.NewTicker(time.Second / time.Duration(config.RequestsPerSecond))
		defer ticker.Stop()
		for range ticker.C {
			select {
			case rateLimiter <- struct{}{}:
			default:
			}
		}
	}()

	// Start workers with ramp-up
	var wg sync.WaitGroup
	userStartInterval := config.RampUpTime / time.Duration(config.ConcurrentUsers)

	for i := 0; i < config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			// Ramp-up delay
			time.Sleep(time.Duration(userID) * userStartInterval)
			
			token := tokens[userID%len(tokens)]
			client := &http.Client{
				Timeout: 30 * time.Second,
			}

			for time.Now().Before(endTime) {
				// Wait for rate limiter
				select {
				case <-rateLimiter:
				case <-time.After(100 * time.Millisecond):
					continue
				}

				// Select scenario
				scenario := selectScenario(scenarios)
				
				// Execute request
				requestStart := time.Now()
				resp, err := executeRequest(client, config.BaseURL, scenario, token)
				requestDuration := time.Since(requestStart)

				atomic.AddInt64(&totalRequests, 1)
				atomic.AddInt64(&totalLatency, int64(requestDuration))

				// Update latency stats
				latencyMutex.Lock()
				latencies = append(latencies, requestDuration)
				if int64(requestDuration) < minLatency {
					minLatency = int64(requestDuration)
				}
				if int64(requestDuration) > maxLatency {
					maxLatency = int64(requestDuration)
				}
				latencyMutex.Unlock()

				// Check result
				if err != nil {
					atomic.AddInt64(&failedRequests, 1)
					errorMutex.Lock()
					errors[err.Error()]++
					errorMutex.Unlock()
				} else if resp != nil {
					if scenario.Validate != nil && scenario.Validate(resp) {
						atomic.AddInt64(&successfulRequests, 1)
					} else {
						atomic.AddInt64(&failedRequests, 1)
						errorMutex.Lock()
						errors[fmt.Sprintf("HTTP %d", resp.StatusCode)]++
						errorMutex.Unlock()
					}
					resp.Body.Close()
				}
			}
		}(i)
	}

	wg.Wait()
	actualDuration := time.Since(startTime)

	// Calculate statistics
	avgLatency := time.Duration(totalLatency / totalRequests)
	rps := float64(totalRequests) / actualDuration.Seconds()
	errorRate := float64(failedRequests) / float64(totalRequests) * 100

	// Calculate percentiles
	p95Latency := calculatePercentile(latencies, 95)
	p99Latency := calculatePercentile(latencies, 99)

	return &LoadTestResult{
		TotalRequests:      totalRequests,
		SuccessfulRequests: successfulRequests,
		FailedRequests:     failedRequests,
		TotalDuration:      actualDuration,
		AverageLatency:     avgLatency,
		MinLatency:         time.Duration(minLatency),
		MaxLatency:         time.Duration(maxLatency),
		P95Latency:         p95Latency,
		P99Latency:         p99Latency,
		RequestsPerSecond:  rps,
		ErrorRate:          errorRate,
		Errors:             errors,
	}
}

// Helper functions

func createWeightedScenarios(scenarios []TestScenario) []TestScenario {
	var weighted []TestScenario
	for _, scenario := range scenarios {
		for i := 0; i < scenario.Weight; i++ {
			weighted = append(weighted, scenario)
		}
	}
	return weighted
}

func selectScenario(scenarios []TestScenario) TestScenario {
	if len(scenarios) == 0 {
		panic("No scenarios available")
	}
	return scenarios[time.Now().UnixNano()%int64(len(scenarios))]
}

func executeRequest(client *http.Client, baseURL string, scenario TestScenario, token string) (*http.Response, error) {
	var body *bytes.Buffer
	if scenario.Body != nil {
		jsonBody, err := json.Marshal(scenario.Body)
		if err != nil {
			return nil, err
		}
		body = bytes.NewBuffer(jsonBody)
	} else {
		body = bytes.NewBuffer(nil)
	}

	req, err := http.NewRequest(scenario.Method, baseURL+scenario.Path, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	for key, value := range scenario.Headers {
		req.Header.Set(key, value)
	}

	return client.Do(req)
}

func printLoadTestResults(t *testing.T, testName string, result *LoadTestResult) {
	t.Logf("=== %s Results ===", testName)
	t.Logf("Total Requests: %d", result.TotalRequests)
	t.Logf("Successful Requests: %d", result.SuccessfulRequests)
	t.Logf("Failed Requests: %d", result.FailedRequests)
	t.Logf("Total Duration: %v", result.TotalDuration)
	t.Logf("Requests/Second: %.2f", result.RequestsPerSecond)
	t.Logf("Error Rate: %.2f%%", result.ErrorRate)
	t.Logf("Average Latency: %v", result.AverageLatency)
	t.Logf("Min Latency: %v", result.MinLatency)
	t.Logf("Max Latency: %v", result.MaxLatency)
	t.Logf("95th Percentile Latency: %v", result.P95Latency)
	t.Logf("99th Percentile Latency: %v", result.P99Latency)
	
	if len(result.Errors) > 0 {
		t.Logf("Error Breakdown:")
		for errorType, count := range result.Errors {
			t.Logf("  %s: %d", errorType, count)
		}
	}
	t.Logf("=====================================")
}