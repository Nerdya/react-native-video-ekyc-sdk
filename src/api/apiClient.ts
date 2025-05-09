import axios, { AxiosInstance } from 'axios';
import { APIClientOptions } from '../types/APIClientOptions';

class APIClient {
  private client: AxiosInstance;

  constructor(options?: APIClientOptions) {
    this.client = axios.create({
      baseURL: options?.baseURL || 'https://vekyc-gateway-server-uat.mobifi.vn',
      timeout: options?.timeout || 30000,
      headers: options?.headers || { 'Content-Type': 'application/json' },
    });

    if (options?.token) {
      this.client.interceptors.request.use(config => {
        config.headers.Authorization = `Bearer ${options?.token}`;
        return config;
      });
    }
  }

  getClient() {
    return this.client;
  }
}

// Factory function to create an instance
export function createAPIClient(options?: APIClientOptions) {
  return new APIClient(options).getClient();
}
