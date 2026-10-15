/** Clear selection after a source/scale change without invalidating an empty mask.
 * React can skip the second canvas render when the returned state is identical.
 */
export function resetRibbonMask(mask, width=600, height=600) {
  const size=width*height;
  if(mask?.length===size && !mask.some(value=>value!==0)) return mask;
  return new Uint8ClampedArray(size);
}
