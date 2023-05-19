import { G3d } from "./g3d"
import { G3dMesh } from "./g3dMesh"
import { G3dMeshIndex, G3dMeshOffsets } from "./g3dMeshIndex"
import { Requester } from "./requester"


export class G3dBuilderCursor{
    // Pointers
    instance = 0
    mesh = 0
    submesh = 0
    index = 0
    vertex = 0
    material = 0

    constructor(instance : number,
      mesh: number,
      submesh: number,
      index: number,
      vertex: number,
      material: number
      ){
      this.instance = instance
      this.mesh = mesh
      this.submesh = submesh
      this.index = index
      this.vertex = vertex
      this.material = material
    }

    move(g3d:G3d){
      
      this.instance += g3d.getInstanceCount()
      this.mesh += g3d.getMeshCount()
      this.submesh += g3d.getSubmeshCount()
      this.index += g3d.getIndexCount()
      this.vertex += g3d.getVertexCount()
      this.material += g3d.getMaterialCount()
    }
}

export class G3dBuilder{

  //Arrays
  instanceMeshes : Int32Array
  instanceFlags : Uint16Array
  instanceTransforms : Float32Array
  instanceNodes : Int32Array
  meshSubmeshes : Int32Array
  submeshIndexOffsets : Int32Array
  submeshMaterials : Int32Array
  indices : Uint32Array
  positions : Float32Array
  materialColors : Float32Array

  // offsets
  offsets : G3dMeshOffsets

  // meshes
  meshes : number[]

  constructor(
    meshes: number[],
    instanceCount: number,
    meshCount: number, 
    submeshCount: number, 
    indexCount: number, 
    vertexCount: number,
    materialCount: number,
    offsets : G3dMeshOffsets
  ){
    this.meshes = meshes
    this.instanceMeshes = new Int32Array(instanceCount)
    this.instanceFlags = new Uint16Array(instanceCount)
    this.instanceTransforms = new Float32Array(instanceCount * G3d.MATRIX_SIZE)
    this.instanceNodes = new Int32Array(instanceCount)
    this.meshSubmeshes = new Int32Array(meshCount)
    this.submeshIndexOffsets = new Int32Array(submeshCount)
    this.submeshMaterials = new Int32Array(submeshCount)
    this.indices = new Uint32Array(indexCount)
    this.positions = new Float32Array(vertexCount * G3d.POSITION_SIZE)
    this.materialColors = new Float32Array(materialCount * G3d.COLOR_SIZE)
    this.offsets = offsets
  }

  static fromIndexMeshes(index: G3dMeshIndex, meshes? : number[]){
    meshes = meshes ?? [...Array(index.getMeshCount()).keys()]
    var counts = index.getAttributeCounts(meshes)
    var offsets = index.meshOffsets(meshes)
    return new G3dBuilder(
      meshes,
      counts.instanceCount,
      counts.meshCount,
      counts.submeshCount,
      counts.indexCount,
      counts.vertexCount,
      counts.materialCount,
      offsets
    )
  }

  static fromIndexInstances(index: G3dMeshIndex, instances? : number[]){
    const meshes = new Set<number>()
    if(instances){
      instances.forEach(i => {
        meshes.add(index.instanceFiles[i])
      })
    } else{
      index.instanceFiles.forEach(i => meshes.add(i))
    }

    return this.fromIndexMeshes(index, Array.from(meshes))
  }

  all(getUrl: (m: number) => string, requester = new Requester()){

    return Promise.all(this.meshes.map(async (m, i) => {
      const url = getUrl(m)
      var buffer = await requester.http(url)
      var mesh = await G3dMesh.createFromBuffer(buffer)
      const g3d = mesh.toG3d()
      this.insert(g3d, i)
    }))
  }

  insert(g3d: G3d, mesh: number){
    const cursor = this.offsets.getCursor(mesh)
    this.instanceFlags.set(g3d.instanceFlags, cursor.instance)
    this.instanceMeshes.set(g3d.instanceMeshes.map(m => m >=0 ? (m + cursor.mesh) : -1), cursor.instance)
    this.instanceTransforms.set(g3d.instanceTransforms, cursor.instance * G3d.MATRIX_SIZE)
    this.instanceNodes.set(g3d.instanceNodes, cursor.instance)

    this.meshSubmeshes.set(g3d.meshSubmeshes.map(s => s + cursor.submesh), cursor.mesh)

    this.submeshIndexOffsets.set(g3d.submeshIndexOffset.map(s => s + cursor.index), cursor.submesh)
    this.submeshMaterials.set(g3d.submeshMaterial.map(s => s >=0 ?(s + cursor.material) : -1), cursor.submesh)

    this.positions.set(g3d.positions, cursor.vertex * G3d.POSITION_SIZE)
    this.indices.set(g3d.indices.map(i => i + cursor.vertex), cursor.index)

    this.materialColors.set(g3d.materialColors, cursor.material * G3d.COLOR_SIZE)
  }

  ToG3d(){
    return new G3d(
      this.instanceMeshes,
      this.instanceFlags,
      this.instanceTransforms,
      this.instanceNodes,
      this.meshSubmeshes,
      this.submeshIndexOffsets,
      this.submeshMaterials,
      this.indices,
      this.positions,
      this.materialColors
    )
  }
}