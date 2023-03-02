import { VimDocument } from '../src/objectModel'
import { BFast } from '../src/bfast'
import { loadFile } from './helpers'
import { VimHelpers } from '../src/vimHelpers'
import { G3d } from '../src/g3d'
import { RemoteG3d } from '../src/remoteG3d'
import exp from 'constants'
import { randomInt } from 'crypto'

const vimFilePath = `${__dirname}/../data/Wolford_Residence.r2023.vim`


async function loadBoth(){
  const arrayBuffer = await loadFile(vimFilePath)
  const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
  const g3dBfast = await bfast.getBfast('geometry')
  const g3d = await G3d.createFromBfast(g3dBfast!)
  const remote = RemoteG3d.createFromBfast(g3dBfast!)
  return [g3d, remote] as [G3d, RemoteG3d]
}

async function loadG3d(){
  const arrayBuffer = await loadFile(vimFilePath)
  const bfast = new BFast((arrayBuffer as ArrayBuffer)!)
  const g3dBfast = await bfast.getBfast('geometry')
  return await G3d.createFromBfast(g3dBfast!)
}


/*
describe('testing Remote G3d', () => {
  test('getVertexCount', async () => {
      const [g3d, remoteG3d] = await loadBoth()

      const count = await remoteG3d.getVertexCount()
      expect(count).toBe(g3d.getVertexCount())
  })

  test('getMeshCount', async () => {
    const [g3d, remoteG3d] = await loadBoth()

    const count = await remoteG3d.getMeshCount()
    expect(count).toBe(g3d.getMeshCount())
  })

  test('getSubmeshCount', async () => {
    const [g3d, remoteG3d] = await loadBoth()

    const count = await remoteG3d.getSubmeshCount()
    expect(count).toBe(g3d.getSubmeshCount())
  })

  test('meshSubmeshes', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.meshSubmeshes.getNumber(-1)).toBe(g3d.meshSubmeshes[-1])
    expect(await remoteG3d.meshSubmeshes.getNumber(0)).toBe(g3d.meshSubmeshes[0])
    expect(await remoteG3d.meshSubmeshes.getNumber(1)).toBe(g3d.meshSubmeshes[1])
    expect(await remoteG3d.meshSubmeshes.getNumber(meshCount-2)).toBe(g3d.meshSubmeshes[meshCount-2])
    expect(await remoteG3d.meshSubmeshes.getNumber(meshCount-1)).toBe(g3d.meshSubmeshes[meshCount-1])
    expect(await remoteG3d.meshSubmeshes.getNumber(meshCount)).toBe(g3d.meshSubmeshes[meshCount])
  })

  test('getMeshSubmeshStart', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshSubmeshStart(-1)).toBe(g3d.getMeshSubmeshStart(-1))
    expect(await remoteG3d.getMeshSubmeshStart(0)).toBe(g3d.getMeshSubmeshStart(0))
    expect(await remoteG3d.getMeshSubmeshStart(1)).toBe(g3d.getMeshSubmeshStart(1))
    expect(await remoteG3d.getMeshSubmeshStart(meshCount-1)).toBe(g3d.getMeshSubmeshStart(meshCount-1))
    expect(await remoteG3d.getMeshSubmeshStart(meshCount)).toBe(g3d.getMeshSubmeshStart(meshCount))
  })

  test('getMeshSubmeshEnd', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshSubmeshEnd(-1)).toBe(g3d.getMeshSubmeshEnd(-1))
    expect(await remoteG3d.getMeshSubmeshEnd(0)).toBe(g3d.getMeshSubmeshEnd(0))
    expect(await remoteG3d.getMeshSubmeshEnd(1)).toBe(g3d.getMeshSubmeshEnd(1))
    expect(await remoteG3d.getMeshSubmeshEnd(meshCount-1)).toBe(g3d.getMeshSubmeshEnd(meshCount-1))
    expect(await remoteG3d.getMeshSubmeshEnd(meshCount)).toBe(g3d.getMeshSubmeshEnd(meshCount))
  })

  test('getMeshIndexStart', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshIndexStart(-1)).toBe(g3d.getMeshIndexStart(-1))
    expect(await remoteG3d.getMeshIndexStart(0)).toBe(g3d.getMeshIndexStart(0))
    expect(await remoteG3d.getMeshIndexStart(1)).toBe(g3d.getMeshIndexStart(1))
    expect(await remoteG3d.getMeshIndexStart(meshCount-1)).toBe(g3d.getMeshIndexStart(meshCount-1))
    expect(await remoteG3d.getMeshIndexStart(meshCount)).toBe(g3d.getMeshIndexStart(meshCount))
  })

  test('getMeshIndexEnd', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshIndexEnd(-1)).toBe(g3d.getMeshIndexEnd(-1))
    expect(await remoteG3d.getMeshIndexEnd(0)).toBe(g3d.getMeshIndexEnd(0))
    expect(await remoteG3d.getMeshIndexEnd(1)).toBe(g3d.getMeshIndexEnd(1))
    expect(await remoteG3d.getMeshIndexEnd(meshCount-1)).toBe(g3d.getMeshIndexEnd(meshCount-1))
    expect(await remoteG3d.getMeshIndexEnd(meshCount)).toBe(g3d.getMeshIndexEnd(meshCount))
  })

  test('getMeshIndexCount', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshIndexCount(-1)).toBe(g3d.getMeshIndexCount(-1))
    expect(await remoteG3d.getMeshIndexCount(0)).toBe(g3d.getMeshIndexCount(0))
    expect(await remoteG3d.getMeshIndexCount(1)).toBe(g3d.getMeshIndexCount(1))
    expect(await remoteG3d.getMeshIndexCount(meshCount-1)).toBe(g3d.getMeshIndexCount(meshCount-1))
    expect(await remoteG3d.getMeshIndexCount(meshCount)).toBe(g3d.getMeshIndexCount(meshCount))
  })

  test('getMeshIndexCount', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()

    const compareIndices = async function(mesh: number){
      const start = g3d.getMeshIndexStart(mesh)
      const end = g3d.getMeshIndexEnd(mesh)

      const indices = await remoteG3d.getMeshIndices(mesh)
      const expected = g3d.indices.slice(start, end)
      console.log(indices)
      console.log(expected)
      expect(indices.length).toBe(expected.length)

      for(let i=0; i < indices.length; i ++){
        expect(indices[i]).toBe(expected[i])
      }
    }
    compareIndices(0)
    compareIndices(1)
    compareIndices(meshCount-1)
  })



  test('getMeshSubmeshCount', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const meshCount = g3d.getMeshCount()
    
    expect(await remoteG3d.getMeshSubmeshCount(-1)).toBe(g3d.getMeshSubmeshCount(-1))
    expect(await remoteG3d.getMeshSubmeshCount(0)).toBe(g3d.getMeshSubmeshCount(0))
    expect(await remoteG3d.getMeshSubmeshCount(1)).toBe(g3d.getMeshSubmeshCount(1))
    expect(await remoteG3d.getMeshSubmeshCount(meshCount-1)).toBe(g3d.getMeshSubmeshCount(meshCount-1))
    expect(await remoteG3d.getMeshSubmeshCount(meshCount)).toBe(g3d.getMeshSubmeshCount(meshCount))
  })

  test('getSubmeshIndexStart', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const submeshCount = g3d.getSubmeshCount()
    
    expect(await remoteG3d.getSubmeshIndexStart(-1)).toBe(g3d.getSubmeshIndexStart(-1))
    expect(await remoteG3d.getSubmeshIndexStart(0)).toBe(g3d.getSubmeshIndexStart(0))
    expect(await remoteG3d.getSubmeshIndexStart(1)).toBe(g3d.getSubmeshIndexStart(1))
    expect(await remoteG3d.getSubmeshIndexStart(submeshCount-1)).toBe(g3d.getSubmeshIndexStart(submeshCount-1))
    expect(await remoteG3d.getSubmeshIndexStart(submeshCount)).toBe(g3d.getSubmeshIndexStart(submeshCount))
  })

  
  test('getSubmeshIndexEnd', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const submeshCount = g3d.getSubmeshCount()
    
    expect(await remoteG3d.getSubmeshIndexEnd(-1)).toBe(g3d.getSubmeshIndexEnd(-1))
    expect(await remoteG3d.getSubmeshIndexEnd(0)).toBe(g3d.getSubmeshIndexEnd(0))
    expect(await remoteG3d.getSubmeshIndexEnd(1)).toBe(g3d.getSubmeshIndexEnd(1))
    expect(await remoteG3d.getSubmeshIndexEnd(submeshCount-1)).toBe(g3d.getSubmeshIndexEnd(submeshCount-1))
    expect(await remoteG3d.getSubmeshIndexEnd(submeshCount)).toBe(g3d.getSubmeshIndexEnd(submeshCount))
  })

  test('getSubmeshIndexCount', async () => {
    
    const [g3d, remoteG3d] = await loadBoth()
    const submeshCount = g3d.getSubmeshCount()
    
    expect(await remoteG3d.getSubmeshIndexCount(-1)).toBe(g3d.getSubmeshIndexCount(-1))
    expect(await remoteG3d.getSubmeshIndexCount(0)).toBe(g3d.getSubmeshIndexCount(0))
    expect(await remoteG3d.getSubmeshIndexCount(1)).toBe(g3d.getSubmeshIndexCount(1))
    expect(await remoteG3d.getSubmeshIndexCount(submeshCount-1)).toBe(g3d.getSubmeshIndexCount(submeshCount-1))
    expect(await remoteG3d.getSubmeshIndexCount(submeshCount)).toBe(g3d.getSubmeshIndexCount(submeshCount))
  })


  
  
})
*/

describe('slice', () => {

  /*
  test('size', async () =>{
    const g3d = await loadG3d()
    

    function compare(instance: number){
      const g = g3d.slice(instance)
      const mesh = g3d.getInstanceMesh(instance)
      const hasMesh = mesh >= 0
      const submeshCount = hasMesh ? g3d.getMeshSubmeshCount(mesh) : 0
      const vertexCount = hasMesh ? g3d.getMeshVertexCount(mesh) : 0
      const indexCount = hasMesh ? g3d.getMeshIndexCount(mesh): 0

      const mats = g3d.submeshMaterial.slice(g3d.getMeshSubmeshStart(mesh), g3d.getMeshSubmeshEnd(mesh))
      const unique = new Set<number>()
      mats.filter(m => m>=0).forEach(m => unique.add(m))
      const materialCount = unique.size

      expect(g?.instanceFlags.length).toBe(1)
      expect(g?.instanceMeshes.length).toBe(1)
      expect(g?.instanceTransforms.length).toBe(16)
      expect(g?.meshSubmeshes.length).toBe(hasMesh ? 1: 0)
      expect(g?.submeshIndexOffset.length).toBe(submeshCount)
      expect(g?.submeshMaterial.length).toBe(submeshCount)
      expect(g?.positions.length).toBe(vertexCount * 3)
      expect(g?.indices.length).toBe(indexCount)
      expect(g?.materialColors.length).toBe(materialCount * 4)
    }

    for(let i=428; i < g3d.getInstanceCount(); i++){
      console.log(i)
      compare(i)
    }
  })
*/
/*

    test('g3d.slice', async () =>{
      const g3d = await loadG3d()
      
      function compare(instance: number){
        const g = g3d.slice(instance)
        const mesh = g3d.getInstanceMesh(instance)
        const hasMesh = mesh >= 0
        const submeshCount = hasMesh ? g3d.getMeshSubmeshCount(mesh) : 0
        
        expect(g?.instanceFlags[0]).toBe(g3d.instanceFlags[instance])
        expect(g?.instanceMeshes[0]).toBe(hasMesh ? 0: -1)
        expect(g?.getInstanceMatrix(0)).toEqual(g3d.getInstanceMatrix(instance))
        expect(g.meshSubmeshes[0]).toBe(hasMesh ? 0: undefined)
        
        // Materials
        const mats = g3d.submeshMaterial.slice(g3d.getMeshSubmeshStart(mesh), g3d.getMeshSubmeshEnd(mesh))
        const gColors = Array.from(g.submeshMaterial).map(m => g.getMaterialColor(m))
        const g3dColors = Array.from(mats).map(m => g3d.getMaterialColor(m))
        expect(gColors).toEqual(g3dColors)

        // Indices per submeshes
        const meshStart = g3d.getMeshSubmeshStart(mesh)
        for(let i=0; i < submeshCount; i ++){
          const gIndices = g.indices.slice(g.getSubmeshIndexStart(i), g.getSubmeshIndexEnd(i))
          const g3dIndices = g3d.indices.slice(g3d.getSubmeshIndexStart(meshStart+i), g3d.getSubmeshIndexEnd(meshStart+i))
          expect(gIndices).toEqual(g3dIndices)
        }

        const indices = g3d.indices.slice(g3d.getMeshIndexStart(mesh),g3d.getMeshIndexEnd(mesh))
        expect(g.indices).toEqual(indices)

        const vertices = g3d.positions.slice(g3d.getMeshVertexStart(mesh)*3,g3d.getMeshVertexEnd(mesh)*3)

        expect(g.positions).toEqual(vertices)
      }

      for(let i=0; i < g3d.getInstanceCount(); i++){
        console.log(i)
        compare(i)
      }
    })
*/
    
    
   /*
    test('remote.toG3d', async () =>{
      const [g3d, remote] = await loadBoth()
      const r = await remote.toG3d()

      expect(r.instanceFlags).toEqual(g3d.instanceFlags)
      expect(r.instanceMeshes).toEqual(g3d.instanceMeshes)
      expect(r.instanceTransforms).toEqual(g3d.instanceTransforms)
      expect(r.meshSubmeshes).toEqual(g3d.meshSubmeshes)
      expect(r.submeshIndexOffset).toEqual(g3d.submeshIndexOffset)
      expect(r.submeshMaterial).toEqual(g3d.submeshMaterial)
      expect(r.positions).toEqual(g3d.positions)
      expect(r.indices).toEqual(g3d.indices)
      expect(r.materialColors).toEqual(g3d.materialColors)
    })  
*/
/*
  test('remote.slice', async () =>{
    const [g3d, remote] = await loadBoth()

    for(let i = 0; i < g3d.getInstanceCount(); i++ ){
      const r = await remote.slice(i)
      const g = await g3d.slice(i)
      console.log('compare ' + i)
      expect(g3dAreEqual(r, g)).toBeTruthy()
    }
  })  
  */

  /*
  test('remote.filter (each)', async () =>{
    const [g3d, remote] = await loadBoth()

    for(let i = 0; i < g3d.getInstanceCount(); i++ ){
      console.log(i)
      const value = await remote.filter([i])
      const expected = g3d.filter([i])

      expect(g3dAreEqual(value, expected)).toBeTruthy()
    }
  })
  */
  
  /*
  test('remote.filter (all)', async () =>{
    const [g3d, remote] = await loadBoth()
    const instances = Array.from(g3d.instanceMeshes.map((_,i) => i))
      const expected = g3d.filter(instances)
      const value = await remote.filter(instances)

      expect(g3dAreEqual(value, expected)).toBeTruthy()
  })  
*/

  test('remote.filter (all)', async () =>{
    const [g3d, remote] = await loadBoth()
    for(let i =0; i < 100; i++){
      const instances = Array.from(g3d.instanceMeshes.map((_,i) => i).filter((_) => randomInt(100) ===0))
      console.log(instances)
      const expected = g3d.filter(instances)
      const value = await remote.filter(instances)
      expect(g3dAreEqual(value, expected)).toBeTruthy()
    }
  })  

/*
  test('g3d.append', async () =>{
    const g3d = await loadG3d()

    function compare(r: G3d, g: G3d ){

      expect(r.instanceFlags).toEqual(g.instanceFlags)

      expect(r.instanceMeshes).toEqual(g.instanceMeshes)
      expect(r.instanceTransforms).toEqual(g.instanceTransforms)
      expect(r.meshSubmeshes).toEqual(g.meshSubmeshes)
      expect(r.submeshIndexOffset).toEqual(g.submeshIndexOffset)
      expect(r.submeshMaterial).toEqual(g.submeshMaterial)
      expect(r.materialColors).toEqual(g.materialColors)
      expect(r.positions).toEqual(g.positions)
      expect(r.indices).toEqual(g.indices)
    }

    for(let i = 0; i < g3d.getInstanceCount(); i++ ){
      console.log(i)
      const s1 = g3d.slice(i)
      const merge = s1.append(s1)
      const merge0 = merge.slice(0)
      const merge1 = merge.slice(1)
      compare(merge0, s1)
      compare(merge1, s1)
    }
  })  
*/
  /*
  test('g3d.filter (slice)', async () =>{
    const g3d = await loadG3d()

    function compare(value: G3d, expected: G3d ){

      expect(value.instanceFlags).toEqual(expected.instanceFlags)

      expect(value.instanceMeshes).toEqual(expected.instanceMeshes)
      expect(value.instanceTransforms).toEqual(expected.instanceTransforms)

      expect(value.meshSubmeshes).toEqual(expected.meshSubmeshes)
      expect(value.submeshIndexOffset).toEqual(expected.submeshIndexOffset)

      expect(value.submeshMaterial).toEqual(expected.submeshMaterial)
      expect(value.materialColors).toEqual(expected.materialColors)
      expect(value.positions).toEqual(expected.positions)
      expect(value.indices).toEqual(expected.indices)
    }
  
    for(let i =2; i < g3d.getInstanceCount(); i ++){
      console.log(i)
      const filter = g3d.filter([i])
      compare(filter, g3d.slice(i))
    }
  })
  */
/*
  test('g3d.uses_all_material', async () =>{
    const g3d = await loadG3d()
    const set = new Set(g3d.submeshMaterial)
    for(let i = 0; i < g3d.getMaterialCount(); i++){
      expect(set.has(i)).toBeTruthy()
    }
  })

  test('g3d.uses_all_meshes', async () =>{
    const g3d = await loadG3d()
    const set = new Set(g3d.instanceMeshes)
    for(let i = 0; i < g3d.getMeshCount(); i++){
      expect(set.has(i)).toBeTruthy()
    }
  })
*/
/*
  test('g3d.equals', async () =>{
    const g3d = await loadG3d()
    for(let i=0; i < g3d.getInstanceCount(); i ++){
      expect(instanceAreEqual(g3d, i, g3d, i)).toBeTruthy()
    }
  })
  */
  /*
  test('g3d.slice equals', async () =>{
    const g3d = await loadG3d()
    
    for(let i=2; i < g3d.getInstanceCount(); i ++){
      const slice = g3d.slice(i)
      console.log(i)

      expect(instanceAreEqual(g3d, i, slice, 0)).toBeTruthy()
    }
  })
  */
/*
  test('g3d.equals (all)', async () =>{
    const g3d = await loadG3d()
    expect(g3dAreEqual(g3d, g3d)).toBeTruthy()
  })
  */
/*
  test('g3d.filter (each)', async () => {
    const g3d = await loadG3d()

    for(let i = 0; i < g3d.getInstanceCount() ; i++){
      const filter = g3d.filter3([i])
      const slice = g3d.slice(i)
      expect(g3dAreEqual(filter, slice)).toBeTruthy()
    }
  })

  test('g3d.filter (all)', async () => {
    const g3d = await loadG3d()

    const instances = g3d.instanceMeshes.map((_,i) => i)
    const filter = g3d.filter3([...instances])
    expect(g3dAreEqual(filter, g3d)).toBeTruthy()
  })
  */
  

  /*
  test('g3d.filter (2)', async () =>{
    const g3d = await loadG3d()

    function compare(value: G3d, expected: G3d ){

      expect(value.instanceFlags).toEqual(expected.instanceFlags)

      console.log(value.instanceMeshes)
      console.log(expected.instanceMeshes)

      expect(value.instanceMeshes).toEqual(expected.instanceMeshes)
      expect(value.instanceTransforms).toEqual(expected.instanceTransforms)

      expect(value.meshSubmeshes).toEqual(expected.meshSubmeshes)
      expect(value.submeshIndexOffset).toEqual(expected.submeshIndexOffset)

      // Test colors and materials together.
      const valueColors = Array.from(value.submeshMaterial).map(m => value.getMaterialColor(m))
      const expectedColors = Array.from(expected.submeshMaterial).map(m => expected.getMaterialColor(m))
      expect(valueColors).toEqual(expectedColors)

      expect(value.positions).toEqual(expected.positions)
      expect(value.indices).toEqual(expected.indices)
    }
  
    
    for(let i =0; i < g3d.getInstanceCount()-1; i ++){
      for(let j = i +1; j < g3d.getInstanceCount() ; j ++){
        if(randomInt(100) !== 0) continue
        console.log([i, j])
        
        const filter = g3d.filter([i, j])
        compare(filter, g3d.slice(i).append(g3d.slice(j)))
      }
    }
    
  })
  */
})

function g3dAreEqual(self: G3d, other: G3d){
  if (self.instanceMeshes.length !== other.instanceMeshes.length){
    console.log('instances count !=')
    return false
  }
  for(let i =0; i < self.instanceMeshes.length; i++){
    
    if(!instanceAreEqual(self, i, other, i)){
      console.log('instance != ' + i)
      return false
    }
  }
  return true
}


function instanceAreEqual(self: G3d, instance: number, other:G3d, otherInstance: number){
  const selfFlag = self.instanceFlags[instance]
  const otherFlag = other.instanceFlags[otherInstance]
  if(selfFlag !== otherFlag){
    console.log('flags !=')
    return false
  }
  for(let i=0; i < 16; i++){
    if(self.instanceTransforms[instance *16 + i] !== other.instanceTransforms[otherInstance *16 + i]){
      console.log('transform !=')
      return false
    }
  }
  const selfMesh = self.instanceMeshes[instance]
  const otherMesh = other.instanceMeshes[otherInstance]
  return meshAreEqual(self, selfMesh, other, otherMesh)
}

function meshAreEqual(self: G3d, mesh: number, other:G3d, otherMesh: number){
  if(mesh === -1 && otherMesh === -1){
    return true
  }
  if(mesh === -1 || otherMesh === -1){
    return false
  }

  const selfSubStart = self.getMeshSubmeshStart(mesh)
  const selfSubEnd = self.getMeshSubmeshEnd(mesh)
  const selfCount = selfSubEnd - selfSubStart

  const otherSubStart = other.getMeshSubmeshStart(otherMesh)
  const otherSubEnd = other.getMeshSubmeshEnd(otherMesh)
  const otherCount = otherSubEnd - otherSubStart

  if(selfCount !== otherCount){
    console.log([mesh,otherMesh])
    console.log([selfCount,otherCount])
    console.log('SubCount !=')
    return false
  }
  for(let i = 0 ; i < selfCount; i ++){
    const selfSub = selfSubStart + i
    const otherSub = otherSubStart + i
    if(!submeshAreEqual(self, mesh, selfSub, other, otherMesh, otherSub)){
      console.log('Sub !=')
      return false
    }
  }
  return true
}

function submeshAreEqual(self: G3d, mesh: number, submesh: number, other:G3d, otherMesh: number, otherSubmesh: number){
  if(!submeshMaterialIsEqual(self, submesh, other, otherSubmesh)){
    console.log('mat !=')
    return false
  }
  if(!submeshGeometryIsEqual(self, mesh, submesh, other, otherMesh, otherSubmesh)){
    console.log('sub !=')
    return false
  }
  return true
}

function submeshMaterialIsEqual(self: G3d, submesh: number, other:G3d, otherSubmesh: number){
  const selfColor = self.getSubmeshColor(submesh)
  const otherColor = other.getSubmeshColor(otherSubmesh)
  if(selfColor.length !== otherColor.length){
    console.log('mat length !=')
    return false
  }
  for(let i =0 ; i < selfColor.length; i ++){
    if(selfColor[i] !== otherColor[i]){
      console.log('color !=')
      console.log(selfColor)
      console.log(otherColor)
      return false
    }
  }
  return true
}

function submeshGeometryIsEqual(self: G3d, mesh: number, submesh: number, other:G3d, otherMesh: number, otherSubmesh: number){
  const selfIndexStart = self.getSubmeshIndexStart(submesh)
  const selfIndexEnd = self.getSubmeshIndexEnd(submesh)
  const selfIndexCount = selfIndexEnd - selfIndexStart

  const otherIndexStart = other.getSubmeshIndexStart(otherSubmesh)
  const otherIndexEnd = other.getSubmeshIndexEnd(otherSubmesh)
  const otherIndexCount = otherIndexEnd - otherIndexStart

  const selfVertexStart = self.meshVertexOffsets[mesh]
  const otherVertexStart = other.meshVertexOffsets[otherMesh]

  if(selfIndexCount !== otherIndexCount){
    console.log('index count !=')
    return false
  }
  for(let i =0; i < selfIndexCount; i++){
    const selfLocalVertex = self.indices[selfIndexStart + i] 
    const otherLocalVertex = other.indices[otherIndexStart + i]
    
    if (selfLocalVertex !== otherLocalVertex){
      console.log('vertex !=')
      return false
    }
    
    const selfVertex = selfLocalVertex  + selfVertexStart
    const otherVertex = otherLocalVertex  + otherVertexStart
    for(let p=0; p<3; p++){
      
      const selfPosition = self.positions[selfVertex*3 + p]
      const otherPosition = other.positions[otherVertex*3 + p]
      if (selfPosition !== otherPosition){
        console.log([mesh, submesh, selfLocalVertex, selfVertexStart, selfVertex, selfPosition])
        console.log([otherMesh, otherSubmesh, otherLocalVertex, otherVertexStart, otherVertex, otherPosition])
        console.log('position !=')
        return false
      }
    }
  }
  return true
}

