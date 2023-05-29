import { VimDocument } from '../src/objectModel'
import { BFast } from '../src/bfast'
import { loadFile } from './helpers'

const vimFilePath = `${__dirname}/../data/Wolford_Residence.r2023.vim`

describe('testing VIM loading file', () => {
    test('loading VIM file', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)

        expect(doc).not.toBe(undefined)
        expect(doc!.element).not.toBe(undefined);
    })
})

describe('testing objectModel.ts file', () => {
    test('getting one element', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)

        expect(doc).not.toBe(undefined)
        expect(doc!.element).not.toBe(undefined)
        expect(await doc!.element!.getCount()).toBe(4464)
        expect(await doc!.element!.getId(0)).toBe(-1n)
        expect(await doc!.element!.getId(1)).toBe(1222722n)
        expect(await doc!.element!.getId(2)).toBe(32440n)
        expect(await doc!.element!.getId(3)).toBe(118390n)
        expect(await doc!.element!.get(30)).toMatchObject({})
    })
})

describe('testing objectModel.ts array getter', () => {
    test('getting an array of IDs', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)
        const ids = await doc?.element?.getAllId()

        expect(doc).not.toBe(undefined)
        expect(doc!.element).not.toBe(undefined);
        expect(ids).not.toBe(undefined)
        expect(ids!.length).toBe(4464)
        expect(ids!.slice(0, 10)).toEqual(new BigInt64Array([ -1n, 1222722n, 32440n, 118390n, 174750n, 18438n, 355500n, 185913n, 9946n, 182664n ]))
    })
})

describe('testing objectModel.ts get-all getter', () => {
    test('getting all levels', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)
        const levels = await doc?.level?.getAll()

        expect(levels).not.toBe(undefined)
        expect(levels!.length).toBe(12)
    })
})

describe('testing objectModel.ts ignoreStrings flag', () => {
    test('getting an element from a document without strings', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const docWithStrings = await VimDocument.createFromBfast(bfast)
        const docWithoutStrings = await VimDocument.createFromBfast(bfast, true)

        const elementWithStrings = await docWithStrings?.element?.get(30)
        const elementWithoutStrings = await docWithoutStrings?.element?.get(30)

        expect(docWithStrings).not.toBeUndefined()
        expect(docWithoutStrings).not.toBeUndefined()
        expect(elementWithStrings).not.toBeUndefined()
        expect(elementWithoutStrings).not.toBeUndefined()
        expect(elementWithStrings!.name).toBe("GWB on Mtl. Stud")
        expect(elementWithoutStrings!.name).toBeUndefined()
        expect(elementWithStrings!.familyName).toBe("Compound Ceiling")
        expect(elementWithoutStrings!.familyName).toBeUndefined()
        expect(elementWithStrings!.id).toBe(elementWithoutStrings!.id)
    })
})