import React from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

export function showSuccessNotification(message, title = 'Success') {
  notifications.show({
    title,
    message,
    color: 'green',
    icon: React.createElement(IconCheck),
    autoClose: 5000,
  });
}

export function showErrorNotification(message, title = 'Error') {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: React.createElement(IconX),
    autoClose: 7000,
  });
}

export function showWarningNotification(message, title = 'Warning') {
  notifications.show({
    title,
    message,
    color: 'yellow',
    icon: React.createElement(IconAlertCircle),
    autoClose: 6000,
  });
}

export function showInfoNotification(message, title = 'Info') {
  notifications.show({
    title,
    message,
    color: 'blue',
    icon: React.createElement(IconInfoCircle),
    autoClose: 5000,
  });
}

export function showLoadingNotification(message, id, title = 'Loading') {
  notifications.show({
    id,
    title,
    message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
}

export function updateNotification(id, { message, title, color, icon }) {
  notifications.update({
    id,
    message,
    title,
    color,
    icon,
  });
}