import { BFast, typeSize } from "./bfast"
import { AbstractG3d, G3d, G3dAttribute, G3dAttributeDescriptor, MeshSection, TypedArray, VimAttributes } from "./g3d"

class G3dRemoteAttribute {
  descriptor: G3dAttributeDescriptor
  bfast: BFast

  constructor (descriptor: G3dAttributeDescriptor, bfast: BFast) {
    this.descriptor = descriptor
    this.bfast = bfast
  }

  async getAll(){
    const bytes = await this.bfast.getBytes(this.descriptor.description)
    const data = G3dAttribute.castData(bytes, this.descriptor.dataType)
    return data
  }

  async getByte(index: number){
    return await this.bfast.getValue(this.descriptor.description, index)
  }

  async getNumber(index: number){
    const count = await this.bfast.getValue(this.descriptor.description, index)
    return count
  }

  async getValue(index: number){
    return await this.bfast.getValues(this.descriptor.description, index, this.descriptor.dataArity)
  }

  async getValues(index: number, count: number){
    return await this.bfast.getValues(this.descriptor.description, index, count * this.descriptor.dataArity)
  }

  async getCount(){
    const range = await this.bfast.getRange(this.descriptor.description)
    const count = range.length / (this.descriptor.dataArity * typeSize(this.descriptor.dataType))
    return count
  }


  static fromString(description: string, bfast: BFast){
    return new G3dRemoteAttribute(G3dAttributeDescriptor.fromString(description), bfast)
  }
}

/**
 * G3D is a simple, efficient, generic binary format for storing and transmitting geometry.
 * The G3D format is designed to be used either as a serialization format or as an in-memory data structure.
 * See https://github.com/vimaec/g3d
 */
export class RemoteAbstractG3d {
  meta: string
  attributes: G3dRemoteAttribute[]

  constructor (meta: string, attributes: G3dRemoteAttribute[]) {
    this.meta = meta
    this.attributes = attributes
  }

  findAttribute (descriptor: string): G3dRemoteAttribute | undefined {
    const filter = G3dAttributeDescriptor.fromString(descriptor)
    for (let i = 0; i < this.attributes.length; ++i) {
      const attribute = this.attributes[i]
      if (attribute.descriptor.matches(filter)) return attribute
    }
  }

  /**
   * Create g3d from bfast by requesting all necessary buffers individually.
   */
  static createFromBfast (bfast: BFast) {
    const attributes = VimAttributes.all.map((a) => G3dRemoteAttribute.fromString(a, bfast))
    return new RemoteAbstractG3d('meta', attributes)
  }
}

export class RemoteG3d {
  rawG3d: RemoteAbstractG3d
  
  // attributes
  positions: G3dRemoteAttribute
  indices: G3dRemoteAttribute

  instanceMeshes: G3dRemoteAttribute
  instanceTransforms: G3dRemoteAttribute
  instanceFlags: G3dRemoteAttribute
  meshSubmeshes: G3dRemoteAttribute
  submeshIndexOffset: G3dRemoteAttribute
  submeshMaterial: G3dRemoteAttribute
  materialColors: G3dRemoteAttribute

  // consts
  MATRIX_SIZE = 16
  COLOR_SIZE = 4
  POSITION_SIZE = 3
  DEFAULT_COLOR = new Float32Array([1, 1, 1, 1])

  constructor (g3d: RemoteAbstractG3d) {
    this.rawG3d = g3d

    this.positions = g3d.findAttribute(VimAttributes.positions)
    this.indices = g3d.findAttribute(VimAttributes.indices)

    this.meshSubmeshes = g3d.findAttribute(VimAttributes.meshSubmeshes)
    this.submeshIndexOffset = g3d.findAttribute(
      VimAttributes.submeshIndexOffsets
    )
    this.submeshMaterial = g3d.findAttribute(VimAttributes.submeshMaterials)
    this.materialColors = g3d.findAttribute(VimAttributes.materialColors)
    this.instanceMeshes = g3d.findAttribute(VimAttributes.instanceMeshes)
    this.instanceTransforms = g3d.findAttribute(
      VimAttributes.instanceTransforms
    )
    this.instanceFlags =
      g3d.findAttribute(VimAttributes.instanceFlags)
  }

  static createFromBfast (bfast: BFast) {
    const abstract = RemoteAbstractG3d.createFromBfast(bfast)
    return new RemoteG3d(abstract)
  }

  async getG3d(instance: number){
    const matrix = await this.instanceTransforms.getNumber(instance)
    const mesh = await this.instanceMeshes.getNumber(instance)
    const flags = await this.instanceFlags.getNumber(instance)
    const _instanceTransforms = new Int32Array([0])
    const _instanceMeshes = new Int32Array(mesh >= 0 ? 0: -1)
    const _instanceFlags = new Int32Array([flags])

    if(mesh < 0) return
    const _meshSubmeshes = new Int32Array([0])

    const submeshStart = await this.getMeshSubmeshStart(mesh)
    const submeshEnd = await this.getMeshSubmeshEnd(mesh)
    const originalOffsets = await this.submeshIndexOffset.getValues(submeshStart, submeshEnd - submeshStart)
    const firstOffset =  originalOffsets[0]
    const _submeshIndexOffsets = originalOffsets.map(i => i-firstOffset)
    
    const originalSubmeshMaterials = await this.submeshMaterial.getValues(submeshStart, submeshEnd - submeshStart)
    const map = new Map<number, number[]>()
    originalSubmeshMaterials.forEach((m,i) => {
      if(m >= 0){
        const set = map.get(m) ?? []
        set.push(i)
        map.set(m, set)
      }
    })
    const _submeshMaterials = new Int32Array(originalSubmeshMaterials.length)
    const materialColors = [] 
    let i =0
    map.forEach(async (set, mat) => {
      const color = await this.materialColors.getValue(mat)
      color.forEach(v => materialColors.push(v))
      set.forEach((s) => _submeshMaterials[i] = i)
      i++
    })
    const _materialColors = new Float32Array(materialColors)

    const indices = await this.getMeshIndices(mesh)
    //get min and max vertex
    let minVertex = Number.MAX_SAFE_INTEGER
    let maxVertex = Number.MIN_SAFE_INTEGER
    for(let i=0;i < indices.length; i++){
      minVertex = Math.min(minVertex, indices[i])
      maxVertex = Math.max(maxVertex, indices[i])
    } 

    //rebase indices i-min
    const _localIndices = indices.map(i => i - minVertex)

    //slice vertices from min to max.
    const _vertices = await this.positions.getValues(minVertex, maxVertex - minVertex)


    const attributes = []
    attributes.push(G3dAttribute.fromString(VimAttributes.instanceTransforms, new Uint8Array(_instanceTransforms.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.instanceFlags, new Uint8Array(_instanceFlags.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.instanceMeshes, new Uint8Array(_instanceMeshes.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.meshSubmeshes, new Uint8Array(_meshSubmeshes.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.submeshIndexOffsets, new Uint8Array(_submeshIndexOffsets.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.submeshMaterials, new Uint8Array(_submeshMaterials.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.indices, new Uint8Array(_localIndices.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.positions, new Uint8Array(_vertices.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.materialColors, new Uint8Array(_materialColors.buffer)))

    const abstract = new AbstractG3d('woot', attributes)
    const g3d = new G3d(abstract)
  }


  /**
   * Computes the index of the first vertex of each mesh
   *//*
  private computeMeshVertexOffsets (): Int32Array {
    const result = new Int32Array(this.getMeshCount())
    for (let m = 0; m < result.length; m++) {
      let min = Number.MAX_SAFE_INTEGER
      const start = this.getMeshIndexStart(m, 'all')
      const end = this.getMeshIndexEnd(m, 'all')
      for (let i = start; i < end; i++) {
        min = Math.min(min, this.indices[i])
      }
      result[m] = min
    }
    return result
  }
  */

  /**
   * Computes all instances pointing to each mesh.
   */
  /*
  private computeMeshInstances = (): number[][] => {
    const result: number[][] = []

    for (let i = 0; i < this.instanceMeshes.length; i++) {
      const mesh = this.instanceMeshes[i]
      if (mesh < 0) continue
      const instanceIndices = result[mesh]
      if (instanceIndices) instanceIndices.push(i)
      else result[mesh] = [i]
    }

    return result
  }
  */

  /**
   * Reorders submeshIndexOffset, submeshMaterials and indices
   * such that for each mesh, submeshes are sorted according to material alpha.
   * This enables efficient splitting of arrays into opaque and transparent continuous ranges.
   */
  /*
  private sortSubmeshes () {
    // We need to compute where submeshes end before we can reorder them.
    const submeshEnd = this.computeSubmeshEnd()
    // We need to compute mesh index offsets from before we swap thins around to recompute new submesh offsets.
    const meshIndexOffsets = this.computeMeshIndexOffsets()

    const meshCount = this.getMeshCount()
    const meshReordered = new Array<boolean>(meshCount)

    const submeshArrays = [
      this.submeshIndexOffset,
      this.submeshMaterial,
      submeshEnd
    ]
    // Largest mesh size thus minimum buffer size to use to reorder indices.
    const largestMesh = this.reorderSubmeshes(submeshArrays, meshReordered)
    this.reorderIndices(
      meshIndexOffsets,
      submeshEnd,
      meshReordered,
      largestMesh
    )
  }
*/
  /**
   * Stores result of getSubmeshIndexEnd for each submesh in an array
   */
  /*
  private computeSubmeshEnd () {
    const submeshCount = this.getSubmeshCount()
    const result = new Int32Array(submeshCount)
    for (let s = 0; s < submeshCount; s++) {
      result[s] = this.getSubmeshIndexEnd(s)
    }
    return result
  }
  */

  /**
   * Stores result of getMeshIndexStart for each mesh in an array
   */
  /*
  private computeMeshIndexOffsets () {
    const meshCount = this.getMeshCount()
    const result = new Int32Array(meshCount)
    for (let m = 0; m < meshCount; m++) {
      result[m] = this.getMeshIndexStart(m, 'all')
    }
    return result
  }
  */

  /**
   * Reorder submesh arrays and returns size of largest reordered mesh
   */
  /*
  private reorderSubmeshes (submeshArrays: Int32Array[], reordered: boolean[]) {
    const meshCount = this.getMeshCount()
    let largestMesh = 0
    for (let m = 0; m < meshCount; m++) {
      const subStart = this.getMeshSubmeshStart(m, 'all')
      const subEnd = this.getMeshSubmeshEnd(m, 'all')

      if (subEnd - subStart <= 1) {
        continue
      }

      largestMesh = Math.max(largestMesh, this.getMeshIndexCount(m, 'all'))

      reordered[m] = this.Sort(
        subStart,
        subEnd,
        (i) => this.getSubmeshAlpha(i),
        submeshArrays
      )
    }
    return largestMesh
  }
*/
  /**
   * Sorts the range from start to end in every array provided in arrays in increasing criterion order.
   * Using a simple bubble sort, there is a limited number of submeshes per mesh.
   */
  /*
  private Sort (
    start: number,
    end: number,
    criterion: (i: number) => number,
    arrays: Int32Array[]
  ) {
    let swapped = false
    while (true) {
      let loop = false
      for (let i = start; i < end - 1; i++) {
        if (criterion(i) < criterion(i + 1)) {
          loop = true
          swapped = true
          for (let j = 0; j < arrays.length; j++) {
            const array = arrays[j]
            const t = array[i]
            array[i] = array[i + 1]
            array[i + 1] = t
          }
        }
      }
      if (!loop) {
        break
      }
    }
    return swapped
  }
*/
  /**
   * Reorders the index buffer to match the new order of the submesh arrays.
   */
  /*
  private reorderIndices (
    meshIndexOffsets: Int32Array,
    submeshEnd: Int32Array,
    meshReordered: boolean[],
    bufferSize: number
  ) {
    const meshCount = this.getMeshCount()
    const buffer = new Float32Array(bufferSize)

    for (let m = 0; m < meshCount; m++) {
      if (!meshReordered[m]) continue

      const meshOffset = meshIndexOffsets[m]
      const subStart = this.getMeshSubmeshStart(m, 'all')
      const subEnd = this.getMeshSubmeshEnd(m, 'all')
      let index = 0

      // Copy indices -> buffer, in sorted order.
      for (let s = subStart; s < subEnd; s++) {
        const start = this.submeshIndexOffset[s]
        const end = submeshEnd[s]

        // Change submesh offset to match new ordering
        this.submeshIndexOffset[s] = meshOffset + index
        for (let i = start; i < end; i++) {
          buffer[index++] = this.indices[i]
        }
      }

      // Copy buffer -> indices
      for (let i = 0; i < index; i++) {
        this.indices[meshOffset + i] = buffer[i]
      }
    }
  }
  */

  /**
   * Rebase indices to be relative to its own mesh instead of to the whole g3d
   */
  /*
  private rebaseIndices () {
    const count = this.getMeshCount()
    for (let m = 0; m < count; m++) {
      const offset = this.meshVertexOffsets[m]
      const start = this.getMeshIndexStart(m, 'all')
      const end = this.getMeshIndexEnd(m, 'all')
      for (let i = start; i < end; i++) {
        this.indices[i] -= offset
      }
    }
  }
*/
  /**
   * Computes an array where true if any of the materials used by a mesh has transparency.
   */
  /*
  private computeMeshOpaqueCount () {
    const result = new Array<number>(this.getMeshCount()).fill(0)
    for (let m = 0; m < result.length; m++) {
      const subStart = this.getMeshSubmeshStart(m, 'all')
      const subEnd = this.getMeshSubmeshEnd(m, 'all')
      for (let s = subStart; s < subEnd; s++) {
        const alpha = this.getSubmeshAlpha(s)
        result[m] += alpha === 1 ? 1 : 0
      }
    }
    return result
  }
  */

  // ------------- All -----------------
  getVertexCount = () => this.positions.getCount()

  // ------------- Meshes -----------------
  getMeshCount = () => this.meshSubmeshes.getCount()

  getSubmeshCount = () => this.submeshIndexOffset.getCount()

  async getMeshIndexStart (mesh: number, section: MeshSection = 'all') {
    const sub = await this.getMeshSubmeshStart(mesh, section)
    return this.getSubmeshIndexStart(sub)
  }

  async getMeshIndexEnd (mesh: number, section: MeshSection = 'all') {
    const sub = await this.getMeshSubmeshEnd(mesh, section)
    return this.getSubmeshIndexEnd(sub - 1)
  }

  async getMeshIndexCount (mesh: number, section: MeshSection = 'all') {
    const start = await this.getMeshIndexStart(mesh, section)
    const end  = await this.getMeshIndexEnd(mesh, section)
    return end - start
  }

  async getMeshIndices(mesh:number){
    const start = await this.getMeshIndexStart(mesh)
    const end  = await this.getMeshIndexEnd(mesh)
    return await this.indices.getValues(start, end-start) as Int32Array
  }

  // getMeshVertexStart (mesh: number): number {
  //   return this.meshVertexOffsets[mesh]
  // }

  // getMeshVertexEnd (mesh: number): number {
  //   return mesh < this.meshVertexOffsets.length - 1
  //     ? this.meshVertexOffsets[mesh + 1]
  //     : this.getVertexCount()
  // }

  // getMeshVertexCount (mesh: number): number {
  //   return this.getMeshVertexEnd(mesh) - this.getMeshVertexStart(mesh)
  // }



  async getMeshSubmeshEnd (mesh: number, section: MeshSection = 'all') {
    const meshCount = await this.getMeshCount()
    const submeshCount = await this.getSubmeshCount()
    return mesh + 1 < meshCount
      ? await this.meshSubmeshes.getNumber(mesh + 1)
      : submeshCount
  }

  async getMeshSubmeshStart (mesh: number, section: MeshSection = 'all') {
    return this.meshSubmeshes.getNumber(mesh)
  }

  async getMeshSubmeshCount (mesh: number, section: MeshSection = 'all') {
    const end = await this.getMeshSubmeshEnd(mesh, section)
    const start = await this.getMeshSubmeshStart(mesh, section)
    return end - start
  }

  

  // getMeshHasTransparency (mesh: number) {
  //   return this.getMeshSubmeshCount(mesh, 'transparent') > 0
  // }

  // // ------------- Submeshes -----------------

  async getSubmeshIndexStart (submesh: number) {
    const submeshCount = await this.submeshIndexOffset.getCount()
    return submesh < submeshCount
      ? this.submeshIndexOffset.getNumber(submesh)
      : await this.indices.getCount()
  }

  async getSubmeshIndexEnd (submesh: number) {
    const submeshCount = await this.submeshIndexOffset.getCount()
    return submesh < submeshCount - 1
      ? this.submeshIndexOffset.getNumber(submesh + 1)
      : await this.indices.getCount()
  }

  async getSubmeshIndexCount (submesh: number) {
    const start = await this.getSubmeshIndexStart(submesh)
    const end = await  this.getSubmeshIndexEnd(submesh)
    return end - start
  }

  // /**
  //  * Returns color of given submesh as a 4-number array (RGBA)
  //  * @param submesh g3d submesh index
  //  */
  // getSubmeshColor (submesh: number): Float32Array {
  //   return this.getMaterialColor(this.submeshMaterial[submesh])
  // }

  // /**
  //  * Returns color of given submesh as a 4-number array (RGBA)
  //  * @param submesh g3d submesh index
  //  */
  // getSubmeshAlpha (submesh: number): number {
  //   return this.getMaterialAlpha(this.submeshMaterial[submesh])
  // }

  // /**
  //  * Returns true if submesh is transparent.
  //  * @param submesh g3d submesh index
  //  */
  // getSubmeshIsTransparent (submesh: number): boolean {
  //   return this.getSubmeshAlpha(submesh) < 1
  // }

  // /**
  //  * Returns the total number of mesh in the g3d
  //  */
  // getSubmeshCount (): number {
  //   return this.submeshMaterial.length
  // }

  // // ------------- Instances -----------------
  // getInstanceCount = () => this.instanceMeshes.length

  // /**
  //  * Returns mesh index of given instance
  //  * @param instance g3d instance index
  //  */
  // getInstanceMesh (instance: number): number {
  //   return this.instanceMeshes[instance]
  // }

  // /**
  //  * Returns an 16 number array representation of the matrix for given instance
  //  * @param instance g3d instance index
  //  */
  // getInstanceMatrix (instance: number): Float32Array {
  //   return this.instanceTransforms.subarray(
  //     instance * this.MATRIX_SIZE,
  //     (instance + 1) * this.MATRIX_SIZE
  //   )
  // }

  // // ------------- Material -----------------

  // getMaterialCount = () => this.materialColors.length / this.COLOR_SIZE

  // /**
  //  * Returns color of given material as a 4-number array (RGBA)
  //  * @param material g3d material index
  //  */
  // getMaterialColor (material: number): Float32Array {
  //   if (material < 0) return this.DEFAULT_COLOR
  //   return this.materialColors.subarray(
  //     material * this.COLOR_SIZE,
  //     (material + 1) * this.COLOR_SIZE
  //   )
  // }

  // getMaterialAlpha (material: number): number {
  //   if (material < 0) return 1
  //   const index = material * this.COLOR_SIZE + this.COLOR_SIZE - 1
  //   const result = this.materialColors[index]
  //   return result
  // }

  // static async createFromBfast (bfast: BFast) {
  //   return AbstractG3d.createFromBfast(bfast).then((g3d) => new G3d(g3d))
  // }

  // validate () {
  //   const isPresent = (attribute: any, label: string) => {
  //     if (!attribute) {
  //       throw new Error(`Missing Attribute Buffer: ${label}`)
  //     }
  //   }
  //   isPresent(this.positions, 'position')
  //   isPresent(this.indices, 'indices')
  //   isPresent(this.instanceMeshes, 'instanceMeshes')
  //   isPresent(this.instanceTransforms, 'instanceTransforms')
  //   isPresent(this.meshSubmeshes, 'meshSubmeshes')
  //   isPresent(this.submeshIndexOffset, 'submeshIndexOffset')
  //   isPresent(this.submeshMaterial, 'submeshMaterial')
  //   isPresent(this.materialColors, 'materialColors')

  //   // Basic
  //   if (this.positions.length % this.POSITION_SIZE !== 0) {
  //     throw new Error(
  //       'Invalid position buffer, must be divisible by ' + this.POSITION_SIZE
  //     )
  //   }

  //   if (this.indices.length % 3 !== 0) {
  //     throw new Error('Invalid Index Count, must be divisible by 3')
  //   }

  //   for (let i = 0; i < this.indices.length; i++) {
  //     if (this.indices[i] < 0 || this.indices[i] >= this.positions.length) {
  //       throw new Error('Vertex index out of bound')
  //     }
  //   }

  //   // Instances
  //   if (
  //     this.instanceMeshes.length !==
  //     this.instanceTransforms.length / this.MATRIX_SIZE
  //   ) {
  //     throw new Error('Instance buffers mismatched')
  //   }

  //   if (this.instanceTransforms.length % this.MATRIX_SIZE !== 0) {
  //     throw new Error(
  //       'Invalid InstanceTransform buffer, must respect arity ' +
  //         this.MATRIX_SIZE
  //     )
  //   }

  //   for (let i = 0; i < this.instanceMeshes.length; i++) {
  //     if (this.instanceMeshes[i] >= this.meshSubmeshes.length) {
  //       throw new Error('Instance Mesh Out of range.')
  //     }
  //   }

  //   // Meshes
  //   for (let i = 0; i < this.meshSubmeshes.length; i++) {
  //     if (
  //       this.meshSubmeshes[i] < 0 ||
  //       this.meshSubmeshes[i] >= this.submeshIndexOffset.length
  //     ) {
  //       throw new Error('MeshSubmeshOffset out of bound at')
  //     }
  //   }

  //   for (let i = 0; i < this.meshSubmeshes.length - 1; i++) {
  //     if (this.meshSubmeshes[i] >= this.meshSubmeshes[i + 1]) {
  //       throw new Error('MeshSubmesh out of sequence.')
  //     }
  //   }

  //   // Submeshes
  //   if (this.submeshIndexOffset.length !== this.submeshMaterial.length) {
  //     throw new Error('Mismatched submesh buffers')
  //   }

  //   for (let i = 0; i < this.submeshIndexOffset.length; i++) {
  //     if (
  //       this.submeshIndexOffset[i] < 0 ||
  //       this.submeshIndexOffset[i] >= this.indices.length
  //     ) {
  //       throw new Error('SubmeshIndexOffset out of bound')
  //     }
  //   }

  //   for (let i = 0; i < this.submeshIndexOffset.length; i++) {
  //     if (this.submeshIndexOffset[i] % 3 !== 0) {
  //       throw new Error('Invalid SubmeshIndexOffset, must be divisible by 3')
  //     }
  //   }

  //   for (let i = 0; i < this.submeshIndexOffset.length - 1; i++) {
  //     if (this.submeshIndexOffset[i] >= this.submeshIndexOffset[i + 1]) {
  //       throw new Error('SubmeshIndexOffset out of sequence.')
  //     }
  //   }

  //   for (let i = 0; i < this.submeshMaterial.length; i++) {
  //     if (this.submeshMaterial[i] >= this.materialColors.length) {
  //       throw new Error('submeshMaterial out of bound')
  //     }
  //   }

  //   // Materials
  //   if (this.materialColors.length % this.COLOR_SIZE !== 0) {
  //     throw new Error(
  //       'Invalid material color buffer, must be divisible by ' + this.COLOR_SIZE
  //     )
  //   }
  //   console.assert(this.meshInstances.length === this.getMeshCount())
  //   console.assert(this.meshOpaqueCount.length === this.getMeshCount())
  //   console.assert(this.meshSubmeshes.length === this.getMeshCount())
  //   console.assert(this.meshVertexOffsets.length === this.getMeshCount())

  //   for (let m = 0; m < this.getMeshCount(); m++) {
  //     console.assert(
  //       this.getMeshSubmeshCount(m, 'opaque') +
  //         this.getMeshSubmeshCount(m, 'transparent') ===
  //         this.getMeshSubmeshCount(m, 'all')
  //     )

  //     console.assert(
  //       this.getMeshIndexCount(m, 'opaque') +
  //         this.getMeshIndexCount(m, 'transparent') ===
  //         this.getMeshIndexCount(m, 'all')
  //     )
  //   }
  // }
}