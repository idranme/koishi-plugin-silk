import { Stream } from 'node:stream'

export function streamToBuffer(stream: Stream) {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = []
    stream.on('data', (data) => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
    stream.on('error', reject)
  })
}

export function iterableToBuffer(iterable: Iterable<string | NodeJS.ArrayBufferView>) {
  const buffers: Buffer[] = []
  for (const item of iterable) {
    if (typeof item === 'string') {
      buffers.push(Buffer.from(item))
    } else if (ArrayBuffer.isView(item)) {
      buffers.push(Buffer.from(item.buffer))
    }
  }
  return Buffer.concat(buffers)
}

export async function asyncIterableToBuffer(iterable: AsyncIterable<string | NodeJS.ArrayBufferView>) {
  const buffers: Buffer[] = []
  for await (const item of iterable) {
    if (typeof item === 'string') {
      buffers.push(Buffer.from(item))
    } else if (ArrayBuffer.isView(item)) {
      buffers.push(Buffer.from(item.buffer))
    }
  }
  return Buffer.concat(buffers)
}

// forked from https://github.com/audiojs/audio-type/blob/5f5a2f6dca57dc249ea7fc152008a4be3e8bd2ff/audio-type.js#L15
export function isMp3(buf: Uint8Array) {
  if (!buf || buf.length < 3) return

  return (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || // id3
    (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) || // no tag
    (buf[0] === 0x54 && buf[1] === 0x41 && buf[2] === 0x47) // 'TAG'
}

export function ensureMonoPcm(channelData: Float32Array[]): Float32Array {
  const { length: numberOfChannels } = channelData
  if (numberOfChannels === 1) {
    return channelData[0]
  }
  const monoData = new Float32Array(channelData[0].length)
  for (let i = 0; i < monoData.length; i++) {
    let sum = 0
    for (let j = 0; j < numberOfChannels; j++) {
      sum += channelData[j][i]
    }
    monoData[i] = sum / numberOfChannels
  }
  return monoData
}

export function ensureS16lePcm(input: Float32Array): ArrayBuffer {
  const fileLength = input.length * 2
  const arrayBuffer = new ArrayBuffer(fileLength)
  const int16Array = new Int16Array(arrayBuffer)
  for (let offset = 0; offset < input.length; offset++) {
    const x = ~~(input[offset] * 32768)
    int16Array[offset] = x > 32767 ? 32767 : x
  }
  return arrayBuffer
}