const request = require('supertest')
const { appSetup, user } = require('./testutils/appSetup')
const createRouter = require('./newIncident')
const { authenticationMiddleware } = require('./testutils/mockAuthentication')

const incidentService = {
  getCurrentDraftIncident: jest.fn(),
  update: jest.fn(),
  getValidationErrors: jest.fn().mockReturnValue([]),
  getUpdatedFormObject: jest.fn(),
}

const offenderService = {
  getOffenderDetails: jest.fn().mockReturnValue({ displayName: 'Bob Smith', offenderNo: '1234', locations: [] }),
}

const formRoute = createRouter({ incidentService, authenticationMiddleware, offenderService })

let app

beforeEach(() => {
  app = appSetup(formRoute)
  incidentService.getCurrentDraftIncident.mockResolvedValue({})
  incidentService.getUpdatedFormObject.mockResolvedValue({})
})

afterEach(() => {
  incidentService.getCurrentDraftIncident.mockReset()
  incidentService.getUpdatedFormObject.mockReset({})
  incidentService.update.mockReset()
})

describe('GET /section/form', () => {
  test.each`
    path                      | expectedContent
    ${'incident/newIncident'} | ${'Prisoner involved'}
  `('should render $expectedContent for $path', ({ path, expectedContent }) =>
    request(app)
      .get(`/${path}/1`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain(expectedContent)
      })
  )
})

describe('POST save and continue /section/form', () => {
  test.each`
    sectionName   | formName         | userInput                          | nextPath
    ${'incident'} | ${'newIncident'} | ${{ submit: 'save-and-continue' }} | ${'/form/incident/details/1'}
  `('should render $expectedContent for $sectionName/$formName', ({ sectionName, formName, userInput, nextPath }) =>
    request(app)
      .post(`/${sectionName}/${formName}/1`)
      .send(userInput)
      .expect(302)
      .expect('Location', nextPath)
      .expect(() => {
        expect(incidentService.update).toBeCalledTimes(1)
        expect(incidentService.update).toBeCalledWith({
          currentUser: user,
          bookingId: 1,
          formId: undefined,
          formObject: { incident: { newIncident: {} } },
        })
      })
  )
})

describe('POST save and return to tasklist', () => {
  test.each`
    sectionName   | formName         | userInput                        | nextPath
    ${'incident'} | ${'newIncident'} | ${{ submit: 'save-and-return' }} | ${'/tasklist/1'}
  `('should render $expectedContent for $sectionName/$formName', ({ sectionName, formName, userInput, nextPath }) =>
    request(app)
      .post(`/${sectionName}/${formName}/1`)
      .send(userInput)
      .expect(302)
      .expect('Location', nextPath)
      .expect(() => {
        expect(incidentService.update).toBeCalledTimes(1)
        expect(incidentService.update).toBeCalledWith({
          currentUser: user,
          bookingId: 1,
          formId: undefined,
          formObject: { incident: { newIncident: {} } },
        })
      })
  )
})
