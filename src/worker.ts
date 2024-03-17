import { encode, decode, encodeResult, decodeResult } from 'silk-wasm'
import { isMainThread, parentPort, Worker, MessageChannel } from 'node:worker_threads'
import { Dict } from 'koishi'
import { availableParallelism } from 'node:os'
import { Semaphore } from '@shopify/semaphore'

interface WorkerInstance {
    worker: Worker
    busy: boolean
}

if (!isMainThread && parentPort) {
    parentPort.addListener('message', (e) => {
        const data: Dict = e.data
        const port: MessagePort = e.port
        switch (data?.type) {
            case "encode":
                encode(data.input, data.sampleRate)
                    .then(ret => {
                        port.postMessage(ret)
                    }).catch(err => {
                        port.postMessage(err)
                    }).finally(() => {
                        port.close()
                    })
                break
            case "decode":
                decode(data.input, data.sampleRate).then(ret => {
                    port.postMessage(ret)
                }).catch(err => {
                    port.postMessage(err)
                }).finally(() => {
                    port.close()
                })
                break
            default:
                port.postMessage(undefined)
                port.close()
        }
    })
}

const workers: WorkerInstance[] = []
let used = 0

function postMessage<T extends any>(data: Dict): Promise<T> {
    let indexing = 0
    if (workers.length === 0) {
        workers.push({
            worker: new Worker(__filename),
            busy: false
        })
        used++
    } else {
        let found = false
        for (const [index, value] of workers.entries()) {
            if (value?.busy === false) {
                indexing = index
                found = true
                break
            }
        }
        if (!found) {
            const len = workers.push({
                worker: new Worker(__filename),
                busy: false
            })
            used++
            indexing = len - 1
        }
    }
    workers[indexing].busy = true
    const subChannel = new MessageChannel()
    const port = subChannel.port2
    return new Promise((resolve, reject) => {
        port.once('message', async (ret) => {
            port.close()
            if (used > 1) {
                workers[indexing].worker.terminate()
                workers[indexing] = undefined
                used--
            } else {
                workers[indexing].busy = false
            }
            ret instanceof Error ? reject(ret) : resolve(ret)
        })
        workers[indexing].worker.postMessage({ port: subChannel.port1, data }, [subChannel.port1])
    })
}

let semaphore: Semaphore

function init() {
    if (!semaphore) {
        const maxThreads = Math.min(availableParallelism(), 3)
        semaphore = new Semaphore(maxThreads)
    }
}

export async function silkEncode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    init()
    const permit = await semaphore.acquire()
    return postMessage<encodeResult>({ type: 'encode', input, sampleRate }).finally(() => permit.release())
}

export async function silkDecode(input: ArrayBufferView | ArrayBuffer, sampleRate: number) {
    init()
    const permit = await semaphore.acquire()
    return postMessage<decodeResult>({ type: 'decode', input, sampleRate }).finally(() => permit.release())
}