import { AgencyId } from '../types/uof'
import logger from '../../log'
import { RestClientBuilder, PrisonClient } from '../data'
import { Prison, PrisonLocation } from '../data/prisonClientTypes'

export default class LocationService {
  constructor(private readonly prisonClientBuilder: RestClientBuilder<PrisonClient>) {}

  async getPrisons(token: string): Promise<Prison[]> {
    const prisonClient = this.prisonClientBuilder(token)
    const prisons = await prisonClient.getPrisons()
    return prisons.sort((a, b) => a.description.localeCompare(b.description, 'en', { ignorePunctuation: true }))
  }

  async getPrisonById(token: string, agencyId: AgencyId): Promise<Prison> {
    const prisonClient = this.prisonClientBuilder(token)
    return prisonClient.getPrisonById(agencyId)
  }

  async getLocation(token: string, locationId: number): Promise<PrisonLocation | Record<string, unknown>> {
    if (!locationId) {
      return Promise.resolve({})
    }
    const prisonClient = this.prisonClientBuilder(token)
    return prisonClient.getLocation(locationId)
  }

  async getIncidentLocations(token: string, agencyId: AgencyId): Promise<PrisonLocation[]> {
    try {
      const prisonClient = this.prisonClientBuilder(token)
      const incidentLocations = await prisonClient.getLocations(agencyId)
      const formattedIncidentLocations = incidentLocations.map(location => ({
        ...location,
        userDescription: location.userDescription ? location.userDescription : location.locationPrefix,
      }))

      const prisonersCell = formattedIncidentLocations.find(
        location => location.userDescription.toUpperCase() === "PRISONER'S CELL"
      )
      const otherCell = formattedIncidentLocations.find(
        location => location.userDescription.toUpperCase() === 'OTHER CELL'
      )

      const remainingLocations = formattedIncidentLocations
        .filter(
          location =>
            location.userDescription.toUpperCase() !== 'OTHER CELL' &&
            location.userDescription.toUpperCase() !== "PRISONER'S CELL"
        )
        .sort((a, b) => a.userDescription.localeCompare(b.userDescription, 'en', { ignorePunctuation: true }))

      return [...(prisonersCell ? [prisonersCell] : []), ...(otherCell ? [otherCell] : []), ...remainingLocations]
    } catch (error) {
      logger.error(error, 'Error during getIncidentLocations')
      throw error
    }
  }
}
