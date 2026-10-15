/** Cache only image formats that can be identified as still images.
 * Unknown or incomplete inputs keep the previous live-image rendering behavior.
 */
export function gridImageIsAnimated(bytes) {
  if(!(bytes instanceof Uint8Array))return true;
  const matches=(offset,text)=>offset+text.length<=bytes.length&&Array.from(text).every((character,index)=>bytes[offset+index]===character.charCodeAt(0));
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return false;
  if(matches(0,'BM'))return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length>=8&&bytes[0]===137&&matches(1,'PNG\r\n\x1a\n')) {
    let offset=8,header=false,image=false;
    while(offset+12<=bytes.length) {
      const length=view.getUint32(offset),end=offset+12+length;
      if(end>bytes.length)return true;
      if(matches(offset+4,'acTL'))return true;
      if(!header) {
        if(!matches(offset+4,'IHDR')||length!==13)return true;
        header=true;
      }else if(matches(offset+4,'IHDR'))return true;
      if(matches(offset+4,'IDAT'))image=true;
      if(matches(offset+4,'IEND'))return !(length===0&&header&&image&&end===bytes.length);
      offset=end;
    }
    return true;
  }
  if(bytes.length>=12&&matches(0,'RIFF')&&matches(8,'WEBP')) {
    const end=view.getUint32(4,true)+8;
    if(end!==bytes.length)return true;
    let offset=12,image=false;
    while(offset+8<=end) {
      const length=view.getUint32(offset+4,true),next=offset+8+length+(length%2);
      if(next>end)return true;
      if(matches(offset,'ANIM')||matches(offset,'ANMF'))return true;
      if(matches(offset,'VP8X')&&(length!==10||(bytes[offset+8]&2)!==0))return true;
      if((matches(offset,'VP8 ')||matches(offset,'VP8L'))&&length>0)image=true;
      offset=next;
    }
    return !(image&&offset===end);
  }
  return true;
}
