/** Exact CPU blur used by the static renderer, available without DOM APIs.
 * Preserve the Float32 intermediates and pass order so worker pixels match qf.
 */
export function gridBlurPlane(i,o,f,r) {
  if(i.length!==o*f||o<1||f<1)throw new Error('Invalid alpha plane');
  if(r<=0)return i.slice();
  let s=Math.floor(Math.sqrt(4*r*r+1));
  s%2===0&&s--,s=Math.max(1,s);
  const h=Math.round((12*r*r-3*s*s-12*s-9)/(-4*s-4));
  let v=Float32Array.from(i);
  const S=new Float32Array(i.length),T=new Float32Array(i.length),columnSums=new Float64Array(o);
  for(let _=0;_<3;_++) {
    const b=((_<h?s:s+2)-1)/2;
    if(b===0)continue;
    const m=b*2+1;
    for(let x=0;x<f;x++) {
      const D=x*o;let Y=0;
      for(let V=-b;V<=b;V++)Y+=v[D+Math.max(0,Math.min(o-1,V))];
      for(let V=0;V<o;V++) {
        S[D+V]=Y/m;
        Y+=v[D+Math.min(o-1,V+b+1)]-v[D+Math.max(0,V-b)];
      }
    }
    // Keep each column's running sum in Float64, like the original Number D,
    // while traversing complete rows. The arithmetic within a column remains
    // identical, and the large Float32 planes are read/written contiguously.
    for(let x=0;x<o;x++) {
      let D=0;
      for(let Y=-b;Y<=b;Y++)D+=S[Math.max(0,Math.min(f-1,Y))*o+x];
      columnSums[x]=D;
    }
    for(let Y=0;Y<f;Y++) {
      const row=Y*o,add=Math.min(f-1,Y+b+1)*o,remove=Math.max(0,Y-b)*o;
      for(let x=0;x<o;x++) {
        const D=columnSums[x];
        T[row+x]=D/m;
        columnSums[x]=D+(S[add+x]-S[remove+x]);
      }
    }
    v.set(T);
  }
  return Uint8ClampedArray.from(v);
}
