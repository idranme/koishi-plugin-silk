import { Context, Schema, Service } from 'koishi'
import { silkEncode, silkDecode } from './worker'
import { isWav, getDuration, getWavFileInfo, isSilk } from 'silk-wasm'

declare module 'koishi' {
  interface Context {
    silk: SILK
  }
}

class SILK extends Service {
  constructor(ctx: Context, config: SILK.Config) {
    super(ctx, 'silk')
  }

  /**
   * 编码为 SILK
   * @param input WAV 或单声道 pcm_s16le 文件
   * @param sampleRate `input` 的采样率，可为 8000/12000/16000/24000/32000/44100/48000
   * @returns SILK
   */
  encode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    return silkEncode(input, sampleRate)
  }

  /**
   * 将 SILK 解码为 PCM
   * @param input SILK 文件
   * @param sampleRate `input` 的采样率
   * @returns pcm_s16le
   */
  decode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    return silkDecode(input, sampleRate)
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

namespace SILK {
  export interface Config { }
  export const Config: Schema<Config> = Schema.object({})
}

export default SILK