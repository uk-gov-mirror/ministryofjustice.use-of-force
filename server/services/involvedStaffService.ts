import moment from 'moment'
import logger from '../../log'
import { ReportStatus } from '../config/types'
import type { IncidentClient, StatementsClient } from '../data'
import type { InTransaction } from '../data/dataAccess/db'
import type UserService from './userService'
import { InvolvedStaff } from '../data/incidentClientTypes'

export enum AddStaffResult {
  SUCCESS = 'success',
  SUCCESS_UNVERIFIED = 'unverified',
  MISSING = 'missing',
  ALREADY_EXISTS = 'already-exists',
}

export class InvolvedStaffService {
  constructor(
    private readonly incidentClient: IncidentClient,
    private readonly statementsClient: StatementsClient,
    private readonly userService: UserService,
    private readonly inTransaction: InTransaction
  ) {}

  public getInvolvedStaff(reportId: number): Promise<InvolvedStaff[]> {
    return this.incidentClient.getInvolvedStaff(reportId)
  }

  public async getInvolvedStaffRemovalRequestedReason(statementId: number): Promise<string> {
    const reason = await this.statementsClient.getRemovalRequestedReasonByStatementId(statementId)
    return reason.removalRequestedReason
  }

  public async loadInvolvedStaff(reportId: number, statementId: number): Promise<InvolvedStaff> {
    const involvedStaff = await this.incidentClient.getInvolvedStaff(reportId)
    const found = involvedStaff.find(staff => staff.statementId === statementId)
    if (!found) {
      throw new Error(`Staff with id: ${statementId}, does not exist on report: '${reportId}'`)
    }
    return found
  }

  public async loadInvolvedStaffByUsername(reportId: number, username: string): Promise<InvolvedStaff> {
    const involvedStaff = await this.incidentClient.getInvolvedStaff(reportId)
    const found = involvedStaff.find(staff => staff.userId === username)
    if (!found) {
      throw new Error(`Staff with username: ${username}, does not exist on report: '${reportId}'`)
    }
    return found
  }

  public async addInvolvedStaff(token: string, reportId: number, username: string): Promise<AddStaffResult> {
    logger.info(`Adding involved staff with username: ${username} to report: '${reportId}'`)

    const [foundUser] = await this.userService.getUsers(token, [username])

    if (!foundUser) {
      return AddStaffResult.MISSING
    }

    logger.info(`found staff: '${foundUser}'`)

    const report = await this.incidentClient.getReportForReviewer(reportId)
    if (!report) {
      throw new Error(`Report: '${reportId}' does not exist`)
    }

    if (await this.statementsClient.isStatementPresentForUser(reportId, username)) {
      return AddStaffResult.ALREADY_EXISTS
    }

    return this.inTransaction(async client => {
      await this.statementsClient.createStatements(
        reportId,
        null,
        moment(report.submittedDate).add(3, 'day').toDate(),
        [foundUser],
        client
      )

      if (report.status === ReportStatus.COMPLETE.value) {
        logger.info(`There are now pending statements on : ${reportId}, moving from 'COMPLETE' to 'SUBMITTED'`)
        await this.incidentClient.changeStatus(reportId, ReportStatus.COMPLETE, ReportStatus.SUBMITTED, client)
      }
      return foundUser.verified ? AddStaffResult.SUCCESS : AddStaffResult.SUCCESS_UNVERIFIED
    })
  }

  public async removeInvolvedStaff(reportId: number, statementId: number): Promise<void> {
    logger.info(`Removing statement: ${statementId} from report: ${reportId}`)

    await this.inTransaction(async client => {
      const pendingStatementBeforeDeletion = await this.statementsClient.getNumberOfPendingStatements(reportId, client)

      await this.statementsClient.deleteStatement({
        statementId,
        query: client,
      })

      if (pendingStatementBeforeDeletion !== 0) {
        const pendingStatementCount = await this.statementsClient.getNumberOfPendingStatements(reportId, client)

        if (pendingStatementCount === 0) {
          logger.info(`All statements complete on : ${reportId}, marking as complete`)
          await this.incidentClient.changeStatus(reportId, ReportStatus.SUBMITTED, ReportStatus.COMPLETE, client)
        }
      }
    })
  }
}
