export type ApiResponse<T> = {
  status: boolean;
  message: string;
  httpCode: number;
  errorCode: string;
  id?: number;
  data?: T;
}
