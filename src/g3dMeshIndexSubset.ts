import { MeshSection } from './g3d'
import { G3dMeshIndex } from './g3dMeshIndex'
import { G3dMeshCounts, G3dMeshOffsets } from './g3dMeshOffsets'

/**
 * Represents a filter applied to a G3dMeshIndex.
 */
export class G3dMeshIndexSubset
{
  index: G3dMeshIndex
  meshes: number[]
  instances : number[][]

  constructor(index: G3dMeshIndex, meshes: number[], meshToInstances? : number[][]){
    this.index = index
    this.meshes = meshes
    this.instances = meshToInstances
  }

  getMesh(index: number){
    return this.meshes[index]
  }

  /**
   * Returns index count for given mesh and section.
   */
  getMeshIndexCount(mesh: number, section: MeshSection){
    const instances = this.getMeshInstanceCount(mesh)
    const indices = this.index.getIndexCount(this.meshes[mesh], section)
    return indices * instances
  }

  /**
   * Returns vertext count for given mesh and section.
   */
  getMeshVertexCount(mesh: number, section: MeshSection){
    const instances = this.getMeshInstanceCount(mesh)
    const vertices =  this.index.getVertexCount(this.meshes[mesh], section)
    return vertices * instances
  }

  /**
   * Returns instance count for given mesh.
   * @param mesh The index of the mesh from the g3dIndex.
   */
  getMeshInstanceCount(mesh: number){
    return this.instances
      ? this.instances[mesh].length
      : this.index.meshInstanceCounts[this.meshes[mesh]] 
  }

   /**
   * Returns index-th mesh-based instance index for given mesh.
   * @param mesh The index of the mesh from the g3dIndex.
   */
  getMeshInstance(mesh: number, index:number){
    return this.instances
      ? this.instances[mesh][index]
      : index 
  }

  /**
   * Returns the list of mesh-based instance indices for given mesh or undefined if all instances are included.
   * @param mesh The index of the mesh from the g3dIndex.
   */
  getMeshInstances(mesh: number){
    return this.instances
      ? this.instances[mesh]
      : undefined
  }
  
  /**
   * Returns a new subset that only contains unique meshes.
   */
  filterUniqueMeshes(){
    return this.filterByCount(count => count === 1)
  }

  /**
   * Returns a new subset that only contains non-unique meshes.
   */
  filterNonUniqueMeshes(){
    return this.filterByCount(count =>count > 1)
  }

  private filterByCount(predicate : (i: number) => boolean){
    const filteredMeshes = new Array<number>()
    const filteredInstances = this.instances ? new Array<Array<number>>() : undefined
    this.meshes.forEach((m,i) => {
      if(predicate(this.getMeshInstanceCount(i))){
        filteredMeshes.push(m)
        filteredInstances?.push(this.instances[i])
      }
    })
    return new G3dMeshIndexSubset(this.index, filteredMeshes, filteredInstances)
  }

  /**
   * Returns offsets needed to build geometry.
   */
  getOffsets(section: MeshSection){
    return G3dMeshOffsets.fromSubset(this, section)
  }

  getAttributeCounts(section: MeshSection = 'all'){

    const counts = new G3dMeshCounts()
    counts.meshes = this.meshes.length

    this.meshes.forEach((m,i) =>{
      counts.instances += this.getMeshInstanceCount(i)
      counts.indices += this.getMeshIndexCount(i, section)
      counts.vertices += this.getMeshVertexCount(i, section)
    })

    return counts
  }
}
