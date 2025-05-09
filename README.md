# react-native-vpage-sdk

Deep integration React Native SDK for embedding new VPBank Neo onboarding flows into Android & iOS apps.

> **Important**: It is not a general-purpose SDK — it must be used as part of a **guided implementation flow**. Please refer to the full [integration flow](#integration-flow) below to ensure proper setup.

## Installation

> **Note**: Ensure that you have react-native version 0.60.0 or higher installed.

You can install `react-native-vpage-sdk` using yarn:

```shell script
yarn add react-native-vpage-sdk
```

or npm:

```shell script
npm i react-native-vpage-sdk
```

## Integration Flow

To successfully integrate `react-native-vpage-sdk`, follow the step-by-step instructions outlined below. These steps cover:

### Prerequisites

> **Note**: Ensure your React Native project has `react-native-vpage-sdk` installed.

Add the required permissions to your project:

- For iOS, update your `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to capture video.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to capture audio.</string>
```

- For Android, ensure the following permissions are added to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Set a config variable:

```typescript
const config = {
    vpageBaseUrl: "<YOUR_VPAGE_URL>",
    vcoreBaseUrl: "<YOUR_VCORE_URL>",
    socketBaseUrl: "<YOUR_SOCKET_URL>",
    socketHealthCheck: 3000, // Health check interval in milliseconds
    appId: "<YOUR_APP_ID>",
};
```

### Step 1: Get required parameters

`appointmentId` and `apiToken` will be distributed privately.

```typescript
const appointmentId = "<YOUR_APPOINTMENT_ID>";
const apiToken = "<YOUR_API_TOKEN>";
```

### Step 2: Create a meeting

Create a meeting to get the `token`, `channelName` and `localUid`:

```typescript
import { createApiService } from 'react-native-vpage-sdk';

const apiService = createApiService({
    baseUrl: config.vcoreBaseUrl,
    headers: { token: apiToken }
});

const res = await apiService.createMeeting(appointmentId, customerIp);
const appId = config?.appId;
const token = res?.data?.code;
const channelName = res?.data?.key;
const localUid = res?.data?.subId;
```

### Step 3: Request permissions

Request audio and video permissions:

```typescript
import { createVekycService } from 'react-native-vpage-sdk';

const vekycService = createVekycService();

const [vekycServiceInstance, setVekycServiceInstance] = useState(vekycService);
const [isJoined, setIsJoined] = useState(false);
const [remoteUid, setRemoteUid] = useState(0);

const permissions = await vekycService.getPermissions();
if (!permissions.microphone || !permissions.camera) {
    console.error('Permissions not granted');
    return;
}
```

### Step 4: Connect to the WebSocket server

Initialize the STOMP client:

```typescript
import { createSocketService } from 'react-native-vpage-sdk';

const socketService = createSocketService();

const [socketServiceInstance, setSocketServiceInstance] = useState(socketService);

socketService.initialize(config.socketBaseUrl, channelName, apiToken);
```

Register the WebSocket event handler:

```typescript
socketService.registerEventHandler({
    onConnect: (frame) => {
        socketService.subscribeSessionNotifyTopic(async (message) => {
            // Handle session notify messages
        });
        socketService.subscribeSocketNotifyTopic((message) => {
            // Handle socket notify messages
        });
        socketService.subscribeSocketHealthTopic((message) => {
            // Subscribe to extend socket session
        });
        socketService.subscribeAppLiveTopic((message) => {
            // Subscribe to extend token expiration time
        });
    },
    onDisconnect: (frame) => {
        // Handle socket disconnect event
    },
    // Other event handlers...
});
```

Connect to the WebSocket server:

```typescript
socketService.connect(socketService.getDeviceInfo());
setSocketServiceInstance(socketService);
```

### Step 5: Join the Video Call

Initialize the RTC engine:

```typescript
vekycService.initialize(appId);
```

Register the veKYC event handler:

```typescript
vekycService.registerEventHandler({
    onJoinChannelSuccess: () => {
        vekycService.enableVideo();
        vekycService.startPreview();
        setIsJoined(true);
    },
    onUserJoined: (_connection, uid) => {
        setRemoteUid(() => uid);
    },
    onUserOffline: (_connection, uid) => {
        setRemoteUid((prevUid) => (prevUid === uid ? 0 : prevUid));
    },
    // Other event handlers...
});
```

Join the channel:

```typescript
vekycService.joinChannel(token, channelName, localUid, {});
setVekycServiceInstance(vekycService);
```

### Step 6: Hook a session

Hook to a call session with agent, start the health check if succeed:

```typescript
const res = await apiService?.hook(channelName, channelName);

socketService.startHealthCheck(socketServiceInstance);
```

### Step 7: Close call

Close the call session:

```typescript
const res = await apiService?.closeVideo(channelName);
```

### Step 8: Cleanup

Cleanup left over resources after closing call.

```typescript
vekycService.cleanup();
socketService.cleanup();
```

## Example Flow

Here’s an example of the complete flow, using `react-native-vpage-sdk`:

[https://github.com/Nerdya/vpage-app](https://github.com/Nerdya/vpage-app)

## API

See the method's detailed usage in the documentation comment of the respective method.

### Web APIs

Use `createAPIService(options)` to initialize APIService.

Method | Description
:- | :-
`getConfigInfo(appointmentId)` | Fetches configuration information for a given appointment.
`createMeeting(appointmentId, customerIp, agentId?)` | Creates a meeting for a given appointment.
`saveLog(contractAction, detail?, sessionKey?)` | Saves a log entry with contract action and optional details.
`hook(sessionId, sessionKey, agentId?)` | Hooks a session with the given session ID, session key, and optional agent ID.
`closeVideo(sessionKey)` | Closes a video session for a given session key.
`getContractList(sessionKey)` | Retrieves the list of contracts associated with a given session key.
`getContractURL(sessionKey)` | Retrieves the URL of a specific contract associated with a session key.
`confirmContract(sessionKey)` | Confirms a contract associated with a given session key.
`rateCall(callRating, callFeedback, agentRating, agentFeedback)` | Rates a call and provides feedback for both the video call and the agent.

### Crypto

Use `createCryptoService()` to initialize CryptoService.

Method | Description
:- | :-
`encryptionAES(text, key)` | Encrypts a given text using AES encryption with the provided key.
`decryptionAES(text, key)` | Decrypts a given AES-encrypted text using the provided key.
`decryptWS6Url(url)` | Decrypts the token from a given URL and extracts the base URL, appointment ID, and decrypted token.

### VEKYC

Use `createVekycService()` to initialize VekycService.

Method | Description
:- | :-
`getPermissions()` | Requests the necessary permissions for audio and video on Android and iOS devices.
`initialize(appId)` | Initializes the RTC engine with the provided App ID.
`registerEventHandler(eventHandler)` | Registers an event handler for receiving RTC engine callbacks.
`joinChannel(token, channelName, localUid, options?)` | Joins a channel as a broadcaster with the specified options.
`enableVideo()` | Enables video functionality in the RTC engine.
`startPreview()` | Starts the local video preview.
`toggleMicrophone(isEnabled)` | Toggles the microphone state for the local user.
`switchCamera()` | Switches the camera between the front and rear cameras.
`stopPreview()` | Stops the local video preview.
`leaveChannel()` | Leaves the current channel.
`unregisterEventHandler()` | Unregisters the event handler from the RTC engine.
`cleanup()` | Cleans up the RTC engine and releases all resources.

### WebSocket

Use `createSocketService()` to initialize SocketService.

Method | Description
:- | :-
`initialize(serverURL, sessionKey, token, debugCallback?)` | Initializes the STOMP client with the given WebSocket server URL and configuration.
`subscribe(topic, callback)` | Subscribes to a specific topic on the WebSocket server.
`subscribeSessionNotifyTopic(callback)` | Subscribes to the session notification topic.
`subscribeSocketNotifyTopic(callback)` | Subscribes to the socket notification topic.
`subscribeSocketHealthTopic(callback)` | Subscribes to the socket health topic.
`subscribeAppLiveTopic(callback)` | Subscribes to the application live topic.
`send(destination, headers?, body?)` | Sends a message to a specific destination using the STOMP client.
`clearHealthCheck()` | Clears the health check interval.
`startHealthCheck(socketService)` | Starts the interval to send health checks.
`validateToken(socketService)` | Validates the token by sending a health check message.
`sendNetworkStatus(downlinkNetworkQuality, uplinkNetworkQuality, isLow)` | Sends the network status to the server.
`registerEventHandler(handlers)` | Registers event handlers for the STOMP client.
`getDeviceInfo(appName?)` | Retrieves device information including the operating system, device model, and browser name.
`connect(deviceInfo?)` | Connects to the STOMP WebSocket server.
`disconnect()` | Disconnects from the STOMP WebSocket server.
`unregisterEventHandler()` | Unregisters all event handlers for the STOMP client.
`unsubscribe()` | Unsubscribes from a specific topic.
`unsubscribeTopics()` | Unsubscribes from all predefined topics.
`cleanup()` | Cleans up the STOMP client instance by clearing health checks, disconnecting, and unregistering handlers.

## License

MIT
