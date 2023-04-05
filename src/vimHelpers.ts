import { VimDocument } from "./objectModel"

/**
 * Representation of ElementParamter entity from the entity model
 * See https://github.com/vimaec/vim/blob/master/ObjectModel/object-model-schema.json
 */
export type ElementParameter = {
  name: string | undefined
  value: string | undefined
  group: string | undefined
  isInstance: boolean
}
  
  /**
   * Returns all parameters of an element and of its family type and family
   * @param element element index
   * @returns An array of paramters with name, value, group
   */
  export async function getElementParameters (document: VimDocument, element: number) {
    const [instances, family] = await Promise.all([
      getElementsParameters(document, [element], true),
      getFamilyParameters(document, element)
    ])
    
    return [...instances, ...family]
  }

  export async function getFamilyParameters(document: VimDocument, element: number){
    const familyInstance = await getElementFamilyInstance(document, element)

    const familyType = Number.isInteger(familyInstance)
      ? await document.familyInstance.getFamilyTypeIndex(familyInstance)
      : undefined

    const [family, familyTypeElement] = Number.isInteger(familyType)
      ? await Promise.all([
        document.familyType.getFamilyIndex(familyType), 
        document.familyType.getElementIndex(familyType)
      ])
      : undefined

    const familyElement = Number.isInteger(family)
      ? await document.family.getElementIndex(family)
      : undefined

    return getElementsParameters(document, [familyElement, familyTypeElement], false)
  }

  export async function getElementsParameters (document: VimDocument, elements: number[], isInstance: boolean) {
    const parameterElement = await document.parameter.getAllElementIndex()
    if (!parameterElement) return undefined

    const getParameterDisplayValue = async (index: number) => {
      const value = await document.parameter.getValue(index)
      const parts = value
        ?.split('|')
        .filter((s) => s.length > 0)
      const displayValue = parts?.[parts.length - 1] ?? parts?.[0]
      return displayValue
    }

    const set = new Set(elements)
    const parameters : number[] =[]
    parameterElement.forEach((e,i) => {
      if(set.has(e)){
        parameters.push(i)
      }
    })

    const result = await Promise.all(
      parameters.map(async (i) => {
        
        const [descriptor, value] = await Promise.all([
          document.parameter.getParameterDescriptorIndex(i),
          getParameterDisplayValue(i)
        ])
        
        const [name, group] = Number.isInteger(descriptor) ? await Promise.all(
        [
          document.parameterDescriptor.getName(descriptor),
          document.parameterDescriptor.getGroup(descriptor),
        ]) : [undefined, undefined]

        return {name, value, group, isInstance} as ElementParameter
      }) 
    )
    
    return result
  }

  async function getElementFamilyInstance (document: VimDocument, element: number) {
    const familyInstanceElement = await document.familyInstance.getAllElementIndex()
    const result = familyInstanceElement.findIndex(e => e === element)
    return result < 0 ? undefined : result
  }

  