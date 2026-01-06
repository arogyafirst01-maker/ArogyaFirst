import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Loader,
  Alert,
  Group,
  Stack,
  ActionIcon,
  Badge,
  Textarea,
  Card,
  ScrollArea,
  Grid,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconVideo,
  IconVideoOff,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhoneOff,
  IconNotes,
  IconSend,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { authFetch } from '../utils/authFetch';
import { useAuth } from '../contexts/AuthContext';
import { CONSULTATION_STATUS, CONSULTATION_MODE } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle.js';

const ConsultationPage = () => {
  usePageTitle('Video Consultation');
  const { id: consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Agora state
  const [agoraClient, setAgoraClient] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Notes state
  const [notes, setNotes] = useState('');
  const [showNotesPanel, setShowNotesPanel] = useState(false);

  // Refs for video containers
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const fetchConsultation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch(`/api/consultations/${consultationId}`);

      if (response.ok) {
        const data = await response.json();
        setConsultation(data.data.consultation);
        
        // Load chat messages from consultation.messages
        setChatMessages(data.data.consultation.messages || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch consultation');
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

  useEffect(() => {
    fetchConsultation();
  }, [consultationId]);

  // Initialize Agora for VIDEO_CALL mode
  useEffect(() => {
    if (consultation && consultation.mode === CONSULTATION_MODE.VIDEO_CALL) {
      initializeAgora();
    }

    return () => {
      cleanupAgora();
    };
  }, [consultation]);

  const initializeAgora = async () => {
    try {
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setAgoraClient(client);

      // Handle remote user events
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);

        if (mediaType === 'video') {
          setRemoteUsers((prev) => [...prev.filter((u) => u.uid !== user.uid), user]);
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        }
      });

      client.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to initialize video call',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const joinVideoCall = async () => {
    try {
      if (!agoraClient) return;

      // Get Agora token from backend
      const response = await authFetch(`/api/consultations/${consultationId}/agora-token`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get Agora token');
      }

      const data = await response.json();
      const { token, channelName, uid, appId } = data.data.agoraCredentials;

      // Join the channel
      await agoraClient.join(appId, channelName, token, uid);

      // Create and publish local tracks
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      // Publish tracks
      await agoraClient.publish([videoTrack, audioTrack]);

      setIsCallActive(true);

      // Update consultation status to IN_PROGRESS
      await authFetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: CONSULTATION_STATUS.IN_PROGRESS }),
      });

      notifications.show({
        title: 'Success',
        message: 'Joined video call successfully',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to join video call',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const leaveVideoCall = async () => {
    try {
      await cleanupAgora();
      setIsCallActive(false);

      notifications.show({
        title: 'Call Ended',
        message: 'You have left the video call',
        color: 'blue',
      });

      navigate(-1);
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to leave call',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const cleanupAgora = async () => {
    try {
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (agoraClient) {
        await agoraClient.leave();
      }
    } catch (err) {
      console.error('Error cleaning up Agora:', err);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const saveNotes = async () => {
    if (!notes.trim()) return;

    try {
      const response = await authFetch(`/api/consultations/${consultationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Note saved successfully',
          color: 'green',
        });
        setNotes('');
        fetchConsultation();
      } else {
        throw new Error('Failed to save note');
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await authFetch(`/api/consultations/${consultationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (response.ok) {
        setNewMessage('');
        // Refresh chat history from server after successful post
        await fetchConsultation();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to send message',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const completeConsultation = async () => {
    try {
      const response = await authFetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: CONSULTATION_STATUS.COMPLETED,
          notes: notes || 'Consultation completed',
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Success',
          message: 'Consultation completed successfully',
          color: 'green',
        });
        navigate(-1);
      } else {
        throw new Error('Failed to complete consultation');
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  // Play remote video when available
  useEffect(() => {
    if (remoteUsers.length > 0 && remoteVideoRef.current) {
      const remoteUser = remoteUsers[0];
      if (remoteUser.videoTrack) {
        remoteUser.videoTrack.play(remoteVideoRef.current);
      }
    }
  }, [remoteUsers]);

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading consultation...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  // VIDEO_CALL mode
  if (consultation.mode === CONSULTATION_MODE.VIDEO_CALL) {
    return (
      <Container size="xl" py="md" fluid>
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between">
            <Group>
              <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
                <IconArrowLeft size={20} />
              </ActionIcon>
              <div>
                <Title order={3}>Video Consultation</Title>
                <Text size="sm" c="dimmed">
                  {consultation.patientId?.name || 'Patient'}
                </Text>
              </div>
            </Group>
            <Badge color={consultation.status === CONSULTATION_STATUS.IN_PROGRESS ? 'green' : 'blue'}>
              {consultation.status}
            </Badge>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: showNotesPanel ? 8 : 12 }}>
              {/* Video Grid */}
              <Paper shadow="xs" p="md" withBorder style={{ minHeight: 500, position: 'relative' }}>
                {/* Remote Video (Large) */}
                <div
                  ref={remoteVideoRef}
                  style={{
                    width: '100%',
                    height: 500,
                    backgroundColor: '#000',
                    borderRadius: 8,
                    position: 'relative',
                  }}
                >
                  {!isCallActive && (
                    <Stack align="center" justify="center" style={{ height: '100%' }}>
                      <IconVideo size={60} color="white" />
                      <Text c="white">Waiting to join call...</Text>
                      <Button onClick={joinVideoCall} leftSection={<IconVideo size={16} />}>
                        Join Video Call
                      </Button>
                    </Stack>
                  )}
                </div>

                {/* Local Video (PIP) */}
                {isCallActive && (
                  <div
                    ref={localVideoRef}
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      right: 20,
                      width: 200,
                      height: 150,
                      backgroundColor: '#000',
                      borderRadius: 8,
                      border: '2px solid white',
                    }}
                  />
                )}
              </Paper>

              {/* Controls */}
              {isCallActive && (
                <Group justify="center" mt="md">
                  <ActionIcon
                    size="xl"
                    radius="xl"
                    variant={isVideoEnabled ? 'filled' : 'light'}
                    color="blue"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <IconVideo size={24} /> : <IconVideoOff size={24} />}
                  </ActionIcon>
                  <ActionIcon
                    size="xl"
                    radius="xl"
                    variant={isAudioEnabled ? 'filled' : 'light'}
                    color="blue"
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? <IconMicrophone size={24} /> : <IconMicrophoneOff size={24} />}
                  </ActionIcon>
                  <ActionIcon size="xl" radius="xl" variant="filled" color="red" onClick={leaveVideoCall}>
                    <IconPhoneOff size={24} />
                  </ActionIcon>
                  <ActionIcon
                    size="xl"
                    radius="xl"
                    variant={showNotesPanel ? 'filled' : 'light'}
                    color="teal"
                    onClick={() => setShowNotesPanel(!showNotesPanel)}
                  >
                    <IconNotes size={24} />
                  </ActionIcon>
                </Group>
              )}
            </Grid.Col>

            {/* Notes Panel */}
            {showNotesPanel && (
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper shadow="xs" p="md" withBorder style={{ height: 500 }}>
                  <Stack gap="md" style={{ height: '100%' }}>
                    <Title order={5}>Patient Information</Title>
                    <Card withBorder>
                      <Stack gap="xs">
                        <Group>
                          <IconUser size={16} />
                          <Text size="sm">{consultation.patientId?.name}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} />
                          <Text size="sm">
                            {new Date(consultation.scheduledAt).toLocaleDateString()}
                          </Text>
                        </Group>
                      </Stack>
                    </Card>

                    <Title order={5}>Consultation Notes</Title>
                    <Textarea
                      placeholder="Add notes during consultation..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      minRows={6}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={saveNotes} fullWidth>
                      Save Note
                    </Button>
                  </Stack>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Stack>
      </Container>
    );
  }

  // CHAT mode
  if (consultation.mode === CONSULTATION_MODE.CHAT) {
    return (
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between">
            <Group>
              <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
                <IconArrowLeft size={20} />
              </ActionIcon>
              <div>
                <Title order={3}>Chat Consultation</Title>
                <Text size="sm" c="dimmed">
                  {consultation.patientId?.name || 'Patient'}
                </Text>
              </div>
            </Group>
            <Badge color="blue">{consultation.status}</Badge>
          </Group>

          <Paper shadow="xs" p="md" withBorder>
            <ScrollArea h={400} mb="md">
              <Stack gap="sm">
                {chatMessages.map((msg, idx) => {
                  const timestamp = msg.timestamp ? new Date(msg.timestamp) : null;
                  const formattedTime = timestamp && !isNaN(timestamp.getTime())
                    ? timestamp.toLocaleTimeString()
                    : '';
                  return (
                    <Card key={idx} shadow="sm" p="sm" withBorder>
                      <Text size="sm">{msg.message}</Text>
                      {formattedTime && (
                        <Text size="xs" c="dimmed">
                          {formattedTime}
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            </ScrollArea>

            <Group>
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ flex: 1 }}
              />
              <ActionIcon size="lg" variant="filled" color="blue" onClick={sendChatMessage}>
                <IconSend size={20} />
              </ActionIcon>
            </Group>
          </Paper>

          <Button onClick={completeConsultation} fullWidth>
            Complete Consultation
          </Button>
        </Stack>
      </Container>
    );
  }

  // IN_PERSON mode
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={3}>In-Person Consultation</Title>
              <Text size="sm" c="dimmed">
                {consultation.patientId?.name || 'Patient'}
              </Text>
            </div>
          </Group>
          <Badge color="blue">{consultation.status}</Badge>
        </Group>

        <Paper shadow="xs" p="md" withBorder>
          <Stack gap="md">
            <Title order={5}>Patient Information</Title>
            <Card withBorder>
              <Stack gap="xs">
                <Group>
                  <IconUser size={16} />
                  <Text size="sm">{consultation.patientId?.name}</Text>
                </Group>
                <Group>
                  <IconCalendar size={16} />
                  <Text size="sm">
                    {new Date(consultation.scheduledAt).toLocaleDateString()}
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Title order={5}>Consultation Notes</Title>
            <Textarea
              placeholder="Enter consultation notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              minRows={10}
            />
          </Stack>
        </Paper>

        <Group justify="space-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={completeConsultation}>Complete Consultation</Button>
        </Group>
      </Stack>
    </Container>
  );
};

export default ConsultationPage;
