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
    return await this.bfast.getValues(this.descriptor.description, index * this.descriptor.dataArity, this.descriptor.dataArity)
  }

  async getValues(index: number, count: number){
    return await this.bfast.getValues(this.descriptor.description, index*this.descriptor.dataArity , count*this.descriptor.dataArity)
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
  submeshIndexOffsets: G3dRemoteAttribute
  submeshMaterials: G3dRemoteAttribute
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
    this.submeshIndexOffsets = g3d.findAttribute(
      VimAttributes.submeshIndexOffsets
    )
    this.submeshMaterials = g3d.findAttribute(VimAttributes.submeshMaterials)
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

  async toG3d(){
    const attributes = []

    const _instanceTransforms = await this.instanceTransforms.getAll()
    const _instanceFlags = await this.instanceFlags.getAll()
    const _instanceMeshes = await this.instanceMeshes.getAll()
    const _meshSubmeshes = await this.meshSubmeshes.getAll()
    const _submeshIndexOffsets = await this. submeshIndexOffsets.getAll()
    const _submeshMaterials = await this.submeshMaterials.getAll()
    const _indices = await this.indices.getAll()
    const _positions = await this.positions.getAll()
    const _materialColors = await this.materialColors.getAll()

    attributes.push(G3dAttribute.fromString(VimAttributes.instanceTransforms, new Uint8Array(_instanceTransforms.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.instanceFlags, new Uint8Array(_instanceFlags.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.instanceMeshes, new Uint8Array(_instanceMeshes.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.meshSubmeshes, new Uint8Array(_meshSubmeshes.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.submeshIndexOffsets, new Uint8Array(_submeshIndexOffsets.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.submeshMaterials, new Uint8Array(_submeshMaterials.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.indices, new Uint8Array(_indices.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.positions, new Uint8Array(_positions.buffer)))
    attributes.push(G3dAttribute.fromString(VimAttributes.materialColors, new Uint8Array(_materialColors.buffer)))
    G3d.createFromArrays

    const abstract = new AbstractG3d('woot', attributes)
    const g3d = G3d.createFromAbstract(abstract)
    return g3d
  }

  async slice(instance: number){

    const mesh = await this.instanceMeshes.getNumber(instance)
    const flags = await this.instanceFlags.getNumber(instance) ?? 0
    const _instanceTransforms = await this.instanceTransforms.getValue(instance) as Float32Array
    const _instanceMeshes = new Int32Array([mesh >= 0 ? 0 : -1])
    const _instanceFlags = new Uint16Array([flags])

    if(mesh >= 0){
      const _meshSubmeshes = new Int32Array([0])

      const submeshStart = await this.getMeshSubmeshStart(mesh)
      const submeshEnd = await this.getMeshSubmeshEnd(mesh)
      const originalOffsets = await this.submeshIndexOffsets.getValues(submeshStart, submeshEnd - submeshStart)
      const firstOffset =  originalOffsets[0]
      const _submeshIndexOffsets = originalOffsets.map(i => i-firstOffset) as Int32Array
      
      const originalSubmeshMaterials = await this.submeshMaterials.getValues(submeshStart, submeshEnd - submeshStart)
      const map = new Map<number, number[]>()
      originalSubmeshMaterials.forEach((m,i) => {
          const set = map.get(m) ?? []
          set.push(i)
          map.set(m, set)
      })

      const _submeshMaterials = new Int32Array(map.size)
      map.get(-1)?.forEach(s => _submeshMaterials[s] = -1)
      const mapAsArray = Array.from(map).filter(pair => pair[0] >=0)
      const materialColors = [] 
      await Promise.all(mapAsArray.map(async ([mat, set], index) => {
        if(mat >= 0){
          const color = await this.materialColors.getValue(mat)
          color.forEach(v => materialColors.push(v))
        }
        set.forEach((s) => _submeshMaterials[s] = index)
      })
      )
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
      const _localIndices = new Uint32Array(indices.map(i => (i - minVertex)).buffer)
  
      //slice vertices from min to max.
      const _vertices = await this.positions.getValues(minVertex, maxVertex - minVertex +1) as Float32Array

      return new G3d(
        _instanceMeshes,
        _instanceFlags,
        _instanceTransforms,
        _meshSubmeshes,
        _submeshIndexOffsets,
        _submeshMaterials,
        _localIndices,
        _vertices,
        _materialColors
      )
    } else{

      return new G3d(
        _instanceMeshes,
        _instanceFlags,
        _instanceTransforms,
        new Int32Array(),
        new Int32Array(),
        new Int32Array(),
        new Uint32Array(),
        new Float32Array(),
        new Float32Array()
      )
    }
  }

  async filter(instances: number[]){
    const instanceSet = new Set(instances)
    
    // Instances
    const _instanceMeshes = new Int32Array(instances.length)
    const _instanceFlags = new Uint16Array(instances.length)
    const _instanceTransforms = new Float32Array(instances.length * 16)
    let instance_i = 0
    const instanceCount = await this.instanceMeshes.getCount()
    for(let i=0; i <  instanceCount; i ++){
      if(!instanceSet.has(i)) continue
      _instanceFlags[instance_i] = await this.instanceFlags.getNumber(i)
      _instanceMeshes[instance_i] = await this.instanceMeshes.getNumber(i)
      for(let j = 0; j < 16; j++){
        _instanceTransforms.set(await this.instanceTransforms.getValue(i), instance_i *16) 
      }
      instance_i++
    }

    // Meshes
    const meshMap = new Map<number, number>()
    const meshSet = new Set(_instanceMeshes)
    meshSet.delete(-1)
    if(meshSet.size === 0){
      return new G3d(
        _instanceMeshes,
        _instanceFlags,
        _instanceTransforms, 
        new Int32Array(),
        new Int32Array(),
        new Int32Array(),
        new Uint32Array(),
        new Float32Array(),
        new Float32Array()
      )
    }

    const _meshSubmeshes = new Int32Array(meshSet.size)
    const meshCount = await this.meshSubmeshes.getCount()

    let last = -1
    let mesh_i = 0
    for(let i=0; i < meshCount; i++){
      if(!meshSet.has(i)) continue

      const offset = mesh_i > 0 ? _meshSubmeshes[mesh_i -1] : 0
      const lastCount = last < 0 ? 0 : await this.getMeshSubmeshCount(last)
      _meshSubmeshes[mesh_i] = lastCount + offset
      meshMap.set(i, mesh_i)
      last = i
      mesh_i++
    }

    // Remamp Instance Meshes
    for(let i = 0; i < _instanceMeshes.length; i++){
      _instanceMeshes[i] = meshMap.get(_instanceMeshes[i]) ?? -1
    }

    // Mesh Attributes Count 
    let submeshCount = 0
    let indiceCount = 0
    for(let m=0; m < meshCount; m ++){
      if(!meshSet.has(m)) continue
      indiceCount += await this.getMeshIndexCount(m)
      submeshCount += await this.getMeshSubmeshCount(m)
    }

    // Meshes
    let indices_i = 0
    let positions_i = 0
    let submesh_i =0
    let meshOffset = 0
    let submeshOffset = 0
    let positionCount = 0
    const _submeshIndexOffsets = new Int32Array(submeshCount)
    const _submeshMaterials = new Int32Array(submeshCount)
    const _indices = new Uint32Array(indiceCount)
    const meshVertexStart = new Int32Array(meshCount +1)

    for(let mesh=0; mesh < meshCount; mesh ++){
      if(!meshSet.has(mesh)) continue

      // submeshes
      const subStart = await this.getMeshSubmeshStart(mesh)
      const subEnd = await this.getMeshSubmeshEnd(mesh)
      
      for(let j = subStart; j < subEnd ; j++){
        const start =  await this.submeshIndexOffsets.getNumber(subStart)
        _submeshIndexOffsets[submesh_i] = (await this.submeshIndexOffsets.getNumber(j)) - start + submeshOffset
        _submeshMaterials[submesh_i] = await this.submeshMaterials.getNumber(j)
        submesh_i++
      }
      submeshOffset += await this.getMeshIndexCount(mesh)

      // indices
      const indexStart = await this.getMeshIndexStart(mesh)
      const indexEnd = await this.getMeshIndexEnd(mesh)
      const indices = await this.indices.getValues(indexStart, indexEnd - indexStart)
      _indices.set(indices, indices_i)

      let min = Number.MAX_SAFE_INTEGER
      let max = Number.MIN_SAFE_INTEGER
      for(let i = 0; i < indices.length ; i++){
        min = Math.min(indices[i], min)
        max = Math.max(indices[i] + 1, max)
      }

      for(let i = 0; i < indices.length ; i++){
        _indices[indices_i + i] = _indices[indices_i + i] - min + positionCount
      }

      meshVertexStart[mesh] = min
      meshVertexStart[mesh+1] = max
      indices_i += indices.length
      positionCount += max-min 
    }

    const _positions = new Float32Array(positionCount*3)
    for(let mesh=0; mesh < meshCount; mesh ++){
      if(!meshSet.has(mesh)) continue
      // vertices
      const vertexStart = meshVertexStart[mesh]
      const vertexEnd = meshVertexStart[mesh +1]
      const vertices = await this.positions.getValues(vertexStart, vertexEnd - vertexStart)
      _positions.set(vertices, positions_i)
      positions_i += vertices.length
    }
    
    // Material Colors
    const materialCount = await this.materialColors.getCount()

    let color_i =0
    const materialSet = new Set(_submeshMaterials)
    const materialMap = new Map<number, number>()
    const _materialColors = new Float32Array(materialSet.size * 4)
    for(let i =0; i < materialCount; i ++){
      if(materialSet.has(i)){
        materialMap.set(i, color_i)
        const colors = await this.materialColors.getValue(i)
        _materialColors.set(colors, color_i*4)
        color_i ++
      }
    }

    // Remap Submesh Materials
    for(let i=0; i < _submeshMaterials.length; i++){
      _submeshMaterials[i] = _submeshMaterials[i] < 0 ? -1 : materialMap.get(_submeshMaterials[i])
    }

    return new G3d(
      _instanceMeshes,
      _instanceFlags,
      _instanceTransforms,
      _meshSubmeshes,
      _submeshIndexOffsets,
      _submeshMaterials,
      _indices,
      _positions,
      _materialColors
    )
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

  getSubmeshCount = () => this.submeshIndexOffsets.getCount()

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

  // // ------------- Submeshes -----------------

  async getSubmeshIndexStart (submesh: number) {
    const submeshCount = await this.submeshIndexOffsets.getCount()
    return submesh < submeshCount
      ? this.submeshIndexOffsets.getNumber(submesh)
      : await this.indices.getCount()
  }

  async getSubmeshIndexEnd (submesh: number) {
    const submeshCount = await this.submeshIndexOffsets.getCount()
    return submesh < submeshCount - 1
      ? this.submeshIndexOffsets.getNumber(submesh + 1)
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