import { JWTPayloadDTO } from '../dtos/JWTPayloadDTO'
import { JWTTemporaryPayloadDTO } from '../dtos/JWTTemporaryPayloadDTO'

export type CreateLogin = {
  id?: string
  login: string
  password?: string
  isActive: boolean
  roles?: Array<string>
  email: string
  fullName: string
}

export type CreateLogins = Array<CreateLogin>

export type UpdateLogin = {
  id: string
  login?: string
  isActive?: boolean
  roles?: Array<string>
  email?: string
  fullName?: string
}

export type UpdateLogins = Array<UpdateLogin>

export type GenerateJwtWithPinOptions = {
  pinLength?: number
  expiresIn?: string
}

export type RequestAuthorization<T extends string = string> = {
  processedPayloadDTO: JWTPayloadDTO
  processedTemporaryPayloadDTO: JWTTemporaryPayloadDTO
  headers: {
    'x-temporary-authorization'?: string
    'x-email-pin'?: string
    'x-otp-pin'?: string
    'x-user-type'?: T
  }
  userType?: T
}

export const enum RequiredPin {
  NONE = 'NONE',
  ONLY_EMAIL = 'EMAIL',
  ONLY_OTP = 'OTP',
  ANY = 'ANY',
}

export const enum EventCode {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}
