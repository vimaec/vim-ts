/**
 * @module vim-ts
 */

import { Range } from './bfast'
import { RemoteValue } from './remoteValue'
import {RequestTracker} from './requestTracker'

let RemoteBufferMaxConcurency = 10
export function setRemoteBufferMaxConcurency(value: number){
  RemoteBufferMaxConcurency =value
}


class RetryRequest {
  url: string
  range: string | undefined
  // eslint-disable-next-line no-undef
  responseType: XMLHttpRequestResponseType
  msg: string | undefined
  xhr: XMLHttpRequest | undefined

  constructor (
    url: string,
    range: string | undefined,
    // eslint-disable-next-line no-undef
    responseType: XMLHttpRequestResponseType
  ) {
    this.url = url
    this.range = range
    this.responseType = responseType
  }

  onLoad: ((result: any) => void) | undefined
  onError: (() => void) | undefined
  onProgress: ((e: ProgressEvent<EventTarget>) => void) | undefined

  abort(){
    this.xhr.abort()
  }

  send () {
    this.xhr?.abort()
    const xhr = new XMLHttpRequest()
    xhr.open('GET', this.url)
    xhr.responseType = this.responseType

    if (this.range) {
      xhr.setRequestHeader('Range', this.range)
    }

    xhr.onprogress = (e) => {
      this.onProgress?.(e)
    }
    xhr.onload = (e) => {
      this.onProgress?.(e)
      this.onLoad?.(xhr.response)
    }
    xhr.onerror = (_) => {
      this.onError?.()
    }
    xhr.send()
    this.xhr = xhr
  }
}

/**
 * Wrapper to provide tracking for all webrequests via request logger.
 */
export class RemoteBuffer {
  url: string
  tracker: RequestTracker
  logs : Logger
  queue: RetryRequest[] = []
  active: Set<RetryRequest> = new Set<RetryRequest>()
  maxConcurency: number = RemoteBufferMaxConcurency
  encoded: RemoteValue<boolean>

  constructor (url: string, verbose: boolean = false) {
    this.url = url
    this.logs = verbose ? new DefaultLog() : new NoLog()
    this.tracker = new RequestTracker(url, this.logs)
    this.encoded = new RemoteValue(() => this.requestEncoding())
  }

  private async requestEncoding () {
    const xhr = new XMLHttpRequest()
    xhr.open('HEAD', this.url)
    xhr.send()
    this.logs.log(`Requesting header for ${this.url}`)

    const promise = new Promise<string | undefined>((resolve, reject) => {
      xhr.onload = (_) => {
        let encoding: string | null | undefined
        try {
          encoding = xhr.getResponseHeader('content-encoding')
        } catch (e) {
          this.logs.error(e)
        }
        resolve(encoding ?? undefined)
      }
      xhr.onerror = (_) => resolve(undefined)
    })

    const encoding = await promise
    const encoded = !!encoding

    this.logs.log(`Encoding for ${this.url} = ${encoding}`)
    if (encoded) {
      this.logs.log(
        `Defaulting to download strategy for encoded content at ${this.url}`
      )
    }
    return encoded
  }

  abort(){
    this.active.forEach(request => {
      request.abort()
    })
    this.active.clear()
    this.queue.length = 0
  }

  async http (range: Range | undefined, label: string) {
    const useRange = range && !(await this.encoded.get())
    const rangeStr = useRange
      ? `bytes=${range.start}-${range.end - 1}`
      : undefined
    const request = new RetryRequest(this.url, rangeStr, 'arraybuffer')
    request.msg = useRange
      ? `${label} : [${range.start}, ${range.end}] of ${this.url}`
      : `${label} of ${this.url}`

    this.enqueue(request)
    return new Promise<ArrayBuffer | undefined>((resolve, reject) => {
      this.tracker.start(label)

      request.onProgress = (e) => {
        this.tracker.update(label, e)
      }
      request.onLoad = (result) => {
        this.tracker.end(label)
        resolve(result)
        this.end(request)
      }
      request.onError = () => {
        this.tracker.fail(label)
        this.retry(request)
      }
    })
  }

  private enqueue (xhr: RetryRequest) {
    this.queue.push(xhr)
    this.next()
  }

  private retry (xhr: RetryRequest) {
    this.active.delete(xhr)
    this.maxConcurency = Math.max(1, this.maxConcurency - 1)
    setTimeout(() => this.enqueue(xhr), 2000)
  }

  private end (xhr: RetryRequest) {
    this.active.delete(xhr)
    this.next()
  }

  private next () {
    if (this.queue.length === 0) {
      return
    }

    if (this.active.size >= this.maxConcurency) {
      return
    }

    const next = this.queue[0]
    this.queue.shift()
    this.active.add(next)
    next.send()
    this.logs.log('Starting ' + next.msg)
  }
}
