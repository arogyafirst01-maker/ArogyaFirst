import React, { useState, useEffect, useCallback } from 'react';
import { Autocomplete } from '@mantine/core';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { validateMedicineFormat } from '@arogyafirst/shared';
import { showErrorNotification } from '../utils/notifications.js';

/**
 * Custom hook for debouncing values
 */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * MedicineAutocomplete Component
 * Provides medicine search/autocomplete for doctor prescription creation
 * Fetches from linked pharmacies via GET /api/prescriptions/medicines/search
 */
export const MedicineAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search medicine...',
  error,
  required = false,
}) => {
  const { fetchData } = useAuthFetch();
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch medicine suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchData(
          `/api/prescriptions/medicines/search?query=${encodeURIComponent(debouncedQuery)}`
        );
        
        console.log('[MedicineAutocomplete] API Response:', response);
        
        // Ensure we always get an array
        let medicinesData = [];
        if (Array.isArray(response)) {
          medicinesData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          medicinesData = response.data;
        } else if (response?.medicines && Array.isArray(response.medicines)) {
          medicinesData = response.medicines;
        }
        
        console.log('[MedicineAutocomplete] medicinesData:', medicinesData, 'isArray:', Array.isArray(medicinesData));
        
        // Map to autocomplete format, limit to 10 results
        const mapped = Array.isArray(medicinesData)
          ? medicinesData.slice(0, 10).map((item) => ({
              value: `${item.name} ${item.dosage}`,
              label: `${item.name} ${item.dosage}`,
              genericName: item.genericName,
              manufacturer: item.manufacturer,
              item,
            }))
          : [];
        
        console.log('[MedicineAutocomplete] mapped suggestions:', mapped);
        setSuggestions(mapped);
      } catch (error) {
        console.error('Failed to fetch medicine suggestions:', error);
        // Don't show error notification for search failures - just empty results
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, fetchData]);

  // Handle selection from dropdown
  const handleSelect = (selected) => {
    setSearchQuery(selected);
    setValidationError('');
    
    // Find the selected item in suggestions
    const selectedItem = suggestions.find((s) => s.value === selected);
    
    if (selectedItem) {
      // Parse name and dosage
      const parts = selected.trim().split(' ');
      const dosage = parts[parts.length - 1];
      const name = parts.slice(0, -1).join(' ');
      
      // Call onChange with full string
      if (onChange) {
        onChange(selected, { name, dosage });
      }
      
      // Call onSelect with full item if provided
      if (onSelect) {
        onSelect(selectedItem.item);
      }
    } else {
      // User typed custom value
      if (onChange) {
        const parts = selected.trim().split(' ');
        if (parts.length >= 2) {
          const dosage = parts[parts.length - 1];
          const name = parts.slice(0, -1).join(' ');
          onChange(selected, { name, dosage });
        } else {
          onChange(selected, { name: selected, dosage: '' });
        }
      }
    }
  };

  // Handle blur - validate format and ensure onChange is called if needed
  const handleBlur = () => {
    // If there's a search query but onChange wasn't called yet (no selection), call it now
    if (searchQuery && searchQuery.trim()) {
      // Check if this is a manual entry that needs to be processed
      const isValidFormat = validateMedicineFormat(searchQuery);
      if (isValidFormat) {
        // Call onChange to ensure the value is captured in parent component
        const parts = searchQuery.trim().split(' ');
        const dosage = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(' ');
        
        if (onChange) {
          onChange(searchQuery, { name, dosage });
        }
        setValidationError('');
      } else {
        setValidationError('Invalid format. Use "Name Dosage" (e.g., "Paracetamol 650mg")');
      }
    } else if (required) {
      setValidationError('Medicine is required');
    } else {
      setValidationError('');
    }
  };

  // Handle input change
  const handleChange = (newValue) => {
    setSearchQuery(newValue);
    setValidationError('');
  };

  // Sync with external value prop
  useEffect(() => {
    if (value !== searchQuery) {
      setSearchQuery(value);
    }
  }, [value]);

  return (
    <Autocomplete
      label="Medicine Name & Dosage"
      placeholder={placeholder}
      value={searchQuery}
      onChange={handleChange}
      onOptionSubmit={handleSelect}
      onBlur={handleBlur}
      data={Array.isArray(suggestions) ? suggestions : []}
      error={validationError || error}
      required={required}
      limit={10}
      maxDropdownHeight={300}
      aria-label="Search medicines"
      comboboxProps={{ shadow: 'md' }}
    />
  );
};

export default MedicineAutocomplete;
