import { MerodeIR } from '../types/metamodels/merode';

class MxpIdGenerator {
  private current = 1;
  next() { return this.current++; }
  get last() { return this.current - 1; }
}

const mapMultiplicity = (mult: string): string => {
  if (mult === '1..1') return 'MANDATORY_1';
  if (mult === '0..1') return 'OPTIONAL_1';
  if (mult === '1..*' || mult === '1..n') return 'MANDATORY_N';
  return 'OPTIONAL_N';
};

// Sanitizes names by removing spaces, hyphens, and underscores and converting to PascalCase.
const sanitizeName = (name: string): string => {
  if (!name) return 'Unnamed';
  let sanitized = name.split(/[\s\-_]+/)
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
    
  if (/^[0-9]/.test(sanitized)) sanitized = 'N' + sanitized;
  return sanitized || 'Unnamed';
};

export const mapMerodeToMxpData = (ir: MerodeIR) => {
  const idGen = new MxpIdGenerator();

  const elements = ir.model.elements;
  const classes = elements.filter(e => e.type === 'merode:Class' || (e as any).attributes !== undefined);
  const associations = elements.filter(e => e.type === 'merode:Association' || (e as any).masterClassId !== undefined);

  const classMap = new Map<string, any>();

  const metaobjects: any[] = [];
  const metaevents: any[] = [];
  const metadependencies: any[] = [];
  const metainheritances: any[] = [];
  const metamethods: any[] = [];
  const guiobjects: any[] = [];

  // 1. Process Classes (Objects, Events, Owned Methods)
  classes.forEach((cls: any, index: number) => {
    const className = sanitizeName(cls.name);

    // Determine if the class is abstract by checking if it acts as an abstract master in a generalization
    const isClassAbstract = associations.some(
      (assoc: any) => assoc.masterClassId === cls.id && assoc.isGeneralization && assoc.isAbstract
    );

    const mxpId = idGen.next();
    
    const crEventId = idGen.next();
    const endEventId = idGen.next();
    
    metaevents.push({ id: crEventId, name: `EVcr${className}` });
    metaevents.push({ id: endEventId, name: `EVend${className}` });

    const crMethodId = idGen.next();
    const endMethodId = idGen.next();

    metamethods.push({
      id: crMethodId, name: `MEcr${className}`, provenance: 'OWNED', type: 'CREATE',
      ownerObjectId: mxpId, ownerEventId: crEventId
    });
    metamethods.push({
      id: endMethodId, name: `MEend${className}`, provenance: 'OWNED', type: 'END',
      ownerObjectId: mxpId, ownerEventId: endEventId
    });

    const classData = {
      mxpId,
      name: className,
      crEventId,
      endEventId,
      crMethodId,
      endMethodId,
      acquiredMethods: [] as any[]
    };
    classMap.set(cls.id, classData);

    const mappedAttributes = (cls.attributes || []).map((attr: any) => ({
      id: idGen.next(),
      name: sanitizeName(attr.name),
      type: attr.type || 'String'
    }));

    const fsm = {
      id: idGen.next(),
      initialId: idGen.next(),
      existsId: idGen.next(),
      endedId: idGen.next(),
      t1Id: idGen.next(),
      t1SafeId: idGen.next(),
      t2Id: idGen.next(),
      t2SafeId: idGen.next(),
      t3Id: idGen.next(),
      crMethodId,
      endMethodId,
      acquiredMethods: classData.acquiredMethods
    };

    metaobjects.push({
      id: mxpId,
      name: className,
      abstract: isClassAbstract,
      attributes: mappedAttributes,
      fsm
    });

    // Generate simple grid coordinates for GUI
    guiobjects.push({
      refid: mxpId,
      x: (index % 5) * 150,
      y: Math.floor(index / 5) * 100
    });
  });

  // 2. Process Associations
  associations.forEach((assoc: any) => {
    const master = classMap.get(assoc.masterClassId);
    const dependent = classMap.get(assoc.dependentClassId);

    if (!master || !dependent) return;

    if (assoc.isGeneralization) {
      // Inheritance
      const inhId = idGen.next();
      metainheritances.push({
        id: inhId,
        supertypeId: master.mxpId,
        subtypeId: dependent.mxpId
      });

      // Inherit the MEcr and MEend from supertype to subtype
      const inhCrMethodId = idGen.next();
      const inhEndMethodId = idGen.next();

      metamethods.push({
        id: inhCrMethodId, name: `MEcr${master.name}`, provenance: 'INHERITED', type: 'CREATE',
        ownerObjectId: dependent.mxpId, ownerEventId: master.crEventId,
        viaMethod: master.crMethodId, viaInheritance: inhId
      });
      metamethods.push({
        id: inhEndMethodId, name: `MEend${master.name}`, provenance: 'INHERITED', type: 'END',
        ownerObjectId: dependent.mxpId, ownerEventId: master.endEventId,
        viaMethod: master.endMethodId, viaInheritance: inhId
      });
    } else {
      // Normal Dependency
      const depId = idGen.next();
      const dependencyType = mapMultiplicity(assoc.multiplicity || '0..*');
      
      const rawAssocName = assoc.name ? assoc.name : `${master.name}To${dependent.name}`;
      const assocName = sanitizeName(rawAssocName);

      metadependencies.push({
        id: depId,
        name: assocName,
        type: dependencyType,
        master: master.mxpId,
        dependent: dependent.mxpId,
        masterRole: sanitizeName(assoc.roleName ? assoc.roleName : master.name),
        dependentRole: dependent.name
      });

      // Master acquires MEcr and MEend of Dependent
      const acqCrMethodId = idGen.next();
      const acqEndMethodId = idGen.next();

      metamethods.push({
        id: acqCrMethodId, name: `MEcr${dependent.name}`, provenance: 'ACQUIRED', type: 'MODIFY',
        ownerObjectId: master.mxpId, ownerEventId: dependent.crEventId,
        viaMethod: dependent.crMethodId, viaDependency: depId
      });
      master.acquiredMethods.push({
        safeId: idGen.next(),
        methodId: acqCrMethodId,
        methodName: `MEcr${dependent.name}`
      });

      metamethods.push({
        id: acqEndMethodId, name: `MEend${dependent.name}`, provenance: 'ACQUIRED', type: 'MODIFY',
        ownerObjectId: master.mxpId, ownerEventId: dependent.endEventId,
        viaMethod: dependent.endMethodId, viaDependency: depId
      });
      master.acquiredMethods.push({
        safeId: idGen.next(),
        methodId: acqEndMethodId,
        methodName: `MEend${dependent.name}`
      });
    }
  });

  return {
    timestamp: Date.now(),
    lastId: idGen.last,
    metaobjects,
    metaevents,
    metadependencies,
    metainheritances,
    metamethods,
    guiobjects
  };
};