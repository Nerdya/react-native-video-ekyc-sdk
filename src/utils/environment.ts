export const environment = {
  GET_CONFIG_INFO: '/vekyc/campaign/config-agent',
  CREATE_MEETING: '/vekyc/meeting/:id/init',
  SAVE_LOG: '/vekyc/contract-action-histories',
  SUBMIT: '/vekyc/submit',
  VERIFY_OTP: '/vekyc/submit/verify',
  RESEND_OTP: '/vekyc/otp/resend',
  CHECK_SELF_KYC: '/vekyc/campaign/config/cus-auth',
  HOOK: '/vekyc/hook',
  CLOSE_VIDEO: '/vekyc/close-video',
  RATING: '/vekyc/rating/:id',
  GET_CONTRACT_LIST: '/vekyc/app/contracts',
  GET_CONTRACT_URL: '/vekyc/info-ekyc/:id/url-contact',
  CONFIRM_CONTRACT: '/vekyc/meeting/:id/confirm-bypass-otp',

  SOCKET_PATH: '/websocket-agent',
}
