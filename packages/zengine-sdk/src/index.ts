import Client from '@zenginehq/post-rpc-client'
import Sizer from 'content-sizer'
import { PostRPCClient, ContentSizer, Dimensions } from './external.types'
import { currencies } from './data-utilities'
import { ZengineField, ZengineContextData, ZengineFilter, ZengineFiltersPanelOptions, ZengineHTTPResponse, ZenginePluginDataCallOptions, ZengineAPIRequestOptions, ZengineDropdownOptions } from './zengine.types'

const parentOrigin = (document.location.ancestorOrigins && document.location.ancestorOrigins[0]) || getReferrerOrigin() || 'https://platform.zenginehq.com'

/**
 * gets the origin from the document's referrer attribute, or returns undefined
 */
function getReferrerOrigin (): string | void {
  if (document.referrer) {
    const link = document.createElement('a')
    link.href = document.referrer

    return link.origin || (link.protocol + '//' + link.hostname)
  }
}

export const rpcClient: PostRPCClient = new Client(parentOrigin)

rpcClient.logging(false)
rpcClient.start()

window.addEventListener('beforeunload', () => {
  rpcClient.call({ method: 'reloadFrames' })
})

/**
 * Get Context Data from Zengine Admin state
 */
export function znContext (): Promise<ZengineContextData>
export function znContext (callback: (err: Error, context: ZengineContextData) => void): null

export function znContext (callback?: (err: Error, context: ZengineContextData) => void): Promise<ZengineContextData> | null {
  return rpcClient.call({ method: 'context', callback })
}

/**
 * Displays a confirmation dialog with your message and two buttons: Yes and Close
 * Sends a boolean to your promise or callback representing the user's selection
 */
export function znConfirm (message: string): Promise<boolean>
export function znConfirm (message: string, callback: (err: Error, confirmed: boolean) => void): null

export function znConfirm (message: string, callback?: (err: Error, confirmed: boolean) => void): Promise<boolean> | null {
  return rpcClient.call({ method: 'confirm', args: { message }, callback })
}

/**
 * Displays a temporary alert message at the top of the page
 */
export function znMessage (message: string, type: 'info' | 'saved' | 'warning' | 'error' = 'info', duration: number = 4000): Promise<undefined> {
  return rpcClient.call({
    method: 'message',
    args: { params: { message, type, duration } }
  })
}

/**
 * Displays a modal that allows the user to view and build a data filter.
 */
export function znFiltersPanel (options: ZengineFiltersPanelOptions): Promise<ZengineFilter>
export function znFiltersPanel (options: ZengineFiltersPanelOptions, callback: (err: Error, filter: ZengineFilter) => void): null

export function znFiltersPanel (options: ZengineFiltersPanelOptions, callback?: (err: Error, filter: ZengineFilter) => void): Promise<ZengineFilter> | null {
  return callback
    ? rpcClient.call({ method: 'filtersPanel', args: { options }, callback })
    : rpcClient.call({ method: 'filtersPanel', args: { options } })
}

/**
 * Inform the Zengine App of the plugin's current dimensions, to trigger an iframe resize if necessary and if space is available
 */
export function znResize (dimensions: Dimensions): Promise<Dimensions> {
  return rpcClient.call({ method: 'resize', args: { dimensions } })
}

async function updateHandler (dimensions: Dimensions) {
  const resized = await znResize(dimensions)
    .catch(err => err instanceof Error ? err : new Error(JSON.stringify(err)))

  if (resized instanceof Error) {
    return null
  }

  return resized
}

export const znSizer: ContentSizer = new Sizer(updateHandler)

/**
 * Automatically resizes plugin based on contents and dimensions of the plugin's page
 *
 * NB: Resizing may be naturally limited by the Zengine App
 */
export function autoSize () {
  znSizer.autoSize()
}

/**
 * Prevent further auto-resizing of the plugin
 */
export function stopAutoSizing () {
  znSizer.stopAutoSize()
}

/**
 * Make a call to the Zengine API
 */
export function znHttp (request: ZengineAPIRequestOptions): Promise<ZengineHTTPResponse>
export function znHttp (request: ZengineAPIRequestOptions, callback: (err: Error, resp: ZengineHTTPResponse) => void): null

export function znHttp (request: ZengineAPIRequestOptions, callback?: (err: Error, resp: ZengineHTTPResponse) => void): Promise<ZengineHTTPResponse> | null {
  return rpcClient.call({
    method: 'znHttp',
    args: {
      options: {
        apiVersion: '1'
      },
      request
    },
    callback
  })
}

/**
 * Make a Fetch request to ZenQL graphql servers
 * This is useful as a fetch implementation that can be passed
 * to a graphql library (like Apollo or Relay)
 */
export async function znFetch (url: string, init?: Request): Promise<Response>
export async function znFetch (init: Request): Promise<Response>

export async function znFetch (param1: string | Request, param2?: Request | { headers: { [key: string]: string }, signal: AbortSignal }): Promise<Response> {
  const fetchOptions = typeof param1 === 'string' ? param2 : param1
  const url = typeof param1 === 'string' ? param1 : param1.url

  // pull out non-postMessage-friendly properties
  const { signal, headers: givenHeaders, ...sendingMeta } = fetchOptions || {}

  // ensure headers are a postMessage-friendly key/value object
  const sendingHeaders = givenHeaders instanceof Headers
    ? {}
    : givenHeaders || {}

  if (givenHeaders instanceof Headers) {
    givenHeaders.forEach((value: string, key: string) => {
      if (sendingHeaders[key]) {
        sendingHeaders[key] = `${sendingHeaders[key]}, ${value}`
      } else {
        sendingHeaders[key] = value
      }
    })
  }

  const fetchStatus = { complete: false }

  // send over postMessage to the actual fetcher
  // use Promise.race to prevent AbortSignal Listener from impacting performance of request
  const result: {
    body: string,
    headers: { [key: string]: string },
    fetchSignalAborted?: boolean
  } = await Promise.race([
    rpcClient.call({
      method: 'znFetch',
      args: {
        options: {
          apiVersion: '1'
        },
        url,
        fetchOptions: { headers: sendingHeaders, ...sendingMeta }
      }
    }),
    listenForAbortSignalOrCompletion(signal, fetchStatus)
  ])

  // update fetchStatus to cause Abort Signal listener to exit
  fetchStatus.complete = true

  if (result.fetchSignalAborted) {
    // if aborted, throw error according to AbortController specification
    // https://developers.google.com/web/updates/2017/09/abortable-fetch#reacting_to_an_aborted_fetch
    throw new DOMException(`Aborted Request: ${url}`, 'AbortError')
  }

  const {
    body,
    headers,
    ...receivingMeta
  } = result

  // create a new Response object to get all of the methods and types
  // needed for the rest of the fetch implementation (e.g. res.json(), res.ok, etc...)
  const response = new Response(body, { ...receivingMeta, headers: new Headers(headers) })

  return response
}

function sleep (ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function listenForAbortSignalOrCompletion (signal: AbortSignal | undefined, fetchStatus: { complete: boolean }): Promise<{ fetchSignalAborted: boolean }> {
  if (fetchStatus.complete) {
    await sleep(10) // go out of our way to lose the race, knowing the fetch succeeded

    return { fetchSignalAborted: false }
  }

  if (signal?.aborted) {
    return { fetchSignalAborted: true }
  }

  await sleep(50)

  return listenForAbortSignalOrCompletion(signal, fetchStatus)
}

/**
 * Make a call to a backend service directly
 */
export function znPluginData (options: ZenginePluginDataCallOptions, callback: (err: Error, resp: ZengineHTTPResponse) => void): null
export function znPluginData (options: ZenginePluginDataCallOptions): Promise<ZengineHTTPResponse>

export function znPluginData (options: ZenginePluginDataCallOptions, callback?: (err: Error, resp: ZengineHTTPResponse) => void): Promise<ZengineHTTPResponse> | null {
  return rpcClient.call({ method: 'znPluginData', args: options, callback })
}

// export znHttp', [['options', 'Object'], ['request', 'Object']], 'Object', RPC.znHttpHandler, 'Perform Zengine API HTTP Request');

// export modal', [['options', 'Object']], 'Object', RPC.modalOpenHandler(server), 'Open a Modal');

export function znOpenDropdown (options: ZengineDropdownOptions) {
  const {
    top = 0,
    right = 0,
    bottom = 0,
    left = 0,
    width = 400,
    height = 300,
    events = {},
    side = 'bottom',
    context,
    src
  } = options

  Object.keys(events).forEach(key => {
    rpcClient.subscribe(key, events[key])
  })

  const promise = rpcClient.call({
    method: 'dropdown',
    args: {
      options: {
        ...options,
        events: Object.keys(events)
      }
    }
  })

  promise.then(() => {
    Object.keys(events).forEach(key => {
      rpcClient.unsubscribe(key)
    })
  })

  return promise
}

// export openTooltip', [['options', 'Object']], 'undefined', RPC.openTooltipHandler(iframeElement), 'Open a Tooltip');

// export closeTooltip', [], 'undefined', RPC.closeTooltipHandler, 'Open a Tooltip');

export const znLocation = {
  searchParams: (query: string, value: string | number) => rpcClient.call({
    method: 'location',
    args: {
      method: 'searchParams',
      args: [query, value]
    }
  })
}

const znNumberWithCommas = (amount: string, decimalCount: number) => {
  try {
    const decimal = '.'
    const thousands = ','
    decimalCount = Math.abs(decimalCount)
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount
    // get the integer part of the number (without decimals) as a String
    const integerPart = parseInt(Math.abs(Number(amount) || 0).toFixed(decimalCount),10).toString(10)
    /**
     * [digitsToBeRemoved] is the module of 3 of the length of integerPart or 0. If higher than 0 this will be number
     * of digits to be removed from the beginning of the integerPart string to get a number of digits divisible by 3
     * @type number
     */
    const digitsToBeRemoved = (integerPart.length > 3) ? integerPart.length % 3 : 0
    const firstIntPart = digitsToBeRemoved ? integerPart.substr(0, digitsToBeRemoved) + thousands : ''
    const secondIntPart = integerPart.substr(digitsToBeRemoved).replace(/(\d{3})(?=\d)/g, '$1' + thousands)
    const decimalPart = decimalCount ? (decimal + Math.abs(Number(amount) - Number(integerPart)).toFixed(decimalCount).slice(2)) : ''
    const formattedStr = firstIntPart + secondIntPart + decimalPart
    return formattedStr
  } catch (e) {
    console.log(e)
    return 'NaN'
  }
}

const znCurrencySymbol = (code: string) => currencies[code]?.symbol ?? ''

export const znNumericValue = (amount: number, field: ZengineField) => {
  const isNegative = amount < 0 ? '-' : ''
  const value = Math.abs(amount)
  const properties = field?.settings?.properties
  const decimal = properties?.decimal ? properties.decimal : 0
  // add commas as thousands separator
  const formattedValue = znNumberWithCommas(value.toFixed(decimal), decimal)
  const symbol = properties?.currency ? znCurrencySymbol(properties.currency || '') : ''
  const result = isNegative + symbol + formattedValue
  return result
}
