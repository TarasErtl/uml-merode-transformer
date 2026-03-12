import { XMLParser } from 'fast-xml-parser';
import { logger } from './logger';

export const parseXmlToAny = (xmlString: string): any => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseTagValue: true,
    parseAttributeValue: true,
  });

  try {
    return parser.parse(xmlString);
  } catch (error) {
    logger.error("Fehler beim XML-Parsing:", error);
    return null;
  }
};