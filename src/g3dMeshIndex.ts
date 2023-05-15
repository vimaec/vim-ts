/**
 * @module vim-ts
 */

import { AbstractG3d } from './abstractG3d'
import { BFast } from './bfast'
import { G3dBuilderCursor } from './g3dBuilder'

/**
 * See https://github.com/vimaec/vim#vim-geometry-attributes
 */
export class MeshIndexAttributes {

  static instanceCounts = 'g3d:instance:count:0:int32:1'
  static submeshCounts = 'g3d:submesh:count:0:int32:1'
  static indexCounts = 'g3d:corner:count:0:int32:1'
  static vertexCounts = 'g3d:vertex:count:0:int32:1'
  static materialCounts = 'g3d:material:count:0:int32:1'

  static all = [
    MeshIndexAttributes.instanceCounts,
    MeshIndexAttributes.submeshCounts,
    MeshIndexAttributes.vertexCounts,
    MeshIndexAttributes.indexCounts,
    MeshIndexAttributes.materialCounts,
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

  instanceCounts: Int32Array
  submeshCounts: Int32Array
  indexCounts: Int32Array
  vertexCounts: Int32Array
  materialCounts: Int32Array

  constructor(
    instanceCounts: Int32Array,
    submeshCounts: Int32Array,
    indexCounts : Int32Array,
    vertexCounts: Int32Array, 
    materialCounts : Int32Array){

    this.instanceCounts = instanceCounts
    this.submeshCounts = submeshCounts
    this.indexCounts = indexCounts
    this.vertexCounts = vertexCounts
    this.materialCounts = materialCounts
  }

  static createFromAbstract(g3d: AbstractG3d) {

    const instanceCounts = g3d.findAttribute(
      MeshIndexAttributes.instanceCounts
      )?.data as Int32Array

    const submeshCounts = g3d.findAttribute(
      MeshIndexAttributes.submeshCounts
      )?.data as Int32Array

    const indexCounts = g3d.findAttribute(
      MeshIndexAttributes.indexCounts
      )?.data as Int32Array

    const vertexCounts = g3d.findAttribute(
      MeshIndexAttributes.vertexCounts
      )?.data as Int32Array

    const materialCounts = g3d.findAttribute(
      MeshIndexAttributes.materialCounts
      )?.data as Int32Array
        
    const result = new G3dMeshIndex(
      instanceCounts,
      submeshCounts,
      indexCounts,
      vertexCounts,
      materialCounts,
    )
    result.rawG3d = g3d

    return result
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

  rangeOffsets(start = 0, end? : number){
    return G3dMeshOffsets.fromRange(this, start, end)
  }

  getTotalInstanceCount(start = 0, end = this.instanceCounts.length){
    let result = 0
    for(let i=start; i < end; i++){
      result += this.instanceCounts[i]
    }
    return result
  }

  getTotalMeshCount(start = 0, end = this.instanceCounts.length){
    return end - start
  }

  getTotalSubmeshCount(start = 0, end = this.submeshCounts.length){
    let result = 0
    for(let i=start; i < end; i++){
      result += this.submeshCounts[i]
    }
    return result
  }

  getTotalIndexCount(start = 0, end = this.indexCounts.length){
    let result = 0
    for(let i=start; i < end; i++){
      result += this.indexCounts[i]
    }
    return result
  }

  getTotalVertexCount(start = 0, end = this.vertexCounts.length){
    let result = 0
    for(let i=start; i < end; i++){
      result += this.vertexCounts[i]
    }
    return result
  }

  getTotalMaterialCount(start = 0, end = this.materialCounts.length){
    let result = 0
    for(let i=start; i < end; i++){
      result += this.materialCounts[i]
    }
    return result
  }
}

/**
 * G3D is a simple, efficient, generic binary format for storing and transmitting geometry.
 * The G3D format is designed to be used either as a serialization format or as an in-memory data structure.
 * A G3d with specific attributes according to the VIM format specification.
 * See https://github.com/vimaec/vim#vim-geometry-attributes for the vim specification.
 * See https://github.com/vimaec/g3d for the g3d specification.
 */
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

  static fromRange(index: G3dMeshIndex, start = 0, end?: number){

    function computeOffsets(array: Int32Array){
      end = end ?? array.length
      const offsets = new Int32Array(end-start)
  
      for(let i=1; i < offsets.length; i ++){
        offsets[i] = offsets[i-1] + array[start + i -1]
      }
      return offsets
    }

    return new G3dMeshOffsets(
      computeOffsets(index.instanceCounts),
      computeOffsets(index.submeshCounts),
      computeOffsets(index.indexCounts),
      computeOffsets(index.vertexCounts),
      computeOffsets(index.materialCounts)
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

