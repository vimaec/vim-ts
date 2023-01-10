import { VimDocument } from '../src/objectModel'
import { BFast } from '../src/bfast'
import * as fs from 'fs'

function loadFile(path: string) {
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

const vimFilePath = "/Users/vadim/projects/vim/vim-ts/data/Wolford_Residence.r2023.vim"

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
        expect(await doc!.element!.getId(0)).toBe(-1)
        expect(await doc!.element!.getId(1)).toBe(1222722)
        expect(await doc!.element!.getId(2)).toBe(32440)
        expect(await doc!.element!.getId(3)).toBe(118390)
        expect(await doc!.element!.get(30)).toMatchObject({})
    })
})

describe('testing objectModel.ts recursive getter', () => {
    test('getting an element recursively', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)

        expect(await doc?.element?.get(30, true)).toMatchObject({
            index: 30,
            id: 374011,
            type: 'Ceiling',
            name: 'GWB on Mtl. Stud',
            uniqueId: '3ae43fb5-6797-479b-ac14-3436f35a7178-0005b4fb',
            familyName: 'Compound Ceiling',
            isPinned: false,
            levelIndex: 6,
            phaseCreatedIndex: 1,
            phaseDemolishedIndex: -1,
            categoryIndex: 5,
            worksetIndex: 0,
            designOptionIndex: -1,
            ownerViewIndex: -1,
            groupIndex: -1,
            assemblyInstanceIndex: -1,
            bimDocumentIndex: 0,
            roomIndex: -1,
            location: { x: 0, y: 0, z: 0 },
            level: { index: 6, elevation: 0, elementIndex: 23 },
            phaseCreated: { index: 1, elementIndex: 3 },
            phaseDemolished: { index: -1, elementIndex: undefined },
            workset: {
                index: 0,
                id: 0,
                name: 'Family  : Profiles : Rectangular Handrail2',
                kind: 'FamilyWorkset',
                isOpen: true,
                isEditable: true,
                owner: '',
                uniqueId: '1acddad0-9eb5-11d4-8902-0000863de970',
                bimDocumentIndex: 0
            },
            designOption: {
                index: -1,
                isPrimary: undefined,
                elementIndex: undefined
            },
            bimDocument: {
                index: 0,
                title: 'Wolford_Residence.r2023',
                isMetric: false,
                guid: 'e419df20-11dc-440d-813d-e8861f7d4ff0',
                numSaves: 209,
                isLinked: false,
                isDetached: false,
                isWorkshared: false,
                pathName: 'C:\\dev\\vimaec\\data\\snapshot-data\\revit\\2023\\Wolford_Residence\\Wolford_Residence.r2023.rvt',
                latitude: 0.7392940512382146,
                longitude: -1.2402270622730125,
                timeZone: -5,
                placeName: '<Default>',
                weatherStationName: '53158_2004',
                elevation: 26,
                projectLocation: 'Internal',
                issueDate: 'Issue Date',
                status: 'Project Status',
                clientName: 'Owner',
                address: 'Enter address here',
                name: 'Project Name',
                number: 'Project Number',
                author: '',
                buildingName: '',
                organizationName: '',
                organizationDescription: '',
                product: 'Revit',
                version: 'Autodesk Revit 2023',
                user: 'Martin.ashton',
                activeViewIndex: 0,
                ownerFamilyIndex: -1,
                parentIndex: -1,
                elementIndex: 0
            },
            room: {
                index: -1,
                baseOffset: undefined,
                limitOffset: undefined,
                unboundedHeight: undefined,
                volume: undefined,
                perimeter: undefined,
                area: undefined,
                number: undefined,
                upperLimitIndex: undefined,
                elementIndex: undefined
            },
            category: {
                index: 5,
                name: 'Ceilings',
                id: -2000038,
                categoryType: 'Model',
                builtInCategory: 'OST_Ceilings',
                parentIndex: -1,
                materialIndex: -1,
                lineColor: { x: 0, y: 0, z: 0 }
            },
            ownerView: {
                index: -1,
                title: undefined,
                viewType: undefined,
                scale: undefined,
                detailLevel: undefined,
                cameraIndex: undefined,
                elementIndex: undefined,
                up: undefined,
                right: undefined,
                origin: undefined,
                viewDirection: undefined,
                viewPosition: undefined,
                outline: undefined
            },
            group: {
                index: -1,
                groupType: undefined,
                elementIndex: undefined,
                position: undefined
            },
            assemblyInstance: {
                index: -1,
                assemblyTypeName: undefined,
                elementIndex: undefined,
                position: undefined
            }
        })
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
        expect(ids!.slice(0, 10)).toEqual([ -1, 1222722, 32440, 118390, 174750, 18438, 355500, 185913, 9946, 182664 ])
    })
})

describe('testing objectModel.ts get-all getter', () => {
    test('getting all levels', async () => {
        const arrayBuffer = await loadFile(vimFilePath)

        const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
        const doc = await VimDocument.createFromBfast(bfast)
        const levels = await doc?.level?.getAll()

        expect(levels).not.toBe(undefined)
        expect(levels!.length).toBe(13)
    })
})