// src/services/notificationService.ts
/**
* Initialize Push Notifications for the user
*/
var initializePushNotifications = async (userId) => {
	if (!("Notification" in window)) {
		console.log("This browser does not support notifications");
		return;
	}
	try {
		if (await Notification.requestPermission() === "granted") console.log("Notification permission granted. Ready for FCM token registration.");
	} catch (error) {
		console.error("Error initializing push notifications:", error);
	}
};
export { initializePushNotifications };
