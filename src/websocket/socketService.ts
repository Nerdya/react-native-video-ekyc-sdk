import { ActivationState, Client, IFrame, IMessage, StompHeaders, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../utils/environment';
import { Platform } from 'react-native';

class SocketService {
  private socket?: any;
  private sessionKey: string = '';
  protected token: string = '';
  protected socketId: string = '';
  private client?: Client;
  public timerInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes the STOMP client with the given WebSocket server URL and configuration.
   * @param serverURL - The base URL of the WebSocket server.
   * @param sessionKey - The session key for the user.
   * @param token - The authentication token.
   * @param debugCallback - (Optional) Callback for debugging messages.
   */
  initialize(
    serverURL: string,
    sessionKey: string,
    token: string,
    debugCallback = (message: string) => {}
  ): void {
    if (this.client) {
      console.error('STOMP client is already initialized.');
      return;
    }
    this.socket = new SockJS(serverURL + environment.SOCKET_PATH, null, { timeout: 30000 });
    this.sessionKey = sessionKey;
    this.token = token;
    this.client = new Client({
      webSocketFactory: () => this.socket,
      brokerURL: undefined,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 5000,
      heartbeatIncoming: 5000,
      heartbeatOutgoing: 5000,
      debug: debugCallback,
    });
  }

  /**
   * Sets the socket ID based on the WebSocket URL.
   */
  private setSocketId(): void {
    const url = this.socket?._transport?.url?.toString();
    if (url && url.includes(environment.SOCKET_PATH)) {
      const parts = url.split(environment.SOCKET_PATH);
      if (parts.length > 1) {
        const pathAfterSocketPath = parts[1];
        const segments = pathAfterSocketPath.split('/');
        this.socketId = segments[2] || '';
      } else {
        console.warn('Unexpected path after socket path:', parts);
      }
    } else {
      console.warn('Unexpected url:', url);
    }
  }

  /**
   * Subscribes to a specific topic on the WebSocket server.
   * @param topic - The topic to subscribe to (e.g., `/topic/example`).
   * @param callback - A callback function to handle incoming messages for the topic.
   * @returns The subscription object if the client is initialized, otherwise `undefined`.
   */
  subscribe(topic: string, callback: (message: IMessage) => void): StompSubscription | undefined {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    return this.client.subscribe(topic, callback);
  }

  /**
   * Subscribes to the session notification topic.
   * @param callback - A callback function to handle incoming messages for the session notification topic.
   * @returns The subscription object if the client is initialized, otherwise `undefined`.
   */
  subscribeSessionNotifyTopic(callback: (msg: IMessage) => void) {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    return this.subscribe(`/user/${this.sessionKey}/notify`, callback);
  }

  /**
   * Subscribes to the socket notification topic.
   * @param callback - A callback function to handle incoming messages for the socket notification topic.
   * @returns The subscription object if the client is initialized, otherwise `undefined`.
   */
  subscribeSocketNotifyTopic(callback: (msg: IMessage) => void) {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    return this.subscribe(`/user/${this.socketId}/notify`, callback);
  }

  /**
   * Subscribes to the socket health topic.
   * @param callback - A callback function to handle incoming messages for the socket health topic.
   * @returns The subscription object if the client is initialized, otherwise `undefined`.
   */
  subscribeSocketHealthTopic(callback: (msg: IMessage) => void) {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    return this.subscribe(`/user/${this.socketId}/health`, callback);
  }

  /**
   * Subscribes to the application live topic.
   * @param callback - A callback function to handle incoming messages for the application live topic.
   * @returns The subscription object if the client is initialized, otherwise `undefined`.
   */
  subscribeAppLiveTopic(callback: (msg: IMessage) => void) {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    return this.subscribe(`/app/live`, callback);
  }

  /**
   * Sends a message to a specific destination using the STOMP client.
   * @param destination - The destination to send the message to (e.g., a topic or queue).
   * @param headers - (Optional) Headers to include with the message.
   * @param body - (Optional) The body of the message to send.
   */
  send(destination: string, headers?: Record<string, string>, body?: any): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.client.publish({ destination, headers, body });
  }

  /**
   * Clears the health check interval.
   */
  clearHealthCheck(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('Health check cleared.');
    }
  }

  /**
   * Starts the interval to send health checks.
   * @param socketService - The instance of the SocketService.
   */
  startHealthCheck(socketService: SocketService): void {
    const timeSleep = 3000;
    this.clearHealthCheck();
    if (!socketService) {
      console.warn('startHealthCheck: Socket service instance is null.');
      return;
    }
    this.timerInterval = setInterval(() => this.validateToken(socketService), timeSleep);
    console.log('Health check started.');
  }

  /**
   * Validates the token by sending a health check message.
   * @param socketService - The instance of the SocketService.
   */
  private validateToken(socketService: SocketService): void {
    try {
      socketService.send(
        `/app/healthCheck`, 
        {
          'Access-Control-Allow-Origin': '*',
          timestamp: new Date().getTime().toString(),
          token: socketService.token,
          socketId: socketService.socketId,
        }
      );
    } catch (error) {
      // console.warn('validateToken: Socket service instance is null.');
    }
  }

  /**
   * Sends the network status to the server.
   * @param downlinkNetworkQuality - The quality of the downlink network.
   * @param uplinkNetworkQuality - The quality of the uplink network.
   * @param isLow - Indicates if the network is in a low state.
   * 
   * This method sends information about the downlink and uplink network quality
   * to the `/app/network` endpoint using the STOMP client.
   * 
   * It is calculated based on the uplink transmission bitrate, uplink packet loss rate, RTT (round-trip time) and jitter.
   *
   * 0: The quality is unknown.
   * 1: The quality is excellent.
   * 2: The quality is good, but the bitrate is less than optimal.
   * 3: Users experience slightly impaired communication.
   * 4: Users can communicate with each other, but not very smoothly.
   * 5: The quality is so poor that users can barely communicate.
   * 6: The network is disconnected and users cannot communicate.
   */
  sendNetworkStatus(downlinkNetworkQuality: number, uplinkNetworkQuality: number, isLow: null | 'true'): void {
    try {
      this.send(
        `/app/network`, 
        {
          'Access-Control-Allow-Origin': '*',
          sessionKey: this.sessionKey,
          token: this.token,
          socketId: this.socketId,
        },
        JSON.stringify({
          user: 'CUSTOMER',
          sessionKey: this.sessionKey,
          socketId: this.socketId,
          downlinkNetworkQuality,
          uplinkNetworkQuality,
          ...(isLow !== null && { isLow }),
        })
      );
    } catch (error) {
      console.warn('Error sending network status:', error);
    }
  }

  /**
   * Registers event handlers for the STOMP client.
   * @param handlers - The event handlers to register.
   */
  registerEventHandler({
    onUnhandledMessage = (message: IMessage) => {},
    onUnhandledReceipt = (frame: IFrame) => {},
    onUnhandledFrame = (frame: IFrame) => {},
    beforeConnect = async (client: Client) => {},
    onConnect = (frame: IFrame) => {},
    onDisconnect = (frame: IFrame) => {},
    onStompError = (frame: IFrame) => {},
    onWebSocketClose = (event: any) => {},
    onWebSocketError = (event: any) => {},
    onChangeState = (state: ActivationState) => {},
  } = {}): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.client.onUnhandledMessage = onUnhandledMessage;
    this.client.onUnhandledReceipt = onUnhandledReceipt;
    this.client.onUnhandledFrame = onUnhandledFrame;
    this.client.beforeConnect = beforeConnect;
    this.client.onConnect = (frame) => {
      this.setSocketId();
      onConnect(frame);
    };
    this.client.onDisconnect = onDisconnect;
    this.client.onStompError = onStompError;
    this.client.onWebSocketClose = onWebSocketClose;
    this.client.onWebSocketError = onWebSocketError;
    this.client.onChangeState = onChangeState;
  }

  /**
   * Retrieves device information including the operating system, device model, and browser name.
   * @param appName - (Optional) The name of the application to be used as the browser name. Default is App.
   * @returns An object containing the operating system, device model, and browser name.
   * 
   * This method attempts to gather device information using the following libraries in order:
   * 1. `expo-device` - Provides detailed device information. Ensure this library is installed if you want to use it.
   * 2. `react-native-device-info` - Used as a fallback if `expo-device` is not available. Ensure this library is installed if you want to use it.
   * 
   * If neither library is available, it falls back to using `Platform.OS` for the operating system and sets the device name to "Unknown".
   */
  getDeviceInfo(appName = 'App'): { os: string; device: string; browser: string } {
    try {
      // Try expo-device first
      const ExpoDevice = require('expo-device');
      if (ExpoDevice && ExpoDevice.osName && ExpoDevice.osVersion && ExpoDevice.modelName) {
        return {
          os: `${ExpoDevice.osName} ${ExpoDevice.osVersion}`,
          device: ExpoDevice.modelName || 'Unknown',
          browser: appName,
        };
      }
    } catch (e) {
      console.warn('expo-device not available:', e);
    }
    try {
      // Fallback to react-native-device-info
      const RNDeviceInfo = require('react-native-device-info');
      if (RNDeviceInfo) {
        return {
          os: `${RNDeviceInfo.getSystemName()} ${RNDeviceInfo.getSystemVersion()}`,
          device: RNDeviceInfo.getDeviceNameSync?.() || RNDeviceInfo.getModel?.() || 'Unknown',
          browser: appName,
        };
      }
    } catch (e) {
      console.warn('react-native-device-info not available:', e);
    }
    // Final fallback
    return {
      os: Platform.OS,
      device: 'Unknown',
      browser: appName,
    };
  }

  /**
   * Connects to the STOMP WebSocket server.
   * @param deviceInfo - Optional device information to include in the connection headers.
   */
  connect(deviceInfo: Record<string, any> = {}): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    if (this.client.connected) {
      console.error('STOMP client is already connected.');
      return;
    }
    const socketHeaders: StompHeaders = {
      'Access-Control-Allow-Origin': '*',
      token: this.token,
      deviceInfo: JSON.stringify(deviceInfo),
    };
    this.client.connectHeaders = socketHeaders;
    this.client.activate();
  }

  /**
   * Disconnects from the STOMP WebSocket server.
   * @returns A promise that resolves when the client is disconnected.
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    await this.client.deactivate();
  }

  /**
   * Unregisters all event handlers for the STOMP client.
   */
  unregisterEventHandler(): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.client.onUnhandledMessage = () => {};
    this.client.onUnhandledReceipt = () => {};
    this.client.onUnhandledFrame = () => {};
    this.client.beforeConnect = () => {};
    this.client.onConnect = () => {};
    this.client.onDisconnect = () => {};
    this.client.onStompError = () => {};
    this.client.onWebSocketClose = () => {};
    this.client.onWebSocketError = () => {};
    this.client.onChangeState = () => {};
  }

  /**
   * Unsubscribes from a specific topic.
   * @param topic - The topic to unsubscribe from.
   */
  unsubscribe(topic: string): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.client.unsubscribe(topic);
  }

  /**
   * Unsubscribes from all predefined topics.
   */
  unsubscribeTopics(): void {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.unsubscribe(`/user/${this.sessionKey}/notify`);
    this.unsubscribe(`/user/${this.socketId}/notify`);
    this.unsubscribe(`/user/${this.socketId}/health`);
    this.unsubscribe(`/app/live`);
  }

  /**
   * Cleans up the STOMP client instance by clearing health checks, disconnecting, and unregistering handlers.
   * @returns A promise that resolves when cleanup is complete.
   */
  async cleanup(): Promise<void> {
    if (!this.client) {
      console.error('STOMP client is not initialized.');
      return;
    }
    this.clearHealthCheck();
    await this.disconnect();
    this.unregisterEventHandler();
    this.unsubscribeTopics();
    this.client = undefined;
    this.socket = undefined;
  }
}

/**
 * Factory function to create an instance of SocketService.
 * @returns {SocketService} A new instance of SocketService.
 */
export function createSocketService() {
  return new SocketService();
}
