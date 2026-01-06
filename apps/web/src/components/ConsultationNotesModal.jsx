import { useState } from 'react';
import {
  Modal,
  Stack,
  Textarea,
  Button,
  Alert,
  Group,
  Text,
  ScrollArea,
  Card,
  Divider,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authFetch } from '../utils/authFetch';

const ConsultationNotesModal = ({ opened, onClose, consultationId, existingNotes, onNoteAdded }) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    if (newNoteContent.length < 10) {
      setError('Note must be at least 10 characters long');
      return;
    }

    if (newNoteContent.length > 2000) {
      setError('Note cannot exceed 2000 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authFetch(`/api/consultations/${consultationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'Success',
          message: 'Note added successfully',
          color: 'green',
        });

        // Reset form
        setNewNoteContent('');

        // Callback to parent to refresh data
        if (onNoteAdded) {
          onNoteAdded(data.data);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add note');
      }
    } catch (err) {
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Consultation Notes"
      size="lg"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle />} color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Existing Notes */}
        {existingNotes && existingNotes.length > 0 && (
          <>
            <Text size="sm" fw={500}>
              Existing Notes
            </Text>
            <ScrollArea h={200} type="auto">
              <Stack gap="sm">
                {existingNotes.map((note, index) => (
                  <div key={index}>
                    <Card shadow="sm" p="md" withBorder>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {note.content}
                      </Text>
                      <Text size="xs" c="dimmed" mt="xs">
                        {new Date(note.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Card>
                    {index < existingNotes.length - 1 && <Divider my="xs" />}
                  </div>
                ))}
              </Stack>
            </ScrollArea>

            <Divider />
          </>
        )}

        {existingNotes && existingNotes.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No notes yet. Add your first note below.
          </Text>
        )}

        {/* Add New Note */}
        <Text size="sm" fw={500}>
          Add New Note
        </Text>
        <Textarea
          placeholder="Enter note content (10-2000 characters)..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          minRows={4}
          maxRows={8}
          error={
            newNoteContent.length > 0 && newNoteContent.length < 10
              ? 'Minimum 10 characters required'
              : newNoteContent.length > 2000
              ? 'Maximum 2000 characters allowed'
              : null
          }
        />

        <Text size="xs" c="dimmed" ta="right">
          {newNoteContent.length}/2000 characters
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button
            onClick={handleAddNote}
            loading={loading}
            disabled={newNoteContent.length < 10 || newNoteContent.length > 2000}
          >
            Add Note
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ConsultationNotesModal;
