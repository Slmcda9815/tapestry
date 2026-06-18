
import * as Notifications from 'expo-notifications';

export async function scheduleHourlyPing() {
  // Clear existing notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule for every hour (next 24 hours)
  for (let i = 1; i <= 24; i++) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Tapestry Time! 🎬",
        body: "Capture your 5-second moment now.",
      },
      trigger: {
        seconds: i * 3600, // Every hour
      },
    });
  }
}

export async function scheduleTestPing() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tapestry Time! 🎬",
      body: "Capture your 5-second moment now.",
    },
    trigger: {
      seconds: 5, // 5 seconds from now
    },
  });
}
