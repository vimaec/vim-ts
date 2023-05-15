/**
 * @module vim-ts
 */

import { AbstractG3d } from './abstractG3d'
import { BFast } from './bfast'
import { G3d, MeshSection } from './g3d'

/**
 * See https://github.com/vimaec/vim#vim-geometry-attributes
 */
export class MeshAttributes {

  static instanceNodes = 'g3d:instance:node:0:int32:1'
  static instanceTransforms = 'g3d:instance:transform:0:float32:16'
  static instanceFlags = 'g3d:instance:flags:0:uint16:1'
  static submeshIndexOffsets = 'g3d:submesh:indexoffset:0:int32:1'
  static submeshMaterials = 'g3d:submesh:material:0:int32:1'
  static positions = 'g3d:vertex:position:0:float32:3'
  static indices = 'g3d:corner:index:0:int32:1'
  static materialColors = 'g3d:material:color:0:float32:4'

  static all = [
    MeshAttributes.instanceNodes,
    MeshAttributes.instanceTransforms,
    MeshAttributes.instanceFlags,
    MeshAttributes.submeshIndexOffsets,
    MeshAttributes.submeshMaterials,
    MeshAttributes.positions,
    MeshAttributes.indices,
    MeshAttributes.materialColors
  ]
}

/**
 * G3D is a simple, efficient, generic binary format for storing and transmitting geometry.
 * The G3D format is designed to be used either as a serialization format or as an in-memory data structure.
 * A G3d with specific attributes according to the VIM format specification.
 * See https://github.com/vimaec/vim#vim-geometry-attributes for the vim specification.
 * See https://github.com/vimaec/g3d for the g3d specification.
 */
export class G3dMesh {
  rawG3d: AbstractG3d

  instanceNodes: Int32Array
  instanceTransforms: Float32Array
  instanceFlags: Uint16Array

  submeshIndexOffset: Int32Array
  submeshMaterial: Int32Array

  positions: Float32Array
  indices: Uint32Array

  materialColors: Float32Array

  // computed
  opaqueCount: number

  static MATRIX_SIZE = 16
  static COLOR_SIZE = 4
  static POSITION_SIZE = 3
  /**
   * Opaque white
   */
  DEFAULT_COLOR = new Float32Array([1, 1, 1, 1])

  constructor(
    instanceNodes: Int32Array | undefined,
    instanceTransforms: Float32Array,
    instanceFlags: Uint16Array | undefined, 
    submeshIndexOffsets : Int32Array,
    submeshMaterials : Int32Array,
    indices: Int32Array | Uint32Array,
    positions: Float32Array,
    materialColors: Float32Array){

    this.instanceNodes = instanceNodes
    this.instanceTransforms = instanceTransforms
    this.instanceFlags = instanceFlags

    this.submeshIndexOffset = submeshIndexOffsets
    this.submeshMaterial = submeshMaterials
    this.indices = indices instanceof Uint32Array ? indices : new Uint32Array(indices.buffer)
    this.positions = positions
    this.materialColors = materialColors

    if(this.instanceFlags === undefined){
      this.instanceFlags = new Uint16Array(this.instanceNodes.length)
    }

    this.opaqueCount = this.computeMeshOpaqueCount()
  }

  static createFromAbstract(g3d: AbstractG3d) {

    const instanceNodes = g3d.findAttribute(
      MeshAttributes.instanceNodes
      )?.data as Int32Array


    const instanceTransforms = g3d.findAttribute(
      MeshAttributes.instanceTransforms
    )?.data as Float32Array

    const instanceFlags =
      (g3d.findAttribute(MeshAttributes.instanceFlags)?.data as Uint16Array) ??
      new Uint16Array(instanceNodes.length)

    const submeshIndexOffset = g3d.findAttribute(
      MeshAttributes.submeshIndexOffsets
    )?.data as Int32Array
  
    const submeshMaterial = g3d.findAttribute(MeshAttributes.submeshMaterials)
      ?.data as Int32Array

    const indices = g3d.findAttribute(MeshAttributes.indices)?.data as Int32Array

    const positions = g3d.findAttribute(MeshAttributes.positions)
      ?.data as Float32Array

    const materialColors = g3d.findAttribute(MeshAttributes.materialColors)
      ?.data as Float32Array

    const result = new G3dMesh(
      instanceNodes,
      instanceTransforms,
      instanceFlags,
      submeshIndexOffset,
      submeshMaterial,
      indices,
      positions,
      materialColors
    )
    result.rawG3d = g3d

    return result
  }

  static async createFromPath (path: string) {
    const f = await fetch(path)
    const buffer = await f.arrayBuffer()
    var g3d = this.createFromBuffer(buffer)

    return g3d
  }

  static async createFromBuffer (buffer: ArrayBuffer) {
    const bfast = new BFast(buffer)
    return this.createFromBfast(bfast)
  }

  static async createFromBfast (bfast: BFast) {
    const g3d = await AbstractG3d.createFromBfast(bfast, MeshAttributes.all)
    return G3dMesh.createFromAbstract(g3d)
  }

  toG3d(){
    return new G3d(
      new Int32Array(this.getInstanceCount()),
      this.instanceFlags,
      this.instanceTransforms,
      this.instanceNodes,
      new Int32Array(1).fill(0),
      this.submeshIndexOffset,
      this.submeshMaterial,
      this.indices,
      this.positions,
      this.materialColors
    )
  }

  static allocate(
    instanceCount: number,
    submeshCont: number, 
    indexCount: number, 
    vertexCount: number,
    materialCount: number
  ){
      var g3d = new G3dMesh(
        new Int32Array(instanceCount),
        new Float32Array(instanceCount * G3dMesh.MATRIX_SIZE),
        new Uint16Array(instanceCount),
        new Int32Array(submeshCont),
        new Int32Array(submeshCont),
        new Uint32Array(indexCount), 
        new Float32Array(vertexCount * G3dMesh.POSITION_SIZE), 
        new Float32Array(materialCount * G3dMesh.COLOR_SIZE)
      )
    return g3d
  }

  insert(g3d: G3dMesh,
    instanceStart: number,
    submesStart: number, 
    indexStart: number, 
    vertexStart: number,
    materialStart: number
  ){
    this.instanceNodes.set(g3d.instanceNodes, instanceStart)
    this.instanceTransforms.set(g3d.instanceTransforms, instanceStart * G3dMesh.MATRIX_SIZE)
    this.instanceFlags.set(g3d.instanceFlags, instanceStart)

    this.submeshIndexOffset.set(g3d.submeshIndexOffset, submesStart)
    this.submeshMaterial.set(g3d.submeshMaterial, submesStart)

    this.indices.set(g3d.indices, indexStart)
    this.positions.set(g3d.positions, vertexStart)
    
    this.materialColors.set(g3d.materialColors, materialStart * G3dMesh.COLOR_SIZE)
  }

  /**
   * Computes an array where true if any of the materials used by a mesh has transparency.
   */
  private computeMeshOpaqueCount () {
    let result = 0
    for (let s = 0; s < this.submeshMaterial.length; s++) {
      const alpha = this.getSubmeshAlpha(s)
      result += alpha === 1 ? 1 : 0
    }
    return result
  }

  // ------------- Mesh -----------------
  getVertexCount = () => this.positions.length / G3dMesh.POSITION_SIZE

  getIndexCount (section: MeshSection = 'all'): number {
    // TODO  : Implement section
    return this.indices.length 
  }

  getHasTransparency () {
    return this.opaqueCount < this.getSubmeshCount()
  }

  // ------------- Submeshes -----------------

  getSubmeshCount (): number {
    return this.submeshIndexOffset.length
  }

  getSubmeshIndexStart (submesh: number): number {
    return submesh < this.submeshIndexOffset.length
      ? this.submeshIndexOffset[submesh]
      : this.indices.length
  }

  getSubmeshIndexEnd (submesh: number): number {
    return submesh < this.submeshIndexOffset.length - 1
      ? this.submeshIndexOffset[submesh + 1]
      : this.indices.length
  }

  getSubmeshIndexCount (submesh: number): number {
    return this.getSubmeshIndexEnd(submesh) - this.getSubmeshIndexStart(submesh)
  }

  /**
   * Returns color of given submesh as a 4-number array (RGBA)
   * @param submesh g3d submesh index
   */
  getSubmeshColor (submesh: number): Float32Array {
    return this.getMaterialColor(this.submeshMaterial[submesh])
  }

  /**
   * Returns color of given submesh as a 4-number array (RGBA)
   * @param submesh g3d submesh index
   */
  getSubmeshAlpha (submesh: number): number {
    return this.getMaterialAlpha(this.submeshMaterial[submesh])
  }

  /**
   * Returns true if submesh is transparent.
   * @param submesh g3d submesh index
   */
  getSubmeshIsTransparent (submesh: number): boolean {
    return this.getSubmeshAlpha(submesh) < 1
  }

  // ------------- Instances -----------------
  getInstanceCount = () => this.instanceNodes.length

  getInstanceHasFlag(instance: number, flag: number){
    return (this.instanceFlags[instance] & flag) > 0
  }

  /**
   * Returns an 16 number array representation of the matrix for given instance
   * @param instance g3d instance index
   */
  getInstanceMatrix (instance: number): Float32Array {
    return this.instanceTransforms.subarray(
      instance * G3dMesh.MATRIX_SIZE,
      (instance + 1) * G3dMesh.MATRIX_SIZE
    )
  }

  // ------------- Material -----------------

  getMaterialCount = () => this.materialColors.length / G3dMesh.COLOR_SIZE

  /**
   * Returns color of given material as a 4-number array (RGBA)
   * @param material g3d material index
   */
  getMaterialColor (material: number): Float32Array {
    if (material < 0) return this.DEFAULT_COLOR
    return this.materialColors.subarray(
      material * G3dMesh.COLOR_SIZE,
      (material + 1) * G3dMesh.COLOR_SIZE
    )
  }

  getMaterialAlpha (material: number): number {
    if (material < 0) return 1
    const index = material * G3dMesh.COLOR_SIZE + G3dMesh.COLOR_SIZE - 1
    const result = this.materialColors[index]
    return result
  }
}

