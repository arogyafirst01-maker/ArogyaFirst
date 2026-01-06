import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Table,
  Modal,
  Textarea,
  Badge,
  ActionIcon,
  Alert,
  Loader,
  Select,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconEye,
  IconFileText,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { ROLES, VERIFICATION_STATUS } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';

const AdminDashboardPage = () => {
  usePageTitle('Admin Dashboard');
  const { user } = useAuth();
  const { loading, error, fetchData } = useAuthFetch();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Fetch when filterRole or page changes (avoids duplicate initial fetches)
  useEffect(() => {
    fetchPendingVerifications();
  }, [filterRole, page]);

  const fetchPendingVerifications = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterRole !== 'ALL') queryParams.set('role', filterRole);
      queryParams.set('page', page.toString());
      queryParams.set('limit', ITEMS_PER_PAGE.toString());

      const data = await fetchData(`/api/admin/pending-verifications?${queryParams.toString()}`);
      if (data?.data) {
        setPendingUsers(data.data.items || []);
        setTotal(data.data.total);
        setTotalPages(Math.ceil(data.data.total / ITEMS_PER_PAGE));
      }
    } catch (err) {
      // Error handled by useAuthFetch
    }
  };

  const handleOpenVerificationModal = (user) => {
    setSelectedUser(user);
    setVerificationNote('');
    setVerificationModalOpen(true);
  };

  const handleVerify = async (action) => {
    if (!selectedUser) return;

    // Validate admin note requirement for rejection
    if (action === VERIFICATION_STATUS.REJECTED && !verificationNote.trim()) {
      showErrorNotification('Admin note is required when rejecting verification');
      return;
    }

    setVerificationAction(action);
    const entityType = getEntityType(selectedUser.role);
    try {
      const data = await fetchData(`/api/admin/verify/${entityType}/${selectedUser._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, note: verificationNote }),
      });
        if (data) {
          showSuccessNotification('Verification status updated successfully');

          // Optimistically remove the user from the current list
          setPendingUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));

          // Compute new totals synchronously and decide whether we need to refetch
          const prevTotal = total || 0;
          const newTotal = Math.max(prevTotal - 1, 0);
          const newTotalPages = Math.max(1, Math.ceil(newTotal / ITEMS_PER_PAGE));

          setTotal(newTotal);
          setTotalPages(newTotalPages);

          if (page > newTotalPages) {
            // Page number needs to change; changing page will trigger the effect to refetch
            setPage(newTotalPages);
          } else {
            // Current page remains unchanged — refill the page to keep it full
            fetchPendingVerifications();
          }

          setVerificationModalOpen(false);
          setSelectedUser(null);
          setVerificationNote('');
        }
    } catch (err) {
      // If the server returned a 409 it means the verification state changed (conflict)
      if (err.status === 409) {
        showErrorNotification('This request was already processed. Refreshing the queue.');
        fetchPendingVerifications();
        return;
      }

      if (err.message && err.message.includes('Admin note is required')) {
        showErrorNotification('Admin note is required when rejecting verification');
      } else {
        showErrorNotification('Failed to update verification status');
      }
    } finally {
      setVerificationAction('');
    }
  };

  const handleViewDocument = (doc) => {
    window.open(doc.url, '_blank');
  };

  const getEntityType = (role) => {
    return role === ROLES.HOSPITAL ? 'hospital' : 'doctor';
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getRoleBadgeColor = (role) => {
    return role === ROLES.HOSPITAL ? 'blue' : 'green';
  };

  const handleFilterChange = (value) => {
    // Reset to first page then change role; effect will trigger a single fetch
    setPage(1);
    setFilterRole(value);
  };

  const handleRefresh = () => {
    fetchPendingVerifications();
  };

  if (loading && pendingUsers.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="md">
        <Title order={2} mb="md">
          Admin Dashboard - Verification Queue
        </Title>
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Group mb="md">
          <Badge color="gray" size="lg">
            {pendingUsers.length} pending
          </Badge>
          <Select
            placeholder="Filter by role"
            data={[
              { value: 'ALL', label: 'All' },
              { value: ROLES.HOSPITAL, label: 'Hospital' },
              { value: ROLES.DOCTOR, label: 'Doctor' },
            ]}
            value={filterRole}
            onChange={handleFilterChange}
            style={{ minWidth: 150 }}
          />
          <Button leftIcon={<IconRefresh size={16} />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
        </Group>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>Email</th>
              <th>Unique ID</th>
              <th>Submitted Date</th>
              <th>Documents</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <tr key={user._id}>
                  <td>
                    <Badge color={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </td>
                  <td>
                    {user.role === ROLES.HOSPITAL
                      ? user.hospitalData?.name || 'N/A'
                      : user.doctorData?.name || 'N/A'}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.uniqueId}</td>
                  <td>{formatDateForDisplay(user.createdAt)}</td>
                  <td>
                    {user.role === ROLES.HOSPITAL
                      ? user.hospitalData?.legalDocuments?.length || 0
                      : user.doctorData?.practiceDocuments?.length || 0}{' '}
                    documents
                  </td>
                  <td>
                    <Button size="xs" onClick={() => handleOpenVerificationModal(user)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No pending verifications</td>
              </tr>
            )}
          </tbody>
        </Table>
        {totalPages > 1 && (
          <Group position="center" mt="md">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Text size="sm">
              Page {page} of {totalPages} ({total} total)
            </Text>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </Group>
        )}
      </Paper>

      <Modal
        opened={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        title={`Review ${selectedUser?.role} - ${
          selectedUser?.role === ROLES.HOSPITAL
            ? selectedUser?.hospitalData?.name
            : selectedUser?.doctorData?.name
        }`}
        size="lg"
        fullScreen
      >
        {selectedUser && (
          <Stack>
            <Group>
              <Text fw={500}>Email:</Text>
              <Text>{selectedUser.email}</Text>
            </Group>
            <Group>
              <Text fw={500}>Unique ID:</Text>
              <Text>{selectedUser.uniqueId}</Text>
            </Group>
            <Group>
              <Text fw={500}>Role:</Text>
              <Badge color={getRoleBadgeColor(selectedUser.role)}>{selectedUser.role}</Badge>
            </Group>
            {selectedUser.role === ROLES.HOSPITAL && (
              <>
                <Group>
                  <Text fw={500}>Name:</Text>
                  <Text>{selectedUser.hospitalData?.name || 'N/A'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Location:</Text>
                  <Text>{selectedUser.hospitalData?.location || 'N/A'}</Text>
                </Group>
              </>
            )}
            {selectedUser.role === ROLES.DOCTOR && (
              <>
                <Group>
                  <Text fw={500}>Name:</Text>
                  <Text>{selectedUser.doctorData?.name || 'N/A'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Qualification:</Text>
                  <Text>{selectedUser.doctorData?.qualification || 'N/A'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Experience:</Text>
                  <Text>{selectedUser.doctorData?.experience || 'N/A'} years</Text>
                </Group>
                <Group>
                  <Text fw={500}>Specialization:</Text>
                  <Text>{selectedUser.doctorData?.specialization || 'N/A'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Hospital ID:</Text>
                  <Text>{selectedUser.doctorData?.hospitalId || 'N/A'}</Text>
                </Group>
              </>
            )}
            <Title order={4} mt="md">
              Documents
            </Title>
            <Table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const docs = selectedUser.role === ROLES.HOSPITAL 
                    ? selectedUser.hospitalData?.legalDocuments 
                    : selectedUser.doctorData?.practiceDocuments;
                  
                  return docs && docs.length > 0 ? (
                    docs.map((doc, index) => (
                      <tr key={index}>
                        <td>{doc.url.split('/').pop()}</td>
                        <td>{doc.format?.toUpperCase()}</td>
                        <td>{formatFileSize(doc.size)}</td>
                        <td>{formatDateForDisplay(doc.uploadedAt)}</td>
                        <td>
                          <ActionIcon onClick={() => handleViewDocument(doc)}>
                            <IconEye size={16} />
                          </ActionIcon>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No documents</td>
                    </tr>
                  );
                })()}
              </tbody>
            </Table>
            <Textarea
              label="Admin Note (required for rejection)"
              placeholder="Add a note (required for rejection, optional for approval)"
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              error={verificationAction === VERIFICATION_STATUS.REJECTED && !verificationNote.trim() ? 'Note is required for rejection' : null}
            />
            <Group>
              <Button
                color="green"
                leftIcon={<IconCheck size={16} />}
                onClick={() => handleVerify(VERIFICATION_STATUS.APPROVED)}
                loading={verificationAction === VERIFICATION_STATUS.APPROVED}
              >
                Approve
              </Button>
              <Button
                color="red"
                leftIcon={<IconX size={16} />}
                onClick={() => handleVerify(VERIFICATION_STATUS.REJECTED)}
                loading={verificationAction === VERIFICATION_STATUS.REJECTED}
              >
                Reject
              </Button>
              <Button variant="outline" onClick={() => setVerificationModalOpen(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Optional Document Viewer Modal - not implemented as per requirements */}
    </Container>
  );
};

export default AdminDashboardPage;