export type ResendOTPDto = {
  currentTime: number;
  expiredTime: number;
  numberLimit: number;
  count: number;
  transactionId: string;
};
