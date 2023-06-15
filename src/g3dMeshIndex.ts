/**
 * @module vim-ts
 */

import { AbstractG3d } from './abstractG3d'
import { BFast } from './bfast'
import { MeshSection } from './g3d'
import { G3dBuilderCursor } from './g3dBuilder'

/**
 * See https://github.com/vimaec/vim#vim-geometry-attributes
 */
export class MeshIndexAttributes {

  static instanceFiles = 'g3d:instance:file:0:int32:1'
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

    function getArray(attribute: string){
      return g3d.findAttribute(
        attribute
        )?.data as Int32Array
    }

    return new G3dMeshIndex(
      g3d,
      getArray(MeshIndexAttributes.instanceFiles),
      getArray(MeshIndexAttributes.meshInstanceCounts),
      getArray(MeshIndexAttributes.meshMaterialCounts),

      getArray(MeshIndexAttributes.meshSubmeshCounts),
      getArray(MeshIndexAttributes.meshIndexCounts),
      getArray(MeshIndexAttributes.meshVertexCounts),

      getArray(MeshIndexAttributes.meshOpaqueSubmeshCount),
      getArray(MeshIndexAttributes.meshOpaqueIndexCount),
      getArray(MeshIndexAttributes.meshOpaqueVertexCount),
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

  getMeshOffsets(meshes: number[], section: MeshSection){
    return G3dMeshOffsets.fromIndexMeshes(this, meshes, section)
  }

  getMergedMeshOffsets(meshes: number[], section: MeshSection){
    return G3dMeshOffsets.fromIndexMeshes(this, meshes, section, true)
  }

  getAttributeCounts(meshes: number[], section: MeshSection = 'all', merge = false){

    let instanceCount = 0
    let submeshCount = 0
    let indexCount = 0
    let vertexCount = 0
    let materialCount = 0

    for(let i=0; i < meshes.length; i++){
      const m = meshes[i]
      const submeshes = this.getSubmeshCount(m, section)
      const indices =  this.getIndexCount(m, section)
      const vertice = this.getVertexCount(m, section)

      instanceCount += this.meshInstanceCounts[m]
      submeshCount += submeshes * (merge ? this.meshInstanceCounts[m] : 1)
      indexCount += indices * (merge ? this.meshInstanceCounts[m] : 1)
      vertexCount += vertice * (merge ? this.meshInstanceCounts[m] : 1)
      materialCount += this.meshMaterialCounts[m]
    }

    return {
      instanceCount,
      meshCount : meshes.length,
      submeshCount,
      indexCount,
      vertexCount,
      materialCount
    }
  }
}

export class G3dMeshOffsets {
  instanceOffsets: Int32Array
  submeshOffsets: Int32Array
  indexOffsets: Int32Array
  vertexOffsets: Int32Array
  materialOffsets: Int32Array

  constructor(
    instanceOffsets: Int32Array,
    submeshOffsets: Int32Array,
    indexOffsets : Int32Array,
    vertexOffsets: Int32Array, 
    materialOffsets : Int32Array){

    this.instanceOffsets = instanceOffsets
    this.submeshOffsets = submeshOffsets
    this.indexOffsets = indexOffsets
    this.vertexOffsets = vertexOffsets
    this.materialOffsets = materialOffsets
  }

  static fromIndexMeshes(index: G3dMeshIndex, meshes: number[], section: MeshSection, merge = false){
    function computeOffsets(getter: (i: number) => number, multiplier? : Int32Array){
      const offsets = new Int32Array(meshes.length)
  
      for(let i=1; i < offsets.length; i ++){
        var m = meshes[i-1]
        const v = getter(m) * (multiplier?.[m] ?? 1)
        offsets[i] = offsets[i-1] + v
      }
      return offsets
    }

    return new G3dMeshOffsets(
      computeOffsets((i) => index.meshInstanceCounts[i]),
      computeOffsets((i) => index.getSubmeshCount(i, section), merge ? index.meshInstanceCounts: undefined),
      computeOffsets((i) => index.getIndexCount(i, section), merge ? index.meshInstanceCounts: undefined),
      computeOffsets((i) => index.getVertexCount(i, section), merge ? index.meshInstanceCounts : undefined),
      computeOffsets((i) => index.meshMaterialCounts[i])
    )
  }
  
  getCursor(mesh: number){
    return new G3dBuilderCursor(
      this.instanceOffsets[mesh],
      mesh,
      this.submeshOffsets[mesh],
      this.indexOffsets[mesh],
      this.vertexOffsets[mesh],
      this.materialOffsets[mesh]
    )
  }
}

