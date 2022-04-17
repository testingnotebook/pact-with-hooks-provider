require('dotenv').config()
const { Verifier } = require('@pact-foundation/pact')
const controller = require('./product.controller')
const Product = require('./product')

// Setup provider server to verify
const app = require('express')()
const authMiddleware = require('../middleware/auth.middleware')
app.use(authMiddleware)
app.use(require('./product.routes'))
const server = app.listen('8080')

describe('Pact Verification', () => {
  it('validates the expectations of ProductService', () => {
    const baseOpts = {
      logLevel: 'INFO',
      providerBaseUrl: 'http://localhost:8080',
      providerVersion: '1',
      providerVersionTags: 'main',
      verbose: process.env.VERBOSE === 'true',
    }

    // For builds triggered by a 'contract content changed' webhook,
    // just verify the changed pact. The URL will bave been passed in
    // from the webhook to the CI job.
    const pactChangedOpts = {
      pactUrls: [process.env.PACT_URL],
    }

    // For 'normal' provider builds, fetch `master` and `prod` pacts for this provider
    const fetchPactsDynamicallyOpts = {
      provider: 'pactflow-example-provider',
      consumerVersionSelectors: [
        { tag: 'test', latest: true },
        { deployed: true, version: 1 },
      ],
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      enablePending: false,
      includeWipPactsSince: undefined,
    }

    const stateHandlers = {
      'a product with ID 10 exists': () => {
        controller.repository.products = new Map([
          ['10', new Product('10', 'CREDIT_CARD', '28 Degrees', 'v1')],
        ])
      },
    }

    const requestFilter = (req, res, next) => {
      if (!req.headers['authorization']) {
        next()
        return
      }
      req.headers['authorization'] = `Bearer ${new Date().toISOString()}`
      next()
    }

    const opts = {
      ...baseOpts,
      ...(process.env.PACT_URL ? pactChangedOpts : fetchPactsDynamicallyOpts),
      stateHandlers: stateHandlers,
      requestFilter: requestFilter,
      publishVerificationResult: true,
    }

    return new Verifier(opts)
      .verifyProvider()
      .then((output) => {
        console.log('Pact Verification Complete!')
        console.log(output)
      })
      .finally(() => {
        server.close()
      })
  })
})
