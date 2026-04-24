import { httpsCallable } from 'firebase/functions'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { functions } from '@/firebase'

const createPasskeyRegistrationOptions = httpsCallable(functions, 'createPasskeyRegistrationOptions')
const verifyPasskeyRegistration = httpsCallable(functions, 'verifyPasskeyRegistration')
const createPasskeyAuthenticationOptions = httpsCallable(functions, 'createPasskeyAuthenticationOptions')
const verifyPasskeyAuthentication = httpsCallable(functions, 'verifyPasskeyAuthentication')
const deferPasskeyEnrollmentCallable = httpsCallable(functions, 'deferPasskeyEnrollment')
const createPasskeyDeviceRequestCallable = httpsCallable(functions, 'createPasskeyDeviceRequest')
const reviewPasskeyDeviceRequestCallable = httpsCallable(functions, 'reviewPasskeyDeviceRequest')

function getOrigin() {
  return window.location.origin
}

export function browserSupportsPasskey() {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window
}

export async function beginPasskeyRegistration(deviceLabel, deviceRequestId = null) {
  const optionsResult = await createPasskeyRegistrationOptions({
    origin: getOrigin(),
    deviceRequestId,
  })
  const registrationResponse = await startRegistration({
    optionsJSON: optionsResult.data,
  })

  const verifyResult = await verifyPasskeyRegistration({
    origin: getOrigin(),
    deviceLabel,
    response: registrationResponse,
  })

  return verifyResult.data
}

export async function createPasskeyDeviceRequest(deviceLabel, deviceType) {
  const result = await createPasskeyDeviceRequestCallable({ deviceLabel, deviceType })
  return result.data
}

export async function reviewPasskeyDeviceRequest(uid, requestId, action) {
  const result = await reviewPasskeyDeviceRequestCallable({ uid, requestId, action })
  return result.data
}

export async function beginPasskeyAuthentication() {
  const optionsResult = await createPasskeyAuthenticationOptions({
    origin: getOrigin(),
  })
  const authenticationResponse = await startAuthentication({
    optionsJSON: optionsResult.data,
  })

  const verifyResult = await verifyPasskeyAuthentication({
    origin: getOrigin(),
    response: authenticationResponse,
  })

  return verifyResult.data
}

export async function deferPasskeyEnrollment(days = 14) {
  await deferPasskeyEnrollmentCallable({ days })
}

export function getPasskeyErrorMessage(error) {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  if (message.includes('not supported') || message.includes('PublicKeyCredential')) {
    return '此裝置或瀏覽器暫不支援 Passkey，請改用較新的 Safari、Chrome 或 Edge。'
  }
  if (message.includes('timed out') || message.includes('The operation either timed out')) {
    return '驗證逾時，請重新再試一次。'
  }
  if (
    message.includes('NotAllowedError') ||
    message.includes('The user aborted a request') ||
    code.includes('cancelled')
  ) {
    return '你已取消 Passkey 驗證。'
  }
  if (message.includes('already registered')) {
    return '這個裝置可能已綁定過 Passkey，可直接使用驗證流程登入。'
  }
  if (message.includes('尚未核准') || message.includes('已核准的裝置申請')) {
    return '這台新裝置尚未核准，請先送出申請並等待 owner 處理。'
  }
  return message || 'Passkey 流程失敗，請稍後再試。'
}
