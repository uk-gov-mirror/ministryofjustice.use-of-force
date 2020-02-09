const request = require('supertest')
const { appWithAllRoutes, user, reviewerUser, coordinatorUser } = require('./testutils/appSetup')

const userSupplier = jest.fn()

const involvedStaffService = {
  addInvolvedStaff: jest.fn(),
}
const reportService = {
  deleteReport: jest.fn(),
}
const offenderService = {
  getOffenderDetails: jest.fn(),
}
const reviewService = {
  getReport: jest.fn(),
}

let app

describe('coordinator', () => {
  beforeEach(() => {
    app = appWithAllRoutes(
      {
        involvedStaffService,
        reportService,
        offenderService,
        reviewService,
      },
      userSupplier
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('add involved staff', () => {
    it('should resolve for coordinator', async () => {
      userSupplier.mockReturnValue(coordinatorUser)

      await request(app)
        .get('/report/1/involved-staff/sally')
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(res => {
          expect(res.body).toEqual({ result: 'ok' })
        })

      expect(involvedStaffService.addInvolvedStaff).toBeCalledWith('user1-token', '1', 'sally')
    })

    it('should not resolve for reviewer', async () => {
      userSupplier.mockReturnValue(reviewerUser)

      await request(app)
        .get('/report/1/involved-staff/sally')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })

    it('should not resolve for user', async () => {
      userSupplier.mockReturnValue(user)

      await request(app)
        .get('/report/1/involved-staff/sally')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })
  })

  describe('Confirm delete', () => {
    it('should resolve for reviewer', async () => {
      userSupplier.mockReturnValue(coordinatorUser)
      offenderService.getOffenderDetails.mockReturnValue({})
      reviewService.getReport.mockReturnValue({})

      await request(app)
        .get('/coordinator/report/1/confirm-delete')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(res => {
          expect(res.text).toContain('Are you sure you want to delete this report?')
        })
    })

    it('should not resolve for reviewer', async () => {
      userSupplier.mockReturnValue(reviewerUser)

      await request(app)
        .get('/coordinator/report/1/confirm-delete')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })

    it('should not resolve for user', async () => {
      userSupplier.mockReturnValue(user)

      await request(app)
        .get('/coordinator/report/1/confirm-delete')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })
  })

  describe('Delete user', () => {
    it('not confirming deletion triggers validation', async () => {
      userSupplier.mockReturnValue(coordinatorUser)

      await request(app)
        .post('/coordinator/report/123/delete')
        .expect(302)
        .expect('Location', '/coordinator/report/123/confirm-delete')
        .expect(() => {
          expect(reportService.deleteReport).not.toHaveBeenCalled()
        })
    })

    it('when confirming to delete', async () => {
      userSupplier.mockReturnValue(coordinatorUser)

      await request(app)
        .post('/coordinator/report/123/delete')
        .send({ confirm: 'yes' })
        .expect(302)
        .expect('Location', '/')
        .expect(() => {
          expect(reportService.deleteReport).toHaveBeenCalledWith('user1', '123')
        })
    })

    it('when confirming not to delete', async () => {
      userSupplier.mockReturnValue(coordinatorUser)

      await request(app)
        .post('/coordinator/report/123/delete')
        .send({ confirm: 'no' })
        .expect(302)
        .expect('Location', '/')
        .expect(() => {
          expect(reportService.deleteReport).not.toHaveBeenCalled()
        })
    })

    it('should not resolve for reviewer', async () => {
      userSupplier.mockReturnValue(reviewerUser)

      await request(app)
        .post('/coordinator/report/123/delete')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })

    it('should not resolve for user', async () => {
      userSupplier.mockReturnValue(user)

      await request(app)
        .post('/coordinator/report/123/delete')
        .expect(401)
        .expect(res => {
          expect(res.text).toContain('Not authorised to access this resource')
        })

      expect(involvedStaffService.addInvolvedStaff).not.toBeCalled()
    })
  })
})
