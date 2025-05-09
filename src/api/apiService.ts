import { AxiosInstance } from 'axios';
import { createAPIClient } from './apiClient';
import { environment } from '../utils/environment';
import { APIClientOptions, ApiResponse, CheckSelfKycDto, ConfigDto, ContractDto, ContractURLDto, CreateMeetingDto, ResendOTPDto, SubmitDto, VerifyOTPDto } from '../types';
import publicIP from "react-native-public-ip";

export enum ContractAction {
  AGENT_REJECT = 'AGENT_REJECT',
  CUSTOMER_CONNECTED = 'CUSTOMER_CONNECTED',
  CUSTOMER_DISCONNECT = 'CUSTOMER_DISCONNECT',
  AGENT_CHECK_KYC = 'AGENT_CHECK_KYC',
  AGENT_CONFIRM_KYC = 'AGENT_CONFIRM_KYC',
  OTP_CONFIRM = 'OTP_CONFIRM',
  AGENT_END_CALL = 'AGENT_END_CALL',
  CALL_TIME_OUT = 'CALL_TIME_OUT',
  AGENT_DISCONNECT = 'AGENT_DISCONNECT',
  AGENT_CONFIRM_LEGAL = 'AGENT_CONFIRM_LEGAL',
  CUSTOMER_END_CALL = 'CUSTOMER_END_CALL',
  KSV_APPROVE = 'KSV_APPROVE',
  KSV_NEED_REVIEW = 'KSV_NEED_REVIEW',
  KSV_REJECT = 'KSV_REJECT',
  CUSTOMER_CONFIRM = 'CUSTOMER_CONFIRM',
  CUSTOMER_ACTIVED_LINK = 'CUSTOMER_ACTIVED_LINK',
  CUSTOMER_OTP_CONFIRMED = 'CUSTOMER_OTP_CONFIRMED',
  CUSTOMER_TEST_CAM_MIC = 'CUSTOMER_TEST_CAM_MIC',
  CUSTOMER_INCOMMING = 'CUSTOMER_INCOMMING',
  OTP_BYPASS = 'OTP_BYPASS',
}

/**
 * APIService provides methods to interact with the backend API.
 * It includes functionality for making GET and POST requests, handling dynamic path parameters,
 * and performing various operations such as fetching configuration, creating meetings, verifying OTPs, and more.
 */
class APIService {
  private client: AxiosInstance;

  /**
   * Creates an instance of APIService.
   * @param client - An Axios instance for making HTTP requests.
   */
  constructor(client: AxiosInstance) {
    this.client = client;
  }

  /**
   * Sends a GET request to the specified endpoint with optional query parameters.
   * @param endpoint - The API endpoint to send the GET request to.
   * @param params - (Optional) Query parameters for the request.
   * @returns A promise resolving to the response data.
   */
  private async get(endpoint: string, params?: Record<string, any>) {
    try {
      const res = await this.client.get(endpoint, { params });
      return res.data as unknown;
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
    }
  }

  /**
   * Sends a GET request to an endpoint with dynamic path parameters.
   * @param endpoint - The API endpoint with placeholders for dynamic parameters.
   * @param ids - An object containing the dynamic parameters to replace in the endpoint.
   * @param params - (Optional) Query parameters for the request.
   * @returns A promise resolving to the response data.
   */
  private async getChildren(endpoint: string, ids: Record<string, any>, params?: Record<string, any>) {
    const keys = Object.keys(ids);
    for (const key of keys) {
      if (endpoint.toString().includes(':' + key)) {
        endpoint = endpoint.toString().replace(':' + key, ids[key]);
      }
    }
    return this.get(endpoint, params);
  }

  /**
   * Sends a POST request to the specified endpoint with optional payload data.
   * @param endpoint - The API endpoint to send the POST request to.
   * @param data - (Optional) The payload data for the request.
   * @returns A promise resolving to the response data.
   */
  private async post(endpoint: string, data?: Record<string, any>) {
    try {
      const res = await this.client.post(endpoint, data);
      return res.data as unknown;
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
    }
  }

  /**
   * Sends a POST request to an endpoint with dynamic path parameters.
   * @param endpoint - The API endpoint with placeholders for dynamic parameters.
   * @param ids - An object containing the dynamic parameters to replace in the endpoint.
   * @param data - (Optional) The payload data for the request.
   * @returns A promise resolving to the response data.
   */
  private async postChildren(endpoint: string, ids: Record<string, any>, data?: Record<string, any>) {
    const keys = Object.keys(ids);
    for (const key of keys) {
      if (endpoint.toString().includes(':' + key)) {
        endpoint = endpoint.toString().replace(':' + key, ids[key]);
      }
    }
    return this.post(endpoint, data);
  }

  /**
   * Fetches configuration information for a given appointment.
   * @param appointmentId - The ID of the appointment.
   * @returns A promise resolving to the configuration information.
   */
  async getConfigInfo(appointmentId: string) {
    try {
      const params = { appointment_id: appointmentId };
      const res = await this.get(environment.GET_CONFIG_INFO, params);
      return res as ApiResponse<ConfigDto>;
    } catch (error) {
      console.error('Error fetching info:', error);
    }
  }

  /**
   * Retrieves the public IP address of the device using the `react-native-public-ip` library.
   * @param timeoutMs - (Optional) The maximum time (in milliseconds) to wait for the IP address before timing out. Default is 3000ms.
   * @returns A promise resolving to the public IP address as a string, or `undefined` if an error occurs.
   */
  async getIPAddress(timeoutMs = 3000) {
    try {
      const timeout = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeoutMs)
      );
      const ip = await Promise.race([publicIP(), timeout]);
      return ip;
    } catch (error) {
      console.error('Error fetching public IP:', error);
    }
  };

  /**
   * Creates a meeting for a given appointment.
   * @param appointmentId - The ID of the appointment.
   * @param customerIp - The customer's public IP address.
   * @param agentId - (Optional) The ID of the agent.
   * @returns A promise resolving to the meeting creation response.
   */
  async createMeeting(appointmentId: string, customerIp: string, agentId = null) {
    try {
      const ids = { id: appointmentId };
      const payload: any = { customerIp, agent_id: agentId };
      const res = await this.postChildren(environment.CREATE_MEETING, ids, payload);
      return res as ApiResponse<CreateMeetingDto>;
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  }

  /**
   * Saves a log entry with contract action and optional details.
   * @param contractAction - The contract action to be logged.
   * @param detail - (Optional) Additional details to include in the log.
   * @param sessionKey - (Optional) The session key associated with the log.
   * @returns A promise resolving to the response data of the log save operation.
   */
  async saveLog(contractAction: ContractAction, detail: any = null, sessionKey: any = "") {
    try {
      const payload = { actionHistory: contractAction, detail, sessionKey };
      const res = await this.post(environment.SAVE_LOG, payload);
      return res as ApiResponse<any>;
    } catch (error) {
      console.error('Error saving log:', error);
    }
  }

  /**
   * Submits data for a given appointment.
   * @param appointmentId - The ID of the appointment.
   * @param agentId - (Optional) The ID of the agent.
   * @returns A promise resolving to the submission response.
   */
  async submit(appointmentId: string, agentId = null) {
    try {
      const payload: any = { id: appointmentId, agent_id: agentId };
      const res = await this.post(environment.SUBMIT, payload);
      return res as ApiResponse<SubmitDto>;
    } catch (error) {
      console.error('Error submitting:', error);
    }
  }

  /**
   * Hooks a session with the given session ID, session key, and optional agent ID.
   * @param sessionId - The unique identifier of the session.
   * @param sessionKey - The session key associated with the session.
   * @param agentId - (Optional) The unique identifier of the agent.
   * @returns A promise resolving to the response data of the hook operation.
   */
  async hook(sessionId: string, sessionKey: string, agentId = null) {
    try {
      const payload: any = { sessionId, sessionKey, agentId };
      const res = await this.post(environment.HOOK, payload);
      return res as ApiResponse<any>;
    } catch (error) {
      console.error('Error hooking:', error);
    }
  }

  /**
   * Closes a video session for a given session key.
   * @param sessionKey - The session key associated with the video session.
   * @returns A promise resolving to the response data of the video session closure.
   */
  async closeVideo(sessionKey: string) {
    try {
      const payload = { sessionKey, type: 'USER' };
      const res = await this.post(environment.CLOSE_VIDEO, payload);
      return res as ApiResponse<any>;
    } catch (error) {
      console.error('Error closing video:', error);
    }
  }

  /**
   * Retrieves the list of contracts associated with a given session key.
   * @param sessionKey - The session key for the meeting.
   * @returns A promise resolving to the list of contracts.
   */
  async getContractList(sessionKey: string) {
    try {
      const params = { meetingId: sessionKey };
      const res = await this.get(environment.GET_CONTRACT_LIST, params);
      return res as ApiResponse<ContractDto[]>;
    } catch (error) {
      console.error('Error getting contract list:', error);
    }
  }

  /**
   * Retrieves the URL of a specific contract associated with a session key.
   * @param sessionKey - The session key for the contract.
   * @returns A promise resolving to the contract URL.
   */
  async getContractURL(sessionKey: string) {
    try {
      const ids = { id: sessionKey };
      const res = await this.getChildren(environment.GET_CONTRACT_URL, ids);
      return res as ApiResponse<ContractURLDto>;
    } catch (error) {
      console.error('Error getting contract URL:', error);
    }
  }

  /**
   * Confirms a contract associated with a given session key.
   * @param sessionKey - The session key for the contract.
   * @returns A promise resolving to the confirmation response.
   */
  async confirmContract(sessionKey: string) {
    try {
      const ids = { id: sessionKey };
      const res = await this.postChildren(environment.CONFIRM_CONTRACT, ids);
      return res as ApiResponse<any>;
    } catch (error) {
      console.error('Error confirming contract:', error);
    }
  }

  /**
   * Rates a call and provides feedback for both the video call and the agent.
   * @param callRating - The rating for the video call (e.g., 1-5).
   * @param callFeedback - The feedback text for the video call.
   * @param agentRating - The rating for the agent (e.g., 1-5).
   * @param agentFeedback - The feedback text for the agent.
   * @returns A promise resolving to the response data of the rating operation.
   */
  async rateCall(callRating: string, callFeedback: string, agentRating: string, agentFeedback: string) {
    try {
      const payload = {
        rating_video_call: callRating,
        customer_feedback: callFeedback,
        rating_agent: agentRating,
        customer_feedback_agent: agentFeedback
      };
      const res = await this.post(environment.RATING, payload);
      return res as ApiResponse<any>;
    } catch (error) {
      console.error('Error rating:', error);
    }
  }
}

/**
 * Creates and returns an instance of APIService.
 * @param options - (Optional) Configuration options for the Axios client.
 * @returns A new instance of APIService.
 */
export function createAPIService(options?: APIClientOptions) {
  const client = createAPIClient(options);
  return new APIService(client);
}
