import * as fs from 'fs'

export function loadFile(path: string) {
    return new Promise<ArrayBuffer | undefined>((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err)
                reject(err)
            else {
                var arrbuf = new ArrayBuffer(data.length)
                const view = new Uint8Array(arrbuf)
                for (var i = 0; i < data.length; i++) {
                    view[i] = data[i]
                }

                resolve(arrbuf)
            }
        })
    })
}