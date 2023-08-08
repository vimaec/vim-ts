import { G3d, MeshSection } from "./g3d"
import { G3dMeshIndexSubset } from "./g3dMeshIndexSubset"

export class G3dMeshCounts{
  instances : number = 0
  meshes: number = 0
  submeshes : number = 0
  indices : number = 0
  vertices : number = 0
}

export type MeshOffsets = G3dMeshOffsets | G3dMeshOffsetsVim 

/**
 * Holds the offsets needed to preallocate geometry for a given meshIndexSubset
 */
export class G3dMeshOffsets {
  // inputs
  subset: G3dMeshIndexSubset
  section: MeshSection

  // computed
  counts : G3dMeshCounts
  indexOffsets: Int32Array
  vertexOffsets: Int32Array

  /**
   * Computes geometry offsets for given subset and section
   * @param subset subset for which to compute offsets
   * @param section on of 'opaque' | 'transparent' | 'all'
   */
  static fromSubset (
    subset: G3dMeshIndexSubset,
    section: MeshSection){
      var result = new G3dMeshOffsets()
      result.subset = subset
      result.section = section

      function computeOffsets(getter: (mesh: number) => number){
        const meshCount = subset.meshes.length
        const offsets = new Int32Array(meshCount)
    
        for(let i=1; i < meshCount; i ++){
          offsets[i] = offsets[i-1] + getter(i-1)
        }
        return offsets
      }

      result.counts = subset.getAttributeCounts(section)
      result.indexOffsets = computeOffsets((m) => subset.getMeshIndexCount(m, section))
      result.vertexOffsets = computeOffsets((m) =>  subset.getMeshVertexCount(m, section))

      return result
  }

  /**
   * Returns how many instances of given meshes are the filtered view.
   */
  getMeshInstanceCount(mesh: number){
    return this.subset.getMeshInstanceCount(mesh)
  }

  /**
   * Returns instance for given mesh.
   * @mesh view-relative mesh index
   * @at view-relative instance index for given mesh
   * @returns mesh-relative instance index
   */
  getMeshInstance(mesh: number, at: number){
    return this.subset.getMeshInstance(mesh, at)
  }

  /**
   * Returns the vim-relative mesh index at given index 
   */
  getMesh(index: number){
    return this.subset.getMesh(index)
  }
}

/**
 * Holds the offsets needed to preallocate geometry for a given g3d
 * Used for backward support.
 */
export class G3dMeshOffsetsVim {
  // inputs
  g3d: G3d
  section: MeshSection
  merge : boolean

  // computed
  counts : G3dMeshCounts
  indexOffsets: Int32Array
  vertexOffsets: Int32Array

  static fromG3d(g3d: G3d, merge: boolean, section: MeshSection){
    const result = new G3dMeshOffsetsVim()
    result.g3d = g3d
    result.merge = merge
    result.section = section

    result.counts = new G3dMeshCounts()
    result.counts.instances = g3d.getInstanceCount()
    result.counts.meshes = g3d.getMeshCount()
    result.counts.submeshes = g3d.getSubmeshCount()
    result.counts.indices = g3d.getIndexCount()
    result.counts.vertices = g3d.getVertexCount()

    function computeOffsets(getter: (mesh: number) => number){
      const offsets = new Int32Array(g3d.getMeshCount())
  
      for(let i=1; i < offsets.length; i ++){
        offsets[i] = offsets[i-1] + getter(i-1)
      }
      return offsets
    }

    result.indexOffsets = computeOffsets((m) => g3d.getMeshIndexCount(m, section) * g3d.getMeshInstanceCount(m))
    result.vertexOffsets = computeOffsets((m) => g3d.getMeshVertexCount(m) * g3d.getMeshInstanceCount(m))
    return result
  }

  getMeshInstanceCount(mesh: number){
    if(!this.merge) return 1
    return this.g3d.getMeshInstanceCount(mesh)
  }

  getMeshInstance(mesh: number, index: number){
    return this.g3d.meshInstances[mesh][index]
  }

  getMesh(index: number){
    return index
  }
}