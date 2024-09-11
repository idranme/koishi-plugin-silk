# koishi-plugin-silk

[![npm](https://img.shields.io/npm/v/koishi-plugin-silk?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-silk)

SILK Audio Encoding Service

## API

```ts
interface EncodeResult {
    data: Uint8Array
    duration: number
}

interface DecodeResult {
    data: Uint8Array
    duration: number
}

/**
 * 编码为 SILK
 * @param input WAV 或 MP3 或单声道 pcm_s16le 文件
 * @param sampleRate `input` 的采样率，可为 8000/12000/16000/24000/32000/44100/48000
 * @returns SILK
 */
function encode(input: ArrayBufferView | ArrayBuffer, sampleRate: number): Promise<EncodeResult>

/**
 * 将 SILK 解码为 PCM
 * @param input SILK 文件
 * @param sampleRate `input` 的采样率
 * @returns pcm_s16le
 */
function decode(input: ArrayBufferView | ArrayBuffer, sampleRate: number): Promise<DecodeResult>

/**
 * 获取 SILK 音频时长
 * @param data SILK 文件
 * @param frameMs SILK 的 frameMs，可为 20/40/60/80/100，默认为 20
 * @returns 单位为毫秒的时长
 */
function getDuration(data: ArrayBufferView | ArrayBuffer, frameMs?: number): number

/**
 * 检测是否为 WAV 文件
 * @param data 任意文件
 */
function isWav(data: ArrayBufferView | ArrayBuffer): boolean

/**
 * 获取 WAV 文件的信息
 * @param data WAV 文件
 * @returns metadata
 */
function getWavFileInfo(data: ArrayBufferView | ArrayBuffer): WavFileInfo

/**
 * 检测是否为 SILK 文件
 * @param data 任意文件
 */
function isSilk(data: ArrayBufferView | ArrayBuffer): boolean
```