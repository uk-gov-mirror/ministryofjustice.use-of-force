const logger = require('../../log.js')
const { StatementStatus } = require('../config/types')
const statementConfig = require('../config/forms/statementForm')
const { validate } = require('../utils/fieldValidation')

module.exports = function createStatementService({ statementsClient, incidentClient, db }) {
  const getStatements = async (userId, status) => {
    const data = await statementsClient.getStatements(userId, status)
    return data.rows
  }

  const getStatementForUser = async (userId, reportId, status) => {
    const statement = await statementsClient.getStatementForUser(userId, reportId, status)
    if (!statement) {
      throw new Error(`Report: '${reportId}' does not exist`)
    }
    const additionalComments = await statementsClient.getAdditionalComments(statement.id)
    return { additionalComments, ...statement }
  }

  const validateSavedStatement = async (username, reportId) => {
    const statement = await getStatementForUser(username, reportId, StatementStatus.PENDING)
    const validationResult = validate(statementConfig.fields, statementConfig.schemas.complete, statement, true)
    return validationResult.error ? validationResult.error.details : []
  }

  const save = (userId, reportId, statement) => {
    logger.info(`Saving statement for user: ${userId} and report: ${reportId}`)
    return statementsClient.saveStatement(userId, reportId, statement)
  }

  const submitStatement = async (userId, reportId) => {
    logger.info(`Submitting statement for user: ${userId} and report: ${reportId}`)

    await db.inTransaction(async client => {
      await statementsClient.submitStatement(userId, reportId, client)

      const pendingStatementCount = await statementsClient.getNumberOfPendingStatements(reportId, client)

      if (pendingStatementCount === 0) {
        logger.info(`All statements complete on : ${reportId}, marking as complete`)
        await incidentClient.markCompleted(reportId, client)
      }
    })
  }

  const saveAdditionalComment = (statementId, additionalComment) => {
    logger.info(`Saving additional comment for statement with id: ${statementId}`)
    return statementsClient.saveAdditionalComment(statementId, additionalComment)
  }

  return {
    getStatementForUser,
    getStatements,
    save,
    submitStatement,
    validateSavedStatement,
    saveAdditionalComment,
  }
}
