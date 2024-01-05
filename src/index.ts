import { Context, Schema, Service } from 'koishi'
import { silkEncode, silkDecode, silkGetDuration } from './worker'

declare module 'koishi' {
  interface Context {
    silk: SILK
  }
}

class SILK extends Service {
  constructor(ctx: Context, private config: SILK.Config) {
    super(ctx, 'silk')
  }

  /** `input` 为单声道 pcm_s16le, `samplingRate` 为 `input` 的采样率 */
  encode(input: Uint8Array, sampleRate: number) {
    return silkEncode(input, sampleRate)
  }

  /** `input` 为 silk, `samplingRate` 为 `input` 的采样率 */
  decode(input: Uint8Array, sampleRate: number) {
    return silkDecode(input, sampleRate)
  }
  
  getDuration(silk: Uint8Array, frameMs = 20) {
    return silkGetDuration(silk, frameMs)
  }
}

namespace SILK {
  export interface Config { }
  export const Config: Schema<Config> = Schema.object({})
}

export default SILK