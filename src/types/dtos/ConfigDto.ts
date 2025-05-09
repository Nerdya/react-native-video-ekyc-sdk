export type ConfigDto = {
  campaignName: string;
  campaignCode: string;
  templateSMSCodes: string[];
  steps: number[];
  authMethod: string;
  ocrApi: string;
  partner: {
    id: number;
    shortName: string;
    code: string;
    logo: string;
    phoneNumber: string;
    email: string;
    note: string;
    fullName: string;
    address: string;
    status: string;
  };
  campaignMonitor: {
    monitorWelcome: string;
    monitorNotifiesAgentBusy: string;
    monitorDisconnect: string;
    monitorKycResult: string;
    avatarAgent: string;
    background: string;
    baseColor: string;
  };
  redirectUrl: string;
  callBackground: string;
  agentBackground: string;
  camMode: string;
};
