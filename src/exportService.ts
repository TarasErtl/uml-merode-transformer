import * as Handlebars from 'handlebars';
import { MerodeIR } from '../types/metamodels/merode';
import { mxpTemplateContent } from './mxpTemplate';
import { mapMerodeToMxpData } from './merodeToMxpMapper';
import JSZip from 'jszip';

export const exportToMxp = async (merodeIR: MerodeIR) => {
  const template = Handlebars.compile(mxpTemplateContent);
  const data = mapMerodeToMxpData(merodeIR);
  const xmlString = template(data);

  const zip = new JSZip();
  zip.file('model.mxp', xmlString);
  zip.folder('images');
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Download triggering
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${merodeIR.model.name || 'model'}.mxp`;
  a.click();
  URL.revokeObjectURL(url);
};