import { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Alert,
  FileInput,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconUpload, IconFile } from '@tabler/icons-react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { DOCUMENT_TYPES } from '@arogyafirst/shared';
import { showErrorNotification } from '../utils/notifications';

/**
 * DocumentUploadModal
 * 
 * Modal for uploading medical documents.
 * Handles file upload to Cloudinary via backend API.
 * Supports both patient self-upload and provider submission.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Function} onSuccess - Success callback
 * @param {string} patientId - Patient ID for document upload
 * @param {boolean} isProviderSubmission - Whether this is a provider submitting on behalf of patient
 * @param {string} defaultDocumentType - Optional default document type (e.g., LAB_REPORT for labs)
 */
export const DocumentUploadModal = ({ opened, onClose, onSuccess, patientId, isProviderSubmission = false, defaultDocumentType = '' }) => {
  const { fetchData } = useAuthFetch();
  const modalRef = useFocusTrap(opened);

  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState(defaultDocumentType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form
  const resetForm = () => {
    setFile(null);
    setDocumentType(defaultDocumentType);
    setTitle('');
    setDescription('');
    setError(null);
  };

  // Handle modal close
  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  // Validate file
  const validateFile = (file) => {
    if (!file) return 'Please select a file';

    // Check file type - accept PDF or any image type (for mobile camera support)
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      return 'Only PDF and image files are allowed';
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  // Handle file upload
  const handleUpload = async () => {
    // Validation
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    if (!documentType) {
      setError('Please select a document type');
      return;
    }

    if (!title || title.trim().length < 3) {
      setError('Title must be at least 3 characters long');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('document', file);
      formData.append('patientId', patientId);
      formData.append('documentType', documentType);
      formData.append('title', title.trim());
      if (description) {
        formData.append('description', description.trim());
      }

      // Upload document using useAuthFetch
      const data = await fetchData('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      // Success
      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
      showErrorNotification('Upload Error', err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isProviderSubmission ? "Submit Patient Document" : "Upload Document"}
      size="md"
      closeOnClickOutside={!uploading}
      closeOnEscape={!uploading}
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-upload-modal-title"
      aria-describedby="document-upload-modal-description"
    >
      <Stack>
        {/* Provider Submission Notice */}
        {isProviderSubmission && (
          <Alert color="blue" variant="light">
            <Text size="sm">
              You are submitting a document on behalf of the patient. Active consent is required.
            </Text>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* File Input */}
        <FileInput
          label="Select Document"
          placeholder="Choose a file"
          accept="image/*,application/pdf"
          capture="environment"
          value={file}
          onChange={setFile}
          leftSection={<IconFile size={16} />}
          disabled={uploading}
          required
          description="Supported formats: PDF, Images (max 5MB)"
        />

        {/* Document Type */}
        <Select
          label="Document Type"
          placeholder="Select type"
          value={documentType}
          onChange={setDocumentType}
          data={[
            { value: DOCUMENT_TYPES.PRESCRIPTION, label: 'Prescription' },
            { value: DOCUMENT_TYPES.LAB_REPORT, label: 'Lab Report' },
            { value: DOCUMENT_TYPES.MEDICAL_RECORD, label: 'Medical Record' },
            { value: DOCUMENT_TYPES.INSURANCE, label: 'Insurance' },
            { value: DOCUMENT_TYPES.ID_PROOF, label: 'ID Proof' },
            { value: DOCUMENT_TYPES.OTHER, label: 'Other' },
          ]}
          disabled={uploading}
          required
        />

        {/* Title */}
        <TextInput
          label="Title"
          placeholder="Enter document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={uploading}
          required
          minLength={3}
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Enter document description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
          minRows={3}
        />

        {/* File Info */}
        {file && (
          <Alert color="blue" variant="light">
            <Text size="sm">
              <strong>File:</strong> {file.name}
            </Text>
            <Text size="sm">
              <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
            </Text>
            <Text size="sm">
              <strong>Type:</strong> {file.type}
            </Text>
          </Alert>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={uploading} aria-label="Cancel upload">
            Cancel
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={handleUpload}
            loading={uploading}
            disabled={!file}
            aria-label={uploading ? 'Uploading document, please wait' : 'Upload document'}
          >
            Upload
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
