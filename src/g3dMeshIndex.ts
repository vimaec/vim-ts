/**
 * @module vim-ts
 */

import { AbstractG3d } from './abstractG3d'
import { BFast } from './bfast'
import { MeshSection } from './g3d'

export type FilterMode = undefined | 'mesh' | 'instance' | 'group' | 'tag'

/**
 * See https://github.com/vimaec/vim#vim-geometry-attributes
 */
export class MeshIndexAttributes {

  static instanceFiles = 'g3d:instance:file:0:int32:1'
  static instanceIndices = 'g3d:instance:index:0:int32:1'
  static instanceNodes = 'g3d:instance:node:0:int32:1'
  static instanceGroups = 'g3d:instance:group:0:int32:1'
  static instanceTags = 'g3d:instance:tag:0:int64:1'

  static meshInstanceCounts = 'g3d:mesh:instancecount:0:int32:1'
  static meshMaterialCounts = 'g3d:mesh:materialcount:0:int32:1'
  
  static meshSubmeshCounts = 'g3d:mesh:submeshcount:0:int32:1'
  static meshIndexCounts = 'g3d:mesh:indexcount:0:int32:1'
  static meshVertexCounts = 'g3d:mesh:vertexcount:0:int32:1'

  static meshOpaqueSubmeshCount = "g3d:mesh:opaquesubmeshcount:0:int32:1"
  static meshOpaqueIndexCount = "g3d:mesh:opaqueindexcount:0:int32:1"
  static meshOpaqueVertexCount = "g3d:mesh:opaquevertexcount:0:int32:1"

  static all = [
    MeshIndexAttributes.instanceFiles,
    MeshIndexAttributes.instanceIndices,
    MeshIndexAttributes.instanceNodes,
    MeshIndexAttributes.instanceGroups,
    MeshIndexAttributes.instanceTags,

    MeshIndexAttributes.meshInstanceCounts,
    MeshIndexAttributes.meshMaterialCounts,

    MeshIndexAttributes.meshSubmeshCounts,
    MeshIndexAttributes.meshIndexCounts,
    MeshIndexAttributes.meshVertexCounts,

    MeshIndexAttributes.meshOpaqueSubmeshCount,
    MeshIndexAttributes.meshOpaqueIndexCount,
    MeshIndexAttributes.meshOpaqueVertexCount,
  ]
}

/**
 * G3D is a simple, efficient, generic binary format for storing and transmitting geometry.
 * The G3D format is designed to be used either as a serialization format or as an in-memory data structure.
 * A G3d with specific attributes according to the VIM format specification.
 * See https://github.com/vimaec/vim#vim-geometry-attributes for the vim specification.
 * See https://github.com/vimaec/g3d for the g3d specification.
 */
export class G3dMeshIndex {
  rawG3d: AbstractG3d

  instanceFiles: Int32Array
  instanceIndices: Int32Array
  instanceNodes: Int32Array
  instanceGroups: Int32Array
  instanceTags : BigInt64Array

  meshInstanceCounts: Int32Array
  meshMaterialCounts: Int32Array

  meshSubmeshCounts: Int32Array
  meshIndexCounts: Int32Array
  meshVertexCounts: Int32Array

  meshOpaqueSubmeshCounts: Int32Array
  meshOpaqueIndexCounts: Int32Array
  meshOpaqueVertexCounts: Int32Array

  constructor(
    rawG3d: AbstractG3d,
    instanceFiles: Int32Array,
    instanceIndices: Int32Array,
    instanceNodes: Int32Array,
    instanceGroups: Int32Array,
    instanceTags: BigInt64Array,

    meshInstanceCounts: Int32Array,
    meshMaterialCounts : Int32Array,

    meshSubmeshCounts: Int32Array,
    meshIndexCounts : Int32Array,
    meshVertexCounts: Int32Array, 
    
    meshOpaqueSubmeshCounts: Int32Array,
    meshOpaqueIndexCounts: Int32Array,
    meshOpaqueVertexCounts: Int32Array,
    ){

    this.rawG3d = rawG3d

    this.instanceFiles = instanceFiles
    this.instanceIndices = instanceIndices
    this.instanceNodes = instanceNodes
    this.instanceGroups = instanceGroups
    this.instanceTags =  instanceTags

    this.meshInstanceCounts = meshInstanceCounts
    this.meshSubmeshCounts = meshSubmeshCounts

    this.meshIndexCounts = meshIndexCounts
    this.meshVertexCounts = meshVertexCounts
    this.meshMaterialCounts = meshMaterialCounts

    this.meshOpaqueSubmeshCounts = meshOpaqueSubmeshCounts
    this.meshOpaqueIndexCounts = meshOpaqueIndexCounts
    this.meshOpaqueVertexCounts = meshOpaqueVertexCounts
  }

  static createFromAbstract(g3d: AbstractG3d) {

    function getArray<T>(attribute: string){
      return g3d.findAttribute(
        attribute
        )?.data as T
    }

    return new G3dMeshIndex(
      g3d,
      getArray<Int32Array>(MeshIndexAttributes.instanceFiles),
      getArray<Int32Array>(MeshIndexAttributes.instanceIndices),
      getArray<Int32Array>(MeshIndexAttributes.instanceNodes),
      getArray<Int32Array>(MeshIndexAttributes.instanceGroups),
      getArray<BigInt64Array>(MeshIndexAttributes.instanceTags),

      getArray<Int32Array>(MeshIndexAttributes.meshInstanceCounts),
      getArray<Int32Array>(MeshIndexAttributes.meshMaterialCounts),

      getArray<Int32Array>(MeshIndexAttributes.meshSubmeshCounts),
      getArray<Int32Array>(MeshIndexAttributes.meshIndexCounts),
      getArray<Int32Array>(MeshIndexAttributes.meshVertexCounts),

      getArray<Int32Array>(MeshIndexAttributes.meshOpaqueSubmeshCount),
      getArray<Int32Array>(MeshIndexAttributes.meshOpaqueIndexCount),
      getArray<Int32Array>(MeshIndexAttributes.meshOpaqueVertexCount),
    )
  }

  static async createFromPath (path: string) {
    const f = await fetch(path)
    const buffer = await f.arrayBuffer()
    const bfast = new BFast(buffer)
    return this.createFromBfast(bfast)
  }

  static async createFromBfast (bfast: BFast) {
    const g3d = await AbstractG3d.createFromBfast(bfast, MeshIndexAttributes.all)
    return G3dMeshIndex.createFromAbstract(g3d)
  }

  getMeshCount() {
    return this.meshInstanceCounts.length
  }

  getSubmeshCount(mesh:number, section: MeshSection){
    const all = this.meshSubmeshCounts[mesh]
    if(section === 'all') return all;
    const opaque = this.meshOpaqueSubmeshCounts[mesh]
    return section === 'opaque' ? opaque : all - opaque
  }

  getIndexCount(mesh: number, section: MeshSection){
    const all = this.meshIndexCounts[mesh]
    if(section === 'all') return all;
    const opaque = this.meshOpaqueIndexCounts[mesh]
    return section === 'opaque' ? opaque : all - opaque
  }

  getVertexCount(mesh:number, section: MeshSection){
    const all = this.meshVertexCounts[mesh]
    if(section === 'all') return all;
    const opaque = this.meshOpaqueVertexCounts[mesh]
      return section === 'opaque' ? opaque : all - opaque
    }

  filter(mode: FilterMode, filter: number[]){
    if(filter === undefined || mode === undefined){
      return this.getAllMeshes()
    }
    if(mode === 'instance'){
      return this.getInstanceMeshes(filter)
    }
    if(mode === 'tag' || mode === 'group'){
      throw new Error("Filter Mode Not implemented")
    }
  }

  private getAllMeshes(){
    const meshes = new Array(this.getMeshCount())
    for (let m=0; m < meshes.length; m++)
    {
      meshes[m] = m
    }
    return new G3dMeshIndexSubset(this, meshes)
  }

  private getInstanceMeshes(instances: number[]){
    const set = new Set(instances)
    const meshes = new Array<number>()
    const map = new Map<number, number[]>()
    for(let i=0; i < this.instanceNodes.length; i ++){
      const node = this.instanceNodes[i]
      if(set.has(node)){
        const mesh = this.instanceFiles[i]
        const index = this.instanceIndices[i]

        if(!map.has(mesh)){
          meshes.push(mesh)
          map.set(mesh, [index])
        }
        else{
          map.get(mesh).push(index)
        }
      }
    }
    return new G3dMeshIndexSubset(this, meshes, map)
  }

  getAttributeCounts(meshes: number[], section: MeshSection = 'all', multiplier: (m: number) => number){

    const counts = new G3dMeshCounts()
    counts.meshes = meshes.length

    for(let i=0; i < meshes.length; i++){
      const m = meshes[i]
      const submeshCount = this.getSubmeshCount(m, section)
      const indexCount =  this.getIndexCount(m, section)
      const vertexCount = this.getVertexCount(m, section)

      counts.instances += this.meshInstanceCounts[m]
      counts.submeshes += submeshCount * multiplier(m)
      counts.indices += indexCount * multiplier(m)
      counts.vertices += vertexCount * multiplier(m)
      counts.materials += this.meshMaterialCounts[m]
    }

    return counts
  }
}

export class G3dMeshIndexSubset{
  index: G3dMeshIndex
  meshes: number[]
  meshToInstances : Map<number, number[]>

  constructor(index: G3dMeshIndex, meshes: number[], meshToInstances? : Map<number, number[]>){
    this.index = index
    this.meshes = meshes
    this.meshToInstances = meshToInstances
  }

  getMeshInstanceCount(mesh: number){
    return this.meshToInstances ? this.meshToInstances.get(mesh)?.length : this.index.meshInstanceCounts[mesh] 
  }

  getMeshInstance(mesh: number, index:number){
    return this.meshToInstances ? this.meshToInstances.get(mesh)[index] : index 
  }

  getOffsets(section: MeshSection, merge:boolean){
    return new G3dMeshOffsets(this, section, merge)
  }
}

export class G3dMeshCounts{
  instances : number = 0
  meshes: number = 0
  submeshes : number = 0
  indices : number = 0
  vertices : number = 0
  materials : number = 0
}

export class G3dMeshOffsets {
  // inputs
  subset: G3dMeshIndexSubset
  section: MeshSection
  merge : boolean

  // computed
  counts : G3dMeshCounts
  instanceOffsets: Int32Array
  submeshOffsets: Int32Array
  indexOffsets: Int32Array
  vertexOffsets: Int32Array
  materialOffsets: Int32Array

  constructor(
    subset: G3dMeshIndexSubset,
    section: MeshSection,
    merge : boolean
    ){

    this.subset = subset
    this.section = section
    this.merge = merge
   
    this.counts = subset.index.getAttributeCounts(subset.meshes, section, (m) => subset.getMeshInstanceCount(m))
    this.instanceOffsets = this.computeOffsets((m) => subset.index.meshInstanceCounts[m]),
    this.submeshOffsets = this.computeOffsets((m) => subset.index.getSubmeshCount(m, section) * subset.getMeshInstanceCount(m)),
    this.indexOffsets = this.computeOffsets((m) => subset.index.getIndexCount(m, section) * subset.getMeshInstanceCount(m)),
    this.vertexOffsets = this.computeOffsets((m) => subset.index.getVertexCount(m, section) * subset.getMeshInstanceCount(m)),
    this.materialOffsets = this.computeOffsets((m) => subset.index.meshMaterialCounts[m])
  }

  getInstanceCount(mesh: number){
    if(!this.merge) return 1
    return this.subset.getMeshInstanceCount(mesh)
  }

  getInstance(mesh: number, index: number){
    return this.subset.getMeshInstance(mesh, index)
  }

  getMesh(mesh: number){
    return this.subset.meshes[mesh]
  }

  private computeOffsets(getter: (mesh: number) => number){
    const offsets = new Int32Array(this.subset.meshes.length)

    for(let i=1; i < offsets.length; i ++){
      var m = this.subset.meshes[i-1]
      offsets[i] = offsets[i-1] + getter(m)
    }
    return offsets
  }
}
