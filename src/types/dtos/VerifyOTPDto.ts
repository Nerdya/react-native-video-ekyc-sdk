export type VerifyOTPDto = {
  numberLimit: number;
  token: string;
  status: boolean;
  sessionVideoDto: {
    sessionId: string;
    key: string;
    code: string;
    webcamToken: string;
    screenToken: string;
    subId: string;
  };
};
