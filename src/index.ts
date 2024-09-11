import { Context, Service, Schema, defineProperty } from 'koishi'
import { silkEncode, silkDecode } from './worker'
import { isWav, getDuration, getWavFileInfo, isSilk } from 'silk-wasm'
import { Semaphore } from '@shopify/semaphore'
import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import { Stream } from 'node:stream'
import { readFile } from 'node:fs/promises'
import { streamToBuffer, iterableToBuffer, asyncIterableToBuffer } from './utils'

declare module 'koishi' {
  interface Context {
    silk: SilkService
    ntsilk: NTSilkService
  }
}

interface WorkerInstance {
  worker: Worker
  busy: boolean
}

abstract class SilkServiceBase extends Service {
  protected semaphore: Semaphore
  protected workers: WorkerInstance[]
  protected workerUsed: number
}

class NTSilkService extends SilkServiceBase {
  constructor(ctx: Context) {
    super(ctx, 'ntsilk')
    const maxThreads = Math.max(availableParallelism() - 1, 1)
    defineProperty(this, 'semaphore', new Semaphore(maxThreads))
    defineProperty(this, 'workers', [])
    defineProperty(this, 'workerUsed', 0)
  }

  async encode(
    input:
      | string
      | Buffer
      | ArrayBuffer
      | Uint8Array
      | number[]
      | Stream
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
  ): Promise<{ output: Buffer, duration: number | undefined }> {
    let data: Buffer
    if (typeof input === 'string') {
      data = await readFile(input)
    } else if (ArrayBuffer.isView(input)) {
      data = Buffer.from(input.buffer)
    } else if (Array.isArray(input)) {
      data = Buffer.from(input)
    } else if (Symbol.iterator in input) {
      data = iterableToBuffer(input)
    } else if (Symbol.asyncIterator in input) {
      data = await asyncIterableToBuffer(input)
    } else if (input instanceof Stream) {
      data = await streamToBuffer(input)
    } else {
      data = Buffer.from(input)
    }
    const allowSampleRate = [8000, 12000, 16000, 24000, 32000, 44100, 48000]
    if (isWav(data) && allowSampleRate.includes(getWavFileInfo(data).fmt.sampleRate)) {
      const res = await silkEncode.call(this, data, 0)
      return {
        output: Buffer.from(res.data),
        duration: res.duration
      }
    }
    if (!this.ctx.get('ffmpeg')) {
      throw new Error('missing ffmpeg service, please go to market to install')
    }
    const pcmBuf = await this.ctx.get('ffmpeg')
      .builder()
      .input(data)
      .outputOption('-ar', '24000', '-ac', '1', '-f', 's16le')
      .run('buffer')
    const res = await silkEncode.call(this, pcmBuf, 24000)
    return {
      output: Buffer.from(res.data),
      duration: res.duration
    }
  }
}

class SilkService extends SilkServiceBase {
  constructor(ctx: Context) {
    super(ctx, 'silk')
    const maxThreads = Math.max(availableParallelism() - 1, 1)
    defineProperty(this, 'semaphore', new Semaphore(maxThreads))
    defineProperty(this, 'workers', [])
    defineProperty(this, 'workerUsed', 0)
    ctx.plugin(NTSilkService)
  }

  /**
   * 编码为 SILK
   * @param input WAV 或单声道 pcm_s16le 文件
   * @param sampleRate `input` 的采样率，可为 8000/12000/16000/24000/32000/44100/48000
   * @returns SILK
   */
  encode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    return silkEncode.call(this, input, sampleRate)
  }

  /**
   * 将 SILK 解码为 PCM
   * @param input SILK 文件
   * @param sampleRate `input` 的采样率
   * @returns pcm_s16le
   */
  decode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    return silkDecode.call(this, input, sampleRate)
  }

  /**
   * 获取 SILK 音频时长
   * @param data SILK 文件
   * @param frameMs SILK 的 frameMs，可为 20/40/60/80/100，默认为 20
   * @returns 单位为毫秒的时长
   */
  getDuration(data: ArrayBufferView | ArrayBuffer, frameMs = 20) {
    return getDuration(data, frameMs)
  }

  /**
   * 检测是否为 WAV 文件
   * @param data 任意文件
   */
  isWav(data: ArrayBufferView | ArrayBuffer) {
    return isWav(data)
  }

  /**
   * 获取 WAV 文件的信息
   * @param data WAV 文件
   * @returns metadata
   */
  getWavFileInfo(data: ArrayBufferView | ArrayBuffer) {
    return getWavFileInfo(data)
  }

  /**
   * 检测是否为 SILK 文件
   * @param data 任意文件
   */
  isSilk(data: ArrayBufferView | ArrayBuffer): boolean {
    return isSilk(data)
  }
}

namespace SilkService {
  export const Config = Schema.object({})
}

export type { SilkServiceBase }
export default SilkService