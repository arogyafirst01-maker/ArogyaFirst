import React from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Button,
  Alert,
  Box,
} from '@mantine/core';
import {
  IconDownload,
  IconFileText,
  IconCalendar,
  IconUser,
} from '@tabler/icons-react';
import { DOCUMENT_TYPES } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';
import { LazyImage } from './LazyImage';

/**
 * DocumentViewerModal
 * 
 * Modal for viewing document details and preview.
 * Displays PDF documents inline and shows image previews.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Object} document - Document object to display
 */
export const DocumentViewerModal = ({ opened, onClose, document }) => {
  if (!document) return null;

  // Get document type badge color
  const getDocumentTypeBadge = (type) => {
    const colors = {
      [DOCUMENT_TYPES.PRESCRIPTION]: 'blue',
      [DOCUMENT_TYPES.LAB_REPORT]: 'green',
      [DOCUMENT_TYPES.MEDICAL_RECORD]: 'orange',
      [DOCUMENT_TYPES.INSURANCE]: 'purple',
      [DOCUMENT_TYPES.ID_PROOF]: 'cyan',
      [DOCUMENT_TYPES.OTHER]: 'gray',
    };
    return colors[type] || 'gray';
  };

  // Handle download
  const handleDownload = () => {
    window.open(document.fileUrl, '_blank');
  };

  // Determine if file is PDF
  const isPDF = document.format?.toLowerCase() === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png'].includes(document.format?.toLowerCase());

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Document Details"
      size="xl"
      padding="lg"
    >
      <Stack>
        {/* Document Info */}
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Text size="xl" fw={700} mb="xs">
              {document.title}
            </Text>
            {document.description && (
              <Text size="sm" c="dimmed" mb="md">
                {document.description}
              </Text>
            )}
            <Group gap="xs">
              <Badge color={getDocumentTypeBadge(document.documentType)} variant="light">
                {document.documentType}
              </Badge>
              <Badge color="gray" variant="outline">
                {document.format?.toUpperCase() || 'N/A'}
              </Badge>
              <Badge color="gray" variant="outline">
                {(document.size / 1024).toFixed(0)} KB
              </Badge>
            </Group>
          </div>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleDownload}
            variant="light"
          >
            Download
          </Button>
        </Group>

        {/* Metadata */}
        <Alert color="blue" variant="light">
          <Stack gap="xs">
            <Group gap="xs">
              <IconCalendar size={16} />
              <Text size="sm">
                <strong>Uploaded:</strong> {formatDateForDisplay(document.uploadedAt)}
              </Text>
            </Group>
            <Group gap="xs">
              <IconUser size={16} />
              <Text size="sm">
                <strong>Source:</strong>{' '}
                {document.uploadSource === 'PATIENT_UPLOAD' ? 'Self Upload' : 'Provider Submission'}
              </Text>
            </Group>
            {document.uploadedBy?.name && (
              <Group gap="xs">
                <IconUser size={16} />
                <Text size="sm">
                  <strong>Uploaded by:</strong> {document.uploadedBy.name}
                </Text>
              </Group>
            )}
          </Stack>
        </Alert>

        {/* Document Preview */}
        <Box
          style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden',
            minHeight: '500px',
            maxHeight: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
          }}
        >
          {isPDF ? (
            <iframe
              src={document.fileUrl}
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
              }}
              title={document.title}
            />
          ) : isImage ? (
            <LazyImage
              src={document.fileUrl}
              alt={document.title}
              width="100%"
              height={600}
              radius="md"
              style={{
                objectFit: 'contain',
              }}
            />
          ) : (
            <Alert icon={<IconFileText size={16} />} color="gray">
              <Stack align="center" gap="xs">
                <Text>Preview not available for this file type</Text>
                <Button
                  leftSection={<IconDownload size={16} />}
                  onClick={handleDownload}
                  variant="light"
                  size="sm"
                >
                  Download to View
                </Button>
              </Stack>
            </Alert>
          )}
        </Box>
      </Stack>
    </Modal>
  );
};
