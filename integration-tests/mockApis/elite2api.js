const { stubFor } = require('./wiremock')

module.exports = {
  stubOffenderDetails: bookingId => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: `/api/bookings/${bookingId}\\?basicInfo=false`,
      },
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        jsonBody: {
          offenderNo: 'A1234AC',
          firstName: 'NORMAN',
          lastName: 'SMITH',
          agencyId: 'MDI',
          dateOfBirth: '2000-12-26',
        },
      },
    })
  },
  stubLocations: agencyId => {
    return stubFor({
      request: {
        method: 'GET',
        urlPattern: `/api/agencies/${agencyId}/locations`,
      },
      response: {
        status: 200,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        jsonBody: [
          {
            locationId: 27233,
            locationType: 'SPOR',
            description: 'GYM-5-A-SIDE COM',
            agencyId: 'MDI',
            parentLocationId: 27205,
            currentOccupancy: 0,
            locationPrefix: 'MDI-GYM-5-A-SIDE COM',
            userDescription: '5-a-side Com',
          },
          {
            locationId: 27187,
            locationType: 'ADJU',
            description: 'RES-MCASU-MCASU',
            agencyId: 'MDI',
            parentLocationId: 27186,
            currentOccupancy: 0,
            locationPrefix: 'MDI-RES-MCASU-MCASU',
            userDescription: 'Adj',
          },
          {
            locationId: 357591,
            locationType: 'ASSO',
            description: 'RES-HB6-HB6ASSO A',
            agencyId: 'MDI',
            parentLocationId: 357590,
            currentOccupancy: 0,
            locationPrefix: 'MDI-RES-HB6-HB6ASSO A',
            userDescription: 'Asso A Wing',
          },
          {
            locationId: 357592,
            locationType: 'ASSO',
            description: 'RES-HB6-HB6ASSO B',
            agencyId: 'MDI',
            parentLocationId: 357590,
            currentOccupancy: 0,
            locationPrefix: 'MDI-RES-HB6-HB6ASSO B',
            userDescription: 'Asso B Wing',
          },
        ],
      },
    })
  },
}
