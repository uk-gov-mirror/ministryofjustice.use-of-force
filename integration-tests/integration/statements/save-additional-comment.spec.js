const SubmittedStatementPage = require('../../pages/submitStatementPage')

const ViewStatementPage = require('../../pages/viewStatementPage')
const IncidentsPage = require('../../pages/incidentsPage')
const ViewAddCommentPage = require('../../pages/addAdditionalCommentPage')
const { ReportStatus } = require('../../../server/config/types')

context('Add comments to statement', () => {
  const bookingId = 1001
  beforeEach(() => {
    cy.task('reset')
    cy.task('stubLogin')
    cy.task('seedReport', {
      status: ReportStatus.SUBMITTED,
      involvedStaff: [
        {
          userId: 'Test User',
          name: 'Test User name',
          email: 'Test User@gov.uk',
        },
      ],
    })
    cy.task('stubOffenderDetails', bookingId)
    cy.task('stubLocations', 'MDI')
    cy.task('stubOffenders')
    cy.task('stubLocation', '357591')
  })

  it('A user can select a specific statement, add to it and then return back to statements page', () => {
    cy.login(bookingId)

    let incidentsPage = IncidentsPage.goTo()

    incidentsPage
      .getTodoRow(0)
      .startButton()
      .click()

    const submitStatementPage = SubmittedStatementPage.verifyOnPage()
    submitStatementPage.lastTrainingMonth().select('March')
    submitStatementPage.lastTrainingYear().type('2010')
    submitStatementPage.jobStartYear().type('1999')
    submitStatementPage.statement().type('This is my statement')

    const confirmStatementPage = submitStatementPage.submit()
    const statementSubmittedPage = confirmStatementPage.submit()
    incidentsPage = statementSubmittedPage.finish()
    incidentsPage
      .getCompleteRow(0)
      .viewButton()
      .click()

    let viewStatementPage = ViewStatementPage.verifyOnPage()
    viewStatementPage.addComment().click()

    let viewAddCommentPage = ViewAddCommentPage.verifyOnPage()
    viewAddCommentPage.additionalComment().should('be.empty')
    viewAddCommentPage.additionalComment().type('Some new comment 1')
    viewAddCommentPage.save().click()

    incidentsPage = IncidentsPage.verifyOnPage()
    incidentsPage
      .getCompleteRow(0)
      .viewButton()
      .click()

    viewStatementPage = ViewStatementPage.verifyOnPage()
    viewStatementPage.addComment().click()

    viewAddCommentPage = ViewAddCommentPage.verifyOnPage()
    viewAddCommentPage.viewAdditionalComment(1).should('contain', 'Some new comment 1')
    viewAddCommentPage.additionalComment().should('be.empty')
    viewAddCommentPage.additionalComment(2).type('Some new comment 2')
    viewAddCommentPage.save().click()

    incidentsPage = IncidentsPage.verifyOnPage()
    incidentsPage
      .getCompleteRow(0)
      .viewButton()
      .click()

    viewStatementPage = ViewStatementPage.verifyOnPage()
    viewStatementPage.viewAdditionalComment(1).should('contain', 'Some new comment 1')
    viewStatementPage.viewAdditionalComment(2).should('contain', 'Some new comment 2')
    viewStatementPage.continue().click()

    IncidentsPage.verifyOnPage()
  })
})
