import React, { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import {
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  NumberInput,
  Alert,
  Select,
  Checkbox,
  Anchor,
  Box,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { ROLES, MACHINE_STATUS } from '@arogyafirst/shared';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateAadhaarLast4,
  formatDate,
} from '@arogyafirst/shared';
import { useNavigate } from 'react-router';
import { api } from '../utils/api.js';

const getFormConfig = (selectedRole) => {
  const baseConfig = {
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
    validate: {
      email: (value) => (!value || validateEmail(value) ? null : 'Invalid email address'),
      password: (value) => (validatePassword(value) ? null : 'Password must be at least 8 characters with uppercase, lowercase, and number'),
      confirmPassword: (value, values) => (value === values.password ? null : 'Passwords do not match'),
      termsAccepted: (value) => (value === true ? null : 'You must accept the terms and conditions'),
    },
  };

  switch (selectedRole) {
    case ROLES.PATIENT:
      return {
        ...baseConfig,
        initialValues: {
          ...baseConfig.initialValues,
          name: '',
          phone: '',
          location: '',
          dateOfBirth: null,
          aadhaarLast4: '',
        },
        validate: {
          ...baseConfig.validate,
          name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
          phone: (value) => (validatePhone(value) ? null : 'Phone must be 10 digits'),
          dateOfBirth: (value) => (value ? null : 'Date of birth is required'),
          aadhaarLast4: (value) => (!value || validateAadhaarLast4(value) ? null : 'Aadhaar last 4 digits must be 4 numbers'),
        },
      };
    case ROLES.HOSPITAL:
      return {
        ...baseConfig,
        initialValues: {
          ...baseConfig.initialValues,
          name: '',
          location: '',
        },
        validate: {
          ...baseConfig.validate,
          name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
          location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
        },
      };
    case ROLES.DOCTOR:
      return {
        ...baseConfig,
        initialValues: {
          ...baseConfig.initialValues,
          name: '',
          qualification: '',
          experience: 0,
          location: '',
          dateOfBirth: null,
          aadhaarLast4: '',
          specialization: '',
          hospitalId: '',
        },
        validate: {
          ...baseConfig.validate,
          name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
          qualification: (value) => (value.trim().length > 0 ? null : 'Qualification is required'),
          experience: (value) => (value >= 0 ? null : 'Experience must be non-negative'),
          location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
          dateOfBirth: (value) => (value ? null : 'Date of birth is required'),
          aadhaarLast4: (value) => (validateAadhaarLast4(value) ? null : 'Aadhaar last 4 digits must be 4 numbers'),
          specialization: (value) => (value.trim().length > 0 ? null : 'Specialization is required'),
        },
      };
    case ROLES.LAB:
      return {
        ...baseConfig,
        initialValues: {
          ...baseConfig.initialValues,
          name: '',
          location: '',
        },
        validate: {
          ...baseConfig.validate,
          name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
          location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
        },
      };
    case ROLES.PHARMACY:
      return {
        ...baseConfig,
        initialValues: {
          ...baseConfig.initialValues,
          name: '',
          location: '',
          licenseNumber: '',
        },
        validate: {
          ...baseConfig.validate,
          name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
          location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
          licenseNumber: (value) => (value.trim().length > 0 ? null : 'License number is required'),
        },
      };
    default:
      return baseConfig;
  }
};

export default function RoleForm({ role, onBack, onSubmit, loading, error }) {
  const form = useForm(getFormConfig(role));
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [newMachine, setNewMachine] = useState({ name: '', model: '', manufacturer: '', purchaseDate: null, status: MACHINE_STATUS.OPERATIONAL });
  const [facilities, setFacilities] = useState([]);
  const [facilityInput, setFacilityInput] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', genericName: '', manufacturer: '', stock: 0, reorderLevel: 0, price: 0, batchNumber: '', expiryDate: null });

  // Email verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState(null);
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);


  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Phone countdown timer
  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);
  
  // Send OTP to phone
  const handleSendPhoneOTP = async () => {
    const phone = form.values.phone;
    if (!phone || !validatePhone(phone)) {
      setPhoneOtpError('Please enter a valid 10-digit phone number');
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    try {
      await api.post('/api/auth/send-phone-otp', { phone });
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      notifications.show({ title: 'OTP Sent', message: 'Verification code sent to your phone', color: 'green' });
    } catch (err) {
      setPhoneOtpError(err.message || 'Failed to send OTP');
      notifications.show({ title: 'Error', message: err.message || 'Failed to send OTP', color: 'red' });
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  // Verify phone OTP
  const handleVerifyPhoneOTP = async () => {
    if (phoneOtp.length !== 6) {
      setPhoneOtpError('Please enter a 6-digit OTP');
      return;
    }
    setPhoneVerifyLoading(true);
    setPhoneOtpError(null);
    try {
      await api.post('/api/auth/verify-phone-otp-registration', { phone: form.values.phone, otp: phoneOtp });
      setPhoneVerified(true);
      notifications.show({ title: 'Success', message: 'Phone number verified successfully!', color: 'green' });
    } catch (err) {
      setPhoneOtpError(err.message || 'Invalid OTP');
      notifications.show({ title: 'Error', message: err.message || 'Invalid OTP', color: 'red' });
    } finally {
      setPhoneVerifyLoading(false);
    }
  };


  // Send OTP to email
  const handleSendOTP = async () => {
    const email = form.values.email;
    if (!email || !validateEmail(email)) {
      setOtpError('Please enter a valid email address');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      await api.post('/api/auth/send-email-otp', { email });

      setOtpSent(true);
      setCountdown(60);
      notifications.show({
        title: 'OTP Sent',
        message: 'Verification code sent to your email',
        color: 'green',
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to send OTP';
      setOtpError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError('OTP must be exactly 6 digits');
      return;
    }

    setVerifyLoading(true);
    setOtpError(null);

    try {
      await api.post('/api/auth/verify-email-otp', { email: form.values.email, otp });

      setEmailVerified(true);
      setOtp('');
      notifications.show({
        title: 'Success',
        message: 'Email verified successfully!',
        color: 'green',
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to verify OTP';
      setOtpError(errorMessage);
      notifications.show({
        title: 'Verification Failed',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    // Ensure email is verified before submission
    if (!emailVerified) {
      setOtpError('Please verify your email first');
      return;
    }

    // Format date before submission
    let formattedValues = { ...values };
    if (formattedValues.dateOfBirth) {
      formattedValues.dateOfBirth = formatDate(formattedValues.dateOfBirth);
    }

    // Attach lab / pharmacy inventory arrays if present
    if (machines && machines.length) {
      formattedValues.machines = machines.map(m => ({
        name: m.name,
        model: m.model,
        manufacturer: m.manufacturer || undefined,
        purchaseDate: m.purchaseDate ? formatDate(m.purchaseDate) : undefined,
        status: m.status || undefined
      }));
    }
    if (facilities && facilities.length) {
      formattedValues.facilities = facilities;
    }
    if (medicines && medicines.length) {
      formattedValues.medicines = medicines.map(m => ({
        name: m.name,
        genericName: m.genericName || undefined,
        manufacturer: m.manufacturer || undefined,
        stock: m.stock,
        reorderLevel: m.reorderLevel || undefined,
        price: m.price,
        batchNumber: m.batchNumber || undefined,
        expiryDate: m.expiryDate ? formatDate(m.expiryDate) : undefined
      }));
    }

    // If hospital or doctor and files are included, use FormData
    if ((role === ROLES.HOSPITAL || (role === ROLES.DOCTOR && documents.length > 0))) {
      const formData = new FormData();
      // append all form values
      const vals = formattedValues;
      for (const key of Object.keys(vals)) {
        if (vals[key] !== undefined && vals[key] !== null) {
          formData.append(key, vals[key]);
        }
      }
      // ensure role is present
      formData.append('role', role);
      // append documents (if any)
      if (documents && documents.length) {
        for (const file of documents) {
          formData.append('documents', file, file.name);
        }
      }
      await onSubmit(formData);
      return;
    }
    await onSubmit(formattedValues);
  };

  if (!role) return null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Button variant="subtle" onClick={onBack}>Back</Button>
        <Text fw={600}>Account Details</Text>
      </Group>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput 
            label="Email (Optional)" 
            placeholder="your@email.com" 
            disabled={emailVerified}
            rightSection={emailVerified ? <IconCheck color="green" size={20} /> : null}
            {...form.getInputProps('email')} 
          />

          {/* Email Verification Section */}
          {!emailVerified && (
            <Stack gap="sm">
              {!otpSent ? (
                <Button 
                  variant="light" 
                  onClick={handleSendOTP} 
                  loading={otpLoading}
                  disabled={!form.values.email || !validateEmail(form.values.email)}
                >
                  Send Verification Code
                </Button>
              ) : (
                <>
                  <TextInput
                    label="Enter 6-digit OTP"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    error={otpError}
                  />
                  <Group>
                    <Button 
                      onClick={handleVerifyOTP} 
                      loading={verifyLoading}
                      disabled={otp.length !== 6}
                    >
                      Verify Email
                    </Button>
                    <Button 
                      variant="subtle" 
                      onClick={handleSendOTP} 
                      loading={otpLoading}
                      disabled={countdown > 0}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          )}

          {emailVerified && (
            <Alert color="green" icon={<IconCheck size={16} />}>
              Email verified successfully!
            </Alert>
          )}

          <PasswordInput label="Password" placeholder="Your password" required {...form.getInputProps('password')} />
          
          {/* Password Requirements Checklist */}
          <Box
            p="sm"
            style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}
          >
            {[
              { 
                label: 'Must start with a letter', 
                check: /^[a-zA-Z]/.test(form.values.password) 
              },
              { 
                label: 'At least one number (0-9)', 
                check: /\d/.test(form.values.password) 
              },
              { 
                label: 'At least one Lowercase alphabetic character (a-z)', 
                check: /[a-z]/.test(form.values.password) 
              },
              { 
                label: 'At least one Upper Case alphabetic character (A-Z)', 
                check: /[A-Z]/.test(form.values.password) 
              },
              { 
                label: 'Confirm Password Match', 
                check: form.values.password && form.values.confirmPassword && form.values.password === form.values.confirmPassword 
              },
              { 
                label: 'MUST BE AT LEAST 8 characters long', 
                check: form.values.password.length >= 8 
              },
            ].map((req, index) => (
              <Group key={index} gap="xs" mb={4}>
                <ThemeIcon 
                  size={18} 
                  radius="xl" 
                  color={form.values.password ? (req.check ? 'green' : 'red') : 'gray'}
                  variant="light"
                >
                  {form.values.password ? (
                    req.check ? <IconCheck size={12} /> : <IconX size={12} />
                  ) : (
                    <IconCheck size={12} />
                  )}
                </ThemeIcon>
                <Text 
                  size="sm" 
                  c={form.values.password ? (req.check ? 'green' : 'red') : 'dimmed'}
                  fw={req.label.includes('MUST BE') ? 700 : 400}
                >
                  {req.label}
                </Text>
              </Group>
            ))}
          </Box>

          <PasswordInput label="Confirm Password" placeholder="Confirm your password" required {...form.getInputProps('confirmPassword')} />

          {role === ROLES.PATIENT && (
            <>
              <TextInput label="Full Name" placeholder="Enter your full name" required {...form.getInputProps('name')} />
              <TextInput 
                label="Phone Number" 
                placeholder="10-digit phone number" 
                required 
                disabled={phoneVerified}
                rightSection={phoneVerified ? <IconCheck color="green" size={20} /> : null}
                {...form.getInputProps('phone')} 
              />
              
              {/* Phone Verification Section */}
              {!phoneVerified && (
                <Stack gap="sm">
                  {!phoneOtpSent ? (
                    <Button 
                      variant="light" 
                      onClick={handleSendPhoneOTP} 
                      loading={phoneOtpLoading}
                      disabled={!form.values.phone || !validatePhone(form.values.phone)}
                    >
                      Send Phone OTP
                    </Button>
                  ) : (
                    <>
                      <TextInput
                        label="Enter 6-digit OTP"
                        placeholder="123456"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        error={phoneOtpError}
                      />
                      <Group>
                        <Button 
                          onClick={handleVerifyPhoneOTP} 
                          loading={phoneVerifyLoading}
                          disabled={phoneOtp.length !== 6}
                        >
                          Verify Phone
                        </Button>
                        <Button 
                          variant="subtle" 
                          onClick={handleSendPhoneOTP} 
                          loading={phoneOtpLoading}
                          disabled={phoneCountdown > 0}
                        >
                          {phoneCountdown > 0 ? `Resend in ${phoneCountdown}s` : 'Resend OTP'}
                        </Button>
                      </Group>
                    </>
                  )}
                </Stack>
              )}

              {phoneVerified && (
                <Alert color="green" icon={<IconCheck size={16} />}>
                  Phone number verified successfully!
                </Alert>
              )}
              <TextInput label="Location" placeholder="City, State" {...form.getInputProps('location')} />
              <DateInput label="Date of Birth" placeholder="Select your date of birth" required maxDate={new Date()} {...form.getInputProps('dateOfBirth')} />
              <TextInput label="Aadhaar Last 4 Digits" placeholder="1234" {...form.getInputProps('aadhaarLast4')} />
            </>
          )}

          {role === ROLES.HOSPITAL && (
            <>
              <TextInput label="Hospital Name" placeholder="Enter hospital name" required {...form.getInputProps('name')} />
              <TextInput label="Location" placeholder="City, State" required {...form.getInputProps('location')} />
              <Text size="sm" c="dimmed" mt="md">
                Please upload legal documents (PDF, JPG, PNG) required for verification.
              </Text>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {role === ROLES.DOCTOR && (
            <>
              <TextInput label="Full Name" placeholder="Enter your full name" required {...form.getInputProps('name')} />
              <TextInput label="Qualification" placeholder="MBBS, MD, etc." required {...form.getInputProps('qualification')} />
              <NumberInput label="Experience (years)" placeholder="0" min={0} required {...form.getInputProps('experience')} />
              <TextInput label="Location" placeholder="City, State" required {...form.getInputProps('location')} />
              <DateInput label="Date of Birth" placeholder="Select your date of birth" required maxDate={new Date()} {...form.getInputProps('dateOfBirth')} />
              <TextInput label="Aadhaar Last 4 Digits" placeholder="1234" required {...form.getInputProps('aadhaarLast4')} />
              <TextInput label="Specialization" placeholder="Cardiology, etc." required {...form.getInputProps('specialization')} />
              <TextInput label="Hospital ID (optional)" placeholder="If affiliated with a hospital" {...form.getInputProps('hospitalId')} />
              <Text size="sm" mt="md">Please upload practice documents (PDF, JPG, PNG) for verification</Text>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {role === ROLES.LAB && (
            <>
              <TextInput label="Lab Name" placeholder="Enter lab name" required {...form.getInputProps('name')} />
              <TextInput label="Location" placeholder="City, State" required {...form.getInputProps('location')} />
                  <Text size="sm" mt="md">Machines</Text>
                  <Stack>
                    {machines.map((m, i) => (
                      <Group key={i} position="apart">
                        <Text>{m.name} — {m.model}</Text>
                        <Button size="xs" color="red" onClick={() => setMachines(prev => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                      </Group>
                    ))}
                    <Group>
                      <TextInput placeholder="Machine name" value={newMachine.name} onChange={(e) => setNewMachine({...newMachine, name: e.target.value})} />
                      <TextInput placeholder="Model" value={newMachine.model} onChange={(e) => setNewMachine({...newMachine, model: e.target.value})} />
                    </Group>
                    <Group>
                      <TextInput placeholder="Manufacturer (optional)" value={newMachine.manufacturer} onChange={(e) => setNewMachine({...newMachine, manufacturer: e.target.value})} />
                      <DateInput placeholder="Purchase date (optional)" value={newMachine.purchaseDate} onChange={(d) => setNewMachine({...newMachine, purchaseDate: d})} />
                      <Select
                        placeholder="Select status"
                        value={newMachine.status}
                        onChange={(val) => setNewMachine({ ...newMachine, status: val })}
                        data={Object.values(MACHINE_STATUS)}
                      />
                    </Group>
                    <Group>
                      <Button size="sm" onClick={() => {
                        if (!newMachine.name.trim() || !newMachine.model.trim()) return;
                        setMachines(prev => [...prev, newMachine]);
                        setNewMachine({ name: '', model: '', manufacturer: '', purchaseDate: null, status: '' });
                      }}>Add Machine</Button>
                    </Group>
                  </Stack>

                  <Text size="sm" mt="md">Facilities</Text>
                  <Stack>
                    {facilities.map((f, i) => (
                      <Group key={i} position="apart">
                        <Text>{f}</Text>
                        <Button size="xs" color="red" onClick={() => setFacilities(prev => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                      </Group>
                    ))}
                    <Group>
                      <TextInput placeholder="Facility name" value={facilityInput} onChange={(e) => setFacilityInput(e.target.value)} />
                      <Button size="sm" onClick={() => {
                        if (!facilityInput.trim()) return;
                        setFacilities(prev => [...prev, facilityInput.trim()]);
                        setFacilityInput('');
                      }}>Add Facility</Button>
                    </Group>
                  </Stack>
            </>
          )}

          {role === ROLES.PHARMACY && (
            <>
              <TextInput label="Pharmacy Name" placeholder="Enter pharmacy name" required {...form.getInputProps('name')} />
              <TextInput label="Location" placeholder="City, State" required {...form.getInputProps('location')} />
              <TextInput label="License Number" placeholder="Enter license number" required {...form.getInputProps('licenseNumber')} />
              <Text size="sm" mt="md">Medicines</Text>
              <Stack>
                {medicines.map((m, i) => (
                  <Group key={i} position="apart">
                    <Text>{m.name} — stock: {m.stock}</Text>
                    <Button size="xs" color="red" onClick={() => setMedicines(prev => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                  </Group>
                ))}
                <Group>
                  <TextInput placeholder="Medicine name" value={newMedicine.name} onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})} />
                  <TextInput placeholder="Generic name" value={newMedicine.genericName} onChange={(e) => setNewMedicine({...newMedicine, genericName: e.target.value})} />
                </Group>
                <Group>
                  <TextInput placeholder="Manufacturer" value={newMedicine.manufacturer} onChange={(e) => setNewMedicine({...newMedicine, manufacturer: e.target.value})} />
                  <NumberInput placeholder="Stock" value={newMedicine.stock} onChange={(val) => setNewMedicine({...newMedicine, stock: val || 0})} min={0} />
                  <NumberInput placeholder="Reorder level" value={newMedicine.reorderLevel} onChange={(val) => setNewMedicine({...newMedicine, reorderLevel: val || 0})} min={0} />
                </Group>
                <Group>
                  <NumberInput placeholder="Price" value={newMedicine.price} onChange={(val) => setNewMedicine({...newMedicine, price: val || 0})} min={0} />
                  <TextInput placeholder="Batch number" value={newMedicine.batchNumber} onChange={(e) => setNewMedicine({...newMedicine, batchNumber: e.target.value})} />
                  <DateInput placeholder="Expiry date" value={newMedicine.expiryDate} onChange={(d) => setNewMedicine({...newMedicine, expiryDate: d})} />
                </Group>
                <Group>
                  <Button size="sm" onClick={() => {
                    if (!newMedicine.name.trim()) return;
                    setMedicines(prev => [...prev, newMedicine]);
                    setNewMedicine({ name: '', genericName: '', manufacturer: '', stock: 0, reorderLevel: 0, price: 0, batchNumber: '', expiryDate: null });
                  }}>Add Medicine</Button>
                </Group>
              </Stack>
            </>
          )}

          {error && (
            <Alert icon={<IconAlertCircle />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <Checkbox
            label={
              <Text size="sm">
                I accept the{' '}
                <Anchor href="/privacy" target="_blank" rel="noopener noreferrer" size="sm">
                  Privacy Policy
                </Anchor>
                {' '}and{' '}
                <Anchor href="/terms" target="_blank" rel="noopener noreferrer" size="sm">
                  Terms & Conditions
                </Anchor>
              </Text>
            }
            required
            {...form.getInputProps('termsAccepted', { type: 'checkbox' })}
          />

          <Button type="submit" fullWidth loading={loading} disabled={!emailVerified || !form.values.termsAccepted}>
            Register
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md">
        Already have an account?{' '}
        <Button variant="subtle" size="sm" onClick={() => navigate('/login')}>
          Login
        </Button>
      </Text>
    </Stack>
  );
}
