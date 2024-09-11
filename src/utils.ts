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