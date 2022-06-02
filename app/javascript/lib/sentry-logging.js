/**
 * @fileoverview Functions for logging JS errors to Sentry
 *
 */
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import getSCPContext from '~/providers/SCPContextProvider'

let env = getSCPContext().environments

/** Set log environment, e.g. for testing */
export function setEnv(logEnv) {
  env = logEnv
}

/**
 * Log an exception to Sentry for bad response JS fetch executions
 * e.g. requests that result in a 404 response
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 */
export function logJSFetchExceptionToSentry(response, titleInfo = '', useThrottle = false) {
  // add details from the response to the 'response info' object that will be logged in Sentry
  Sentry.setContext('response info', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  })

  if (shouldLog(response, useThrottle)) {
    Sentry.captureException(new Error(`${response.status}: ${titleInfo}`))
  }
}

/**
 * Log an exception to Sentry for failed JS fetch executions
 * i.e. fetches that fail and error
 *
 * @param {Object} response - the response object from a failed JS fetch call
 * @param {String} titleInfo - extra info for the title of the Sentry event
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 */
export function logJSFetchErrorToSentry(error, titleInfo = '', useThrottle = false) {
  if (shouldLog(error, useThrottle)) {
    Sentry.captureException(new Error(`${error}: ${titleInfo}`))
  }
}

/**
 * Determine if logging should occur based on environment
 * @param {Object} event - response or error object
 * @param {Boolean} useThrottle - whether to apply clientside rate limit throttling
 * @param {Number} sampleRate - Number in range [0, 1] for % of events to log.
 *  1 = log all events, 0 = log no events, default = 0.1 (i.e. log 10% of events)
 */
export function shouldLog(event, useThrottle = false, sampleRate = 0.1) {
  // Do not log for development or test environments
  // to test locally, set `isLoggedEnv = true`
  const isSuppressedEnv = ['development', 'test'].includes(env)

  const isThrottled = useThrottle && Math.random() >= sampleRate

  if (isSuppressedEnv || isThrottled) {
    console.error('Suppressing error reporting to Sentry:')
    console.error(event)
    return false
  }

  return true
}

/**
 *  Initialize Sentry to enable logging JS errors to Sentry
 */
export function setupSentry() {
  Sentry.init({
    dsn: 'https://a713dcf8bbce4a26aa1fe3bf19008d26@o54426.ingest.sentry.io/1424198',
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0
  })

  // set the logger tag to reflect that the errors are from the frontend
  Sentry.setTag('logger', 'app-frontend')

  // set the scope for Sentry to the current environment
  Sentry.configureScope(scope =>
    scope.addEventProcessor(
      event =>
        new Promise(resolve =>
          resolve({
            ...event,
            environment: getSCPContext().environment
          })
        )
    )
  )
}
