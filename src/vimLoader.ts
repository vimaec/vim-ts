/**
 * @module vim-ts
 */

import { BFast } from "./bfast"

export class VimLoader {
    static async loadFromBfast(bfast: BFast): Promise<[BFast, string[]] | undefined> {
        let entity: BFast | undefined
        let strings: string[] | undefined

        await Promise.all([
            VimLoader.requestStrings(bfast).then((strs) => (strings = strs)),
            VimLoader.requestEntities(bfast).then((ets) => (entity = ets))
        ])

        if (!entity) {
            return undefined
        }

        return [ entity!, strings ?? [] ]
    }

    private static async requestStrings (bfast: BFast) {
        const buffer = await bfast.getBuffer('strings')
        if (!buffer) {
            console.error('Could not get String Data from VIM file. Bim features will be disabled.')
            return
        }
        const strings = new TextDecoder('utf-8').decode(buffer).split('\0')
        return strings
    }

    private static async requestEntities (bfast: BFast) {
        const entities = await bfast.getBfast('entities')
        if (!entities) {
            console.error('Could not get String Data from VIM file. Bim features will be disabled.')
        }
        return entities
    }
}