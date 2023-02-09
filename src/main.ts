import {getInput, setFailed, setOutput} from '@actions/core'
import {graphqlPayloadFor} from './graphql'
import {Logger} from './log'
import {Method} from 'axios'
import {request} from './http'

const isEmpty = (o: Object): boolean => Object.keys(o).length === 0
const isDefined = (input: string): boolean => input !== '{}' && input.length > 0
const isCustomURL = (url: string): Boolean => url !== 'https://api.github.com'

export async function run(): Promise<void> {
  try {
    const verbose: boolean = getInput('verbose') === 'true'
    const log = new Logger(verbose)

    let url: string = getInput('url')
    let method: string = getInput('method')
    const rawInputHeaders: string = getInput('headers')
    let data: string = getInput('data')

    const graphql: string = getInput('graphql')
    const variables: string = getInput('variables')
    const operationName: string = getInput('operation_name')
    const failFast: boolean = getInput('fail_fast') === 'true'

    if (!method) {
      method = 'GET'
    }

    let inputHeaders: Object
    if (isDefined(rawInputHeaders)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      inputHeaders = JSON.parse(rawInputHeaders)
    } else {
      inputHeaders = {}
    }

    if (isDefined(graphql)) {
      if (!isCustomURL(url)) {
        url = 'https://api.github.com/graphql'
      }

      method = 'POST'

      data = graphqlPayloadFor(graphql, variables, operationName)

      if (isEmpty(inputHeaders)) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        inputHeaders = {'Content-Type': 'application/json'}
      }

      log.info('graphql', graphql)
      log.info('variables', variables)
      if (isDefined(operationName)) {
        log.info('operation_name', operationName)
      }
    }

    log.info('url', url)
    log.info('method', method)
    log.info('headers', JSON.stringify(inputHeaders))
    if (isDefined(data)) {
      log.info('data', data)
    }
    log.info('fail_fast', String(failFast))

    const [status, rawResponseHeaders, rawResponse] = await request(
      url,
      <Method>method,
      data,
      inputHeaders
    )

    const responseHeaders = JSON.stringify(rawResponseHeaders)
    const response = JSON.stringify(rawResponse)

    if (status < 200 || status >= 300) {
      log.error('response status', status)
      log.error('response headers', responseHeaders)
      log.error('response body', response)

      if (failFast) {
        throw new Error(`request failed: ${response}`)
      }
    } else {
      log.info('response status', status)
      log.info('response headers', responseHeaders)
      log.info('response body', response)
    }

    setOutput('status', `${status}`)
    setOutput('headers', `${responseHeaders}`)
    setOutput('response', `${response}`)
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    } else {
      setFailed(`Unexpected error: ${JSON.stringify(error)}`)
    }
  }
}
