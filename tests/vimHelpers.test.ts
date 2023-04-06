import { VimDocument } from '../src/objectModel'
import { BFast } from '../src/bfast'
import { loadFile } from './helpers'
import * as VimHelpers from '../src/vimHelpers'
import * as fs from 'fs';

const vimFilePath = `${__dirname}/../data/Wolford_Residence.r2023.vim`
const testFilePath = `${__dirname}/../tests/parameters_119.txt`

describe('testing vimHelpers.ts getElementParameters', () => {
  test('getting element parameters', async () => {
    const arrayBuffer = await loadFile(vimFilePath)

    const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
    const doc = await VimDocument.createFromBfast(bfast)
    const parameters = await VimHelpers.getElementParameters(doc!, 119)

    //fs.writeFileSync(testFilePath, JSON.stringify(parameters));
    
    const rawData = fs.readFileSync(testFilePath);
    const data = JSON.parse(rawData.toString());
    expect(parameters).toEqual(data)
    
  })
})