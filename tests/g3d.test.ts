import { g3dAreEqual, instanceAreEqual, loadG3d } from "./helpers"

describe('G3d', () =>{
  test('g3d.append', async () =>{
    const g3d = await loadG3d()

    for(let i = 0; i < g3d.getInstanceCount(); i++ ){
      const slice = g3d.slice(i)
      const merge = slice.append(slice)
      instanceAreEqual(merge, 0, g3d, i)
      instanceAreEqual(merge, 1, g3d, i)
    }
  })
  
  test('g3d.equals (all)', async () =>{
    const g3d = await loadG3d()
    expect(g3dAreEqual(g3d, g3d)).toBeTruthy()
  })

  test('g3d.filter (each)', async () => {
    const g3d = await loadG3d()

    for(let i = 0; i < g3d.getInstanceCount() ; i++){
      const filter = g3d.filter([i])
      const slice = g3d.slice(i)
      expect(g3dAreEqual(filter, slice)).toBeTruthy()
    }
  })

  test('g3d.filter (all)', async () => {
    const g3d = await loadG3d()

    const instances = g3d.instanceMeshes.map((_,i) => i)
    const filter = g3d.filter([...instances])
    expect(g3dAreEqual(filter, g3d)).toBeTruthy()
  })
  
  test('g3d.filter (2)', async () =>{
    const g3d = await loadG3d()
    
    for(let i =1; i < g3d.getInstanceCount()-1; i ++){

      const value = g3d.filter([i -1, i])
      const expected = g3d.slice(i-1).append(g3d.slice(i))
      g3dAreEqual(value, expected)
      }
  })
})
