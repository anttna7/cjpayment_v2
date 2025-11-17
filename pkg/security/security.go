package security

// DataMasker provides data masking functionality
type DataMasker struct{}

// NewDataMasker creates a new data masker
func NewDataMasker() *DataMasker {
	return &DataMasker{}
}

// MaskSensitiveData masks sensitive data
func (dm *DataMasker) MaskSensitiveData(data string) string {
	if len(data) <= 4 {
		return "****"
	}
	return data[:2] + "****" + data[len(data)-2:]
}