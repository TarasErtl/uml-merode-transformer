import * as Handlebars from 'handlebars';
import { MerodeIR } from '../types/metamodels/merode';
import { mxpTemplateContent } from './mxpTemplate';
import { mapMerodeToMxpData } from './merodeToMxpMapper';
import JSZip from 'jszip';

/**
 * Exports a Merode Intermediate Representation (IR) to a .mxp file (ZIP format).
 * This involves mapping the IR to MXP data, rendering an XML template, and packaging it into a ZIP.
 */
export const exportToMxp = async (merodeIR: MerodeIR) => {
  // Compile the Handlebars template and map the IR data to the template structure
  const template = Handlebars.compile(mxpTemplateContent);
  const data = mapMerodeToMxpData(merodeIR);
  const xmlString = template(data);

  // Create a new ZIP archive containing the generated XML model and an empty images folder
  const zip = new JSZip();
  zip.file('model.mxp', xmlString);
  zip.folder('images');
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Create a temporary URL for the generated ZIP blob
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  // Set the filename and trigger the download by programmatically clicking the link
  a.download = `${merodeIR.model.name || 'model'}.mxp`;
  a.click();
  // Clean up the URL object to free up memory
  URL.revokeObjectURL(url);
};  