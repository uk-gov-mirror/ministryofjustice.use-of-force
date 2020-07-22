/* eslint-disable no-useless-constructor */
import format from 'pg-format'
import type { QueryPerformer } from './dataAccess/db'
import { StatementStatus } from '../config/types'

export default class StatementsClient {
  constructor(private readonly query: QueryPerformer) {}

  async getStatements(userId: string): Promise<StatementSummary[]> {
    const result = await this.query<StatementSummary>({
      text: `select r.id
            , r.reporter_name          "reporterName"
            , r.offender_no            "offenderNo"
            , r.incident_date          "incidentDate"
            , s."name"
            , s.in_progress            "inProgress"
            , s.overdue_date <= now()  "isOverdue"
            , s.statement_status       "status"
            from statement s 
            inner join report r on s.report_id = r.id   
          where s.user_id = $1
          and s.deleted is null
          order by status, r.incident_date desc`,
      values: [userId],
    })
    return result.rows
  }

  async getStatementForUser(userId, reportId, status) {
    const results = await this.query({
      text: `select s.id
    ,      r.booking_id             "bookingId"
    ,      r.incident_date          "incidentDate"
    ,      s.last_training_month    "lastTrainingMonth"
    ,      s.last_training_year     "lastTrainingYear"
    ,      s.job_start_year         "jobStartYear"
    ,      s.statement
    ,      s.submitted_date         "submittedDate"
    from report r
    left join statement s on r.id = s.report_id
    where r.id = $1
      and r.deleted is null
      and s.user_id = $2
      and s.statement_status = $3
      and s.deleted is null`,
      values: [reportId, userId, status.value],
    })
    return results.rows[0]
  }

  async getStatementForReviewer(statementId) {
    const results = await this.query({
      text: `select s.id
    ,      r.id                     "reportId"
    ,      s.name
    ,      r.booking_id             "bookingId"
    ,      r.incident_date          "incidentDate"
    ,      s.last_training_month    "lastTrainingMonth"
    ,      s.last_training_year     "lastTrainingYear"
    ,      s.job_start_year         "jobStartYear"
    ,      s.statement
    ,      s.submitted_date         "submittedDate"
    from report r
    left join statement s on r.id = s.report_id
    where s.id = $1
    and s.deleted is null`,
      values: [statementId],
    })
    return results.rows[0]
  }

  async getStatementsForReviewer(reportId) {
    const results = await this.query({
      text: `select id
            ,      name
            ,      user_id                  "userId"
            ,      overdue_date <= now()    "isOverdue"
            ,      statement_status = $1    "isSubmitted"
            from v_statement where report_id = $2
            order by name`,
      values: [StatementStatus.SUBMITTED.value, reportId],
    })
    return results.rows
  }

  async getAdditionalComments(statementId) {
    const results = await this.query({
      text: `select  
    s.additional_comment "additionalComment",
    s.date_submitted     "dateSubmitted" 
    from v_statement_amendments s
    where s.statement_id = $1`,
      values: [statementId],
    })
    return results.rows
  }

  saveAdditionalComment(statementId, additionalComment, query = this.query) {
    return query({
      text: `insert into v_statement_amendments (statement_id, additional_comment)
            values ($1, $2)`,
      values: [statementId, additionalComment],
    })
  }

  saveStatement(
    userId,
    reportId,
    { lastTrainingMonth, lastTrainingYear, jobStartYear, statement },
    query = this.query
  ) {
    return query({
      text: `update v_statement 
    set last_training_month = $1
    ,   last_training_year = $2
    ,   job_start_year = $3
    ,   statement = $4
    ,   updated_date = CURRENT_TIMESTAMP
    ,   in_progress = true
    where user_id = $5
    and report_id = $6
    and statement_status = $7`,
      values: [
        lastTrainingMonth,
        lastTrainingYear,
        jobStartYear,
        statement,
        userId,
        reportId,
        StatementStatus.PENDING.value,
      ],
    })
  }

  submitStatement(userId, reportId, query: QueryPerformer = this.query) {
    return query({
      text: `update v_statement 
    set submitted_date = CURRENT_TIMESTAMP
    ,   statement_status = $1
    ,   updated_date = CURRENT_TIMESTAMP
    where user_id = $2
    and report_id = $3
    and statement_status = $4`,
      values: [StatementStatus.SUBMITTED.value, userId, reportId, StatementStatus.PENDING.value],
    })
  }

  setEmail = (userId, reportId, emailAddress, query: QueryPerformer = this.query) => {
    return query({
      text: `update v_statement 
    set email = $3
    ,   updated_date = CURRENT_TIMESTAMP
    where user_id = $1
    and report_id = $2`,
      values: [userId, reportId, emailAddress],
    })
  }

  async getNumberOfPendingStatements(reportId, query: QueryPerformer = this.query) {
    const { rows } = await query({
      text: `select count(*) from v_statement where report_id = $1 AND statement_status = $2`,
      values: [reportId, StatementStatus.PENDING.value],
    })
    return parseInt(rows[0].count, 10)
  }

  async createStatements({ reportId, firstReminder, overdueDate, staff, query = this.query }) {
    const rows = staff.map(s => [
      reportId,
      s.staffId,
      s.userId,
      s.name,
      s.email,
      firstReminder,
      overdueDate,
      StatementStatus.PENDING.value,
    ])
    const results = await query({
      text: format(
        'insert into v_statement (report_id, staff_id, user_id, name, email, next_reminder_date, overdue_date, statement_status) VALUES %L returning id, user_id "userId"',
        rows
      ),
    })
    return results.rows.reduce((result, staffMember) => ({ ...result, [staffMember.userId]: staffMember.id }), {})
  }

  async deleteStatement({ statementId, query, now = new Date() }) {
    await query({
      text: `update statement set deleted = $1 where id = $2`,
      values: [now, statementId],
    })
    await query({
      text: `update statement_amendments set deleted = $1 where statement_id = $2`,
      values: [now, statementId],
    })
  }

  async isStatementPresentForUser(reportId, username, query: QueryPerformer = this.query) {
    const { rows } = await query({
      text: `select count(*) from v_statement where report_id = $1 and user_id = $2`,
      values: [reportId, username],
    })
    return parseInt(rows[0].count, 10) > 0
  }
}
