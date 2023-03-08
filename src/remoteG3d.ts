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
    const instanceData = await this.filterInstances(instances)

    // Meshes
    const meshes = await this.filterMesh(instanceData.meshes)
    if(!meshes.hasMeshes) return instanceData.toG3d()

    instanceData.remapMeshes(meshes.map)

    const [indiceCount, submeshCount] = await meshes.getAttributeCounts(this)

    let submeshes: SubmeshData
    let materials : MaterialData
    const A = async ()=>{
      submeshes = await this.filterSubmeshes(meshes, submeshCount)
      materials = await this.filterMaterials(submeshes.materials)
    }

    let vertices : VertexData
    let positions : Float32Array
    const B = async() => {
      vertices = await this.filterIndices(meshes, indiceCount)
      positions = await this.filterPositions(vertices, meshes)
    }

    await Promise.all([A(), B()])

    submeshes.remapMaterials(materials.map)

    return new G3d(
      instanceData.meshes,
      instanceData.flags,
      instanceData.transforms,
      instanceData.nodes,
      meshes.submeshes,
      submeshes.indexOffsets,
      submeshes.materials,
      vertices.indices,
      positions,
      materials.colors
    )
  }
  
  private async filterInstances(instances: number[]){
    const instanceSet = new Set(instances)
    const attributes = new InstanceData(instanceSet.size)
    let instance_i = 0
    const instanceCount = await this.instanceMeshes.getCount()
    const promises : Promise<number | void>[] = []
    for(let i=0; i <  instanceCount; i ++){
      if(!instanceSet.has(i)) continue
      const current = instance_i
      promises.push(this.instanceFlags.getNumber(i).then(v => attributes.flags[current] = v))
      promises.push(this.instanceMeshes.getNumber(i).then(v => attributes.meshes[current] = v))
      promises.push(this.instanceTransforms.getValue(i).then(v => attributes.transforms.set(v, current *16)))
      attributes.nodes[current] = i
      instance_i++
    }
    await Promise.all(promises)
    return attributes
  }

  private async filterMesh(instanceMeshes:  Int32Array ){

    const meshes = new MeshData(instanceMeshes)
    if(meshes.hasMeshes){
      meshes.count = await this.meshSubmeshes.getCount()
  
      let last = -1
      let mesh_i = 0
      for(let i=0; i < meshes.count; i++){
        if(!meshes.set.has(i)) continue
    
        const offset = mesh_i > 0 ? meshes.submeshes[mesh_i -1] : 0
        const lastCount = last < 0 ? 0 : await this.getMeshSubmeshCount(last)
        meshes.submeshes[mesh_i] = lastCount + offset
        meshes.map.set(i, mesh_i)
        last = i
        mesh_i++
      }
    } 
  
    return meshes
  }

  private async filterSubmeshes(meshes: MeshData, submeshCount: number){

    let submesh_i =0
    let submeshOffset = 0
    const submeshes = new SubmeshData(submeshCount)
 
    for(let mesh=0; mesh < meshes.count; mesh ++){
      if(!meshes.set.has(mesh)) continue

      const subStart = await this.getMeshSubmeshStart(mesh)
      const subEnd = await this.getMeshSubmeshEnd(mesh)
      
      const promises : Promise<number>[] = []
      for(let j = subStart; j < subEnd ; j++){
        const current = submesh_i
        promises.push(
          this.submeshIndexOffsets.getNumber(subStart)
          .then(start => this.submeshIndexOffsets.getNumber(j)
            .then(v=> submeshes.indexOffsets[current] = v - start + submeshOffset)
          )
        )
        promises.push(this.submeshMaterials.getNumber(j).then(v => submeshes.materials[current] = v))

        submesh_i++
      }
      await Promise.all(promises)
      submeshOffset += await this.getMeshIndexCount(mesh)
    }
    return submeshes
  }

  private async filterIndices(meshes: MeshData, indicesCount: number){
    
    let indices_i = 0
    const result = new VertexData(meshes.count, indicesCount)

    for(let mesh=0; mesh < meshes.count; mesh ++){
      if(!meshes.set.has(mesh)) continue

      let indexStart: number
      let indexEnd : number
      await Promise.all([
        this.getMeshIndexStart(mesh).then(v => indexStart = v),
        this.getMeshIndexEnd(mesh).then(v => indexEnd= v)
      ])

      const indices = await this.indices.getValues(indexStart, indexEnd - indexStart)
      result.indices.set(indices, indices_i)

      let min = Number.MAX_SAFE_INTEGER
      let max = Number.MIN_SAFE_INTEGER
      for(let i = 0; i < indices.length ; i++){
        min = Math.min(indices[i], min)
        max = Math.max(indices[i] + 1, max)
      }

      for(let i = 0; i < indices.length ; i++){
        result.indices[indices_i + i] = result.indices[indices_i + i] - min + result.positionCount
      }

      result.meshVertexStart[mesh] = min
      result.meshVertexStart[mesh+1] = max
      indices_i += indices.length
      result.positionCount += max-min 
    }
    return result
  }

  private async filterPositions(indices: VertexData, meshes : MeshData){
    
    const _positions = new Float32Array(indices.positionCount*3)
    const promises : Promise<void>[] = []
    const offsets  = new Int32Array(meshes.set.size)

    let offset_i =0;
    for(let mesh=0; mesh < meshes.count; mesh ++){
      if(!meshes.set.has(mesh)) continue
      if(offset_i >0){
        const vertexStart = indices.meshVertexStart[mesh -1]
        const vertexEnd = indices.meshVertexStart[mesh]
        const current = offsets[offset_i-1]
        const length = vertexEnd - vertexStart
        offsets[offset_i] = current + length
      }
      offset_i++
    }

    let positions_i = 0
    for(let mesh=0; mesh < meshes.count; mesh ++){
      if(!meshes.set.has(mesh)) continue
      // vertices
      const vertexStart = indices.meshVertexStart[mesh]
      const vertexEnd = indices.meshVertexStart[mesh +1]

      const current = positions_i
      promises.push(
        this.positions.getValues(vertexStart, vertexEnd - vertexStart)
          .then(v => {
            console.log(offsets[current] * 3)
            console.log(_positions)
            console.log(v)
            _positions.set(v, offsets[current] * 3)
          })
      )

      positions_i ++
    }
    await Promise.all(promises)
    return _positions
  }

  private async filterMaterials(submeshMaterials : Int32Array){
    // Material Colors
    const materialCount = await this.materialColors.getCount()

    let color_i =0
    const materials = new MaterialData(submeshMaterials)
    const promises : Promise<void>[] = []
    for(let i =0; i < materialCount; i ++){
      if(materials.set.has(i)){
        materials.map.set(i, color_i)
        const current = color_i
        promises.push(
          this.materialColors.getValue(i)
          .then(c => materials.colors.set(c, current*4))
        )
        color_i ++
      }
    }
    await Promise.all(promises)
    return materials
  }
}

class InstanceData{
  meshes : Int32Array 
  flags: Uint16Array
  transforms : Float32Array
  nodes : Int32Array

  constructor(count: number){
    this.meshes = new Int32Array(count)
    this.flags = new Uint16Array(count)
    this.transforms = new Float32Array(count * 16)
    this.nodes = new Int32Array(count)
  }

  remapMeshes(map: Map<number, number>){
    for(let i = 0; i < this.meshes.length; i++){
      this.meshes[i] = map.get(this.meshes[i]) ?? -1
    }
  }

  toG3d(){
    return new G3d(
      this.meshes,
      this.flags,
      this.transforms,
      this.nodes,
      new Int32Array(),
      new Int32Array(),
      new Int32Array(),
      new Uint32Array(),
      new Float32Array(),
      new Float32Array()
    )
  }
}

class MeshData{
  hasMeshes: boolean
  submeshes : Int32Array
  count : number
  map : Map<number, number>
  set : Set<number>

  constructor(instanceMeshes: Int32Array){
    this.set = new Set(instanceMeshes)
    this.set.delete(-1)
    this.hasMeshes = this.set.size > 0
    this.submeshes = this.hasMeshes ? new Int32Array(this.set.size) : undefined
    this.map = this.hasMeshes ? new Map<number, number>() : undefined
  }

  async getAttributeCounts(g3d: RemoteG3d){
    let submeshCount = 0
    let indiceCount = 0
    const promises : Promise<number>[] = []
    for(let m=0; m < this.count; m ++){
      if(!this.set.has(m)) continue
      promises.push(g3d.getMeshIndexCount(m).then(v => indiceCount += v ))
      promises.push(g3d.getMeshSubmeshCount(m).then(v =>submeshCount += v))
    }
    await Promise.all(promises)
    return [indiceCount, submeshCount]
  }
}

class SubmeshData{
  indexOffsets: Int32Array
  materials : Int32Array

  constructor(count: number){
    this.indexOffsets = new Int32Array(count)
    this.materials = new Int32Array(count)  
  }

  remapMaterials(map: Map<number, number>){
    for(let i=0; i < this.materials.length; i++){
      this.materials[i] = this.materials[i] < 0 ? -1 : map.get(this.materials[i])
    }
  }
}

class VertexData{
  positionCount : number 
  indices:  Uint32Array
  meshVertexStart : Int32Array
  
  constructor(meshCount : number, indicesCount : number){
    this.positionCount = 0
    this.indices = new Uint32Array(indicesCount)
    this.meshVertexStart = new Int32Array(meshCount +1)
  }
}

class MaterialData{
  set : Set<number>
  map : Map<number, number>
  colors : Float32Array

  constructor(submeshMaterials: Int32Array){
    this.set = new Set(submeshMaterials)
    this.map = new Map<number, number>()
    this.colors = new Float32Array(this.set.size * 4)
  }
}
