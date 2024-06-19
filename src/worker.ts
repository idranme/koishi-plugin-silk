import { encode, decode, EncodeResult, DecodeResult } from 'silk-wasm'
import { isMainThread, parentPort, Worker, MessageChannel } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { Semaphore } from '@shopify/semaphore'

interface WorkerInstance {
    worker: Worker
    busy: boolean
}

interface Data {
    type: string
    params: [input: ArrayBufferView | ArrayBuffer, sampleRate: number]
}

if (!isMainThread && parentPort) {
    parentPort.addListener('message', (e) => {
        const data: Data = e.data
        const port: MessagePort = e.port
        switch (data.type) {
            case 'encode':
                encode(...data.params)
                    .then(ret => {
                        port.postMessage(ret)
                    }).catch(err => {
                        port.postMessage(err)
                    }).finally(() => {
                        port.close()
                    })
                break
            case 'decode':
                decode(...data.params).then(ret => {
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

function postMessage(data: Data): Promise<any> {
    return new Promise((resolve, reject) => {
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
        const { port1, port2 } = new MessageChannel()
        port2.once('message', async (ret) => {
            port2.close()
            if (used > 1) {
                workers[indexing].worker.terminate()
                workers[indexing] = undefined
                used--
            } else {
                workers[indexing].busy = false
            }
            ret instanceof Error ? reject(ret) : resolve(ret)
        })
        workers[indexing].worker.postMessage({ port: port1, data }, [port1])
    })
}

let semaphore: Semaphore

function init() {
    if (!semaphore) {
        const maxThreads = Math.min(availableParallelism(), 3)
        semaphore = new Semaphore(maxThreads)
    }
}

export async function silkEncode(...args: Parameters<typeof encode>): Promise<EncodeResult> {
    init()
    const permit = await semaphore.acquire()
    return postMessage({ type: 'encode', params: args }).finally(() => permit.release())
}

export async function silkDecode(...args: Parameters<typeof decode>): Promise<DecodeResult> {
    init()
    const permit = await semaphore.acquire()
    return postMessage({ type: 'decode', params: args }).finally(() => permit.release())
}