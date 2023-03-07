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
    const indices = await this.indices.getValues(start, end-start)
    return new Uint32Array(indices.buffer) 
  }

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

  
  async toG3d(){
    const _instanceMeshes = await this.instanceMeshes.getAll() as Int32Array
    const _instanceFlags = await this.instanceFlags.getAll() as Uint16Array
    const _instanceTransforms = await this.instanceTransforms.getAll() as Float32Array
    const _meshSubmeshes = await this.meshSubmeshes.getAll() as Int32Array
    const _submeshIndexOffsets = await this. submeshIndexOffsets.getAll() as Int32Array
    const _submeshMaterials = await this.submeshMaterials.getAll() as Int32Array
    const _indices = await this.indices.getAll() as Uint32Array
    const _positions = await this.positions.getAll() as Float32Array
    const _materialColors = await this.materialColors.getAll() as Float32Array

    const g3d = new G3d(
      _instanceMeshes,
      _instanceFlags,
      _instanceTransforms,
      undefined,
      _meshSubmeshes,
      _submeshIndexOffsets,
      _submeshMaterials,
      _indices,
      _positions,
      _materialColors
    )
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
        new Int32Array([instance]),
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
        new Int32Array([instance]),
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
    
    // Instances
    const instanceAttributes = await this.filterInstances(instances)

    // Meshes
    const meshMap = new Map<number, number>()
    const meshSet = new Set(instanceAttributes.instanceMeshes)
    meshSet.delete(-1)
    if(meshSet.size === 0){
      return instanceAttributes.toG3d()
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
    instanceAttributes.remapMeshes(meshMap)

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
      instanceAttributes.instanceMeshes,
      instanceAttributes.instanceFlags,
      instanceAttributes.instanceTransforms,
      instanceAttributes.instanceNodes,
      _meshSubmeshes,
      _submeshIndexOffsets,
      _submeshMaterials,
      _indices,
      _positions,
      _materialColors
    )
  }

  private async filterInstances(instances: number[]){
    const instanceSet = new Set(instances)
    const attributes = new G3dInstanceAttributes(instanceSet.size)
    let instance_i = 0
    const instanceCount = await this.instanceMeshes.getCount()
    for(let i=0; i <  instanceCount; i ++){
      if(!instanceSet.has(i)) continue
      attributes.instanceFlags[instance_i] = await this.instanceFlags.getNumber(i)
      attributes.instanceMeshes[instance_i] = await this.instanceMeshes.getNumber(i)
      attributes.instanceTransforms.set(await this.instanceTransforms.getValue(i), instance_i *16) 
      attributes.instanceNodes[instance_i] = instances[i]
      instance_i++
    }
    return attributes
  }
}

class G3dInstanceAttributes{
  instanceMeshes : Int32Array 
  instanceFlags: Uint16Array
  instanceTransforms : Float32Array
  instanceNodes : Int32Array

  constructor(count: number){
    this.instanceMeshes = new Int32Array(count)
    this.instanceFlags = new Uint16Array(count)
    this.instanceTransforms = new Float32Array(count * 16)
    this.instanceNodes = new Int32Array(count)
  }

  remapMeshes(map: Map<number, number>){
    for(let i = 0; i < this.instanceMeshes.length; i++){
      this.instanceMeshes[i] = map.get(this.instanceMeshes[i]) ?? -1
    }
  }

  toG3d(){
    return new G3d(
      this.instanceMeshes,
      this.instanceFlags,
      this.instanceTransforms,
      this.instanceNodes,
      new Int32Array(),
      new Int32Array(),
      new Int32Array(),
      new Uint32Array(),
      new Float32Array(),
      new Float32Array()
    )
  }
}