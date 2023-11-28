import { Inject, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { authenticator } from 'otplib'
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm'
import { v4 } from 'uuid'
import { LoginEntity } from '../entities'
import { ErrorCode } from '../helpers/ErrorCode'
import { AuthenticationModule } from '../module/AuthenticationModule'
import { CreateLogins, UpdateLogins } from '../types/LoginTypes'
import { LoginLogService } from './LoginLogService'

@Injectable()
export class LoginService {
  private repository: Repository<LoginEntity>

  constructor(@Inject(LoginLogService) private readonly loginLogService: LoginLogService) {
    this.repository = AuthenticationModule.connection.getRepository(LoginEntity)
  }

  async create(data: CreateLogins): Promise<[Array<LoginEntity>, ErrorCode | undefined]> {
    const logins = data.map((it) => it.login)
    const loginInDatabase = await this.repository.find({ where: { login: In(logins) } })
    if (loginInDatabase.length > 0) return [null, ErrorCode.LOGIN_ALREADY_USED]

    const loginEntities = this.repository.create(data)
    const saveEntities = await this.repository.save(loginEntities)
    return [saveEntities, null]
  }

  async update(data: UpdateLogins): Promise<[Array<LoginEntity>, ErrorCode | undefined]> {
    const loginIds = data.map((it) => it.id)
    const loginsToUpdate = await this.repository.find({ where: { id: In(loginIds) } })

    if (loginsToUpdate.length !== data.length) return [null, ErrorCode.LOGIN_NOT_FOUND]

    const loginsToUpdateNewData = loginsToUpdate.map((it) => {
      const newData = data.find((data) => data.id === it.id)
      return Object.assign(it, newData)
    })

    const saveEntities = await this.repository.save(loginsToUpdateNewData)
    return [saveEntities, null]
  }

  async remove(loginIds: Array<string>): Promise<[Array<LoginEntity>, ErrorCode | undefined]> {
    const logins = await this.repository.find({ where: { id: In(loginIds) } })
    if (logins.length !== loginIds.length) return [null, ErrorCode.LOGIN_NOT_FOUND]

    const removeEntities = await this.repository.remove(logins)
    return [removeEntities, null]
  }

  async definedPassword(loginId: string, password: string) {
    const loginEntity = await this.repository.findOne({ where: { id: loginId } })
    if (!loginEntity) throw new Error('Login entity not found')

    loginEntity.password = bcrypt.hashSync(password, 10)
    loginEntity.passwordToken = v4()
    loginEntity.validationToken = v4()

    await this.repository.save(loginEntity)
  }

  async changePassword(loginId: string, password: string, options: { agent: string; ipAddress: string }) {
    const loginEntity = await this.repository.findOne({ where: { id: loginId } })
    if (!loginEntity) throw new Error('Login entity not found')

    loginEntity.password = bcrypt.hashSync(password, 10)
    loginEntity.passwordToken = v4()
    loginEntity.validationToken = v4()

    await this.repository.save(loginEntity)
    this.loginLogService.create({
      eventCode: 'RECOVERY_CHANGE',
      eventMessage: 'Recovery process finalized',
      loginId: loginEntity.id,
      ...options,
    })
  }

  async updateOTP(loginId: string) {
    const login = await this.repository.findOne({ where: { id: loginId } })
    if (!login) throw new Error('Login not found')

    login.otpToken = authenticator.generateSecret()
    await this.repository.save(login)
    return authenticator.keyuri(login.email, AuthenticationModule.config.appName, login.otpToken)
  }

  async invalidateToken(loginId: string) {
    const loginEntity = await this.repository.findOne({ where: { id: loginId } })
    if (!loginEntity) throw new Error('Login entity not found')

    loginEntity.validationToken = v4()
    await this.repository.save(loginEntity)
  }

  async findOne(options: FindOneOptions<LoginEntity>) {
    return this.repository.findOne(options)
  }

  async find(options: FindManyOptions<LoginEntity>) {
    return this.repository.find(options)
  }
}
