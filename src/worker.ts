import { encode, decode, EncodeResult, DecodeResult } from 'silk-wasm'
import { isMainThread, parentPort, Worker, MessageChannel } from 'node:worker_threads'
import SILK from './index'

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
                port.postMessage(new Error('unsupported'))
                port.close()
        }
    })
}

function postMessage(this: SILK, data: Data): Promise<any> {
    return new Promise((resolve, reject) => {
        let indexing = 0
        if (this.workers.length === 0) {
            this.workers.push({
                worker: new Worker(__filename),
                busy: false
            })
            this.workerUsed++
        } else {
            let found = false
            for (const [index, value] of this.workers.entries()) {
                if (value?.busy === false) {
                    indexing = index
                    found = true
                    break
                }
            }
            if (!found) {
                const len = this.workers.push({
                    worker: new Worker(__filename),
                    busy: false
                })
                this.workerUsed++
                indexing = len - 1
            }
        }
        this.workers[indexing].busy = true
        const { port1, port2 } = new MessageChannel()
        port2.once('message', async (ret) => {
            if (this.workerUsed > 1) {
                this.workers[indexing].worker.terminate()
                delete this.workers[indexing]
                this.workerUsed--
            } else {
                this.workers[indexing].busy = false
            }
            ret instanceof Error ? reject(ret) : resolve(ret)
        })
        this.workers[indexing].worker.postMessage({ port: port1, data }, [port1])
    })
}

export async function silkEncode(this: SILK, ...args: Parameters<typeof encode>): Promise<EncodeResult> {
    const permit = await this.semaphore.acquire()
    return postMessage.call(this, { type: 'encode', params: args }).finally(() => permit.release())
}

export async function silkDecode(this: SILK, ...args: Parameters<typeof decode>): Promise<DecodeResult> {
    const permit = await this.semaphore.acquire()
    return postMessage.call(this, { type: 'decode', params: args }).finally(() => permit.release())
}