import type { MerodeIR } from '../types/metamodels/merode';

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

  // Keep track of globally created events by name to avoid duplicates
  const eventMap = new Map<string, number>();

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

    eventMap.set(`EVcr${className}`, crEventId);
    eventMap.set(`EVend${className}`, endEventId);

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
      acquiredMethods: [] as any[],
      inheritableMethods: [] as any[]
    };

    // Process user-defined operations / events
    if (cls.operations && Array.isArray(cls.operations)) {
      cls.operations.forEach((op: any) => {
        const opName = sanitizeName(op.name);
        const eventName = `EV${opName}`;
        let eventId = eventMap.get(eventName);
        
        if (!eventId) {
          eventId = idGen.next();
          metaevents.push({ id: eventId, name: eventName });
          eventMap.set(eventName, eventId);
        }

        const methodId = idGen.next();
        const methodName = `ME${opName}`;

        metamethods.push({
          id: methodId, name: methodName, provenance: 'OWNED', type: 'MODIFY',
          ownerObjectId: mxpId, ownerEventId: eventId
        });

        classData.acquiredMethods.push({
          safeId: idGen.next(),
          methodId: methodId,
          methodName: methodName
        });

        classData.inheritableMethods.push({
          eventId: eventId,
          methodId: methodId,
          methodName: methodName,
          type: 'MODIFY'
        });
      });
    }

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

    let posX = cls.position?.x ?? cls.x;
    let posY = cls.position?.y ?? cls.y;

    // Dynamically fetch the current positions directly from the React Flow DOM nodes
    try {
      const safeId = CSS.escape(String(cls.id));
      const safeName = CSS.escape(String(cls.name));
      
      let domNode = document.querySelector(`#merode-diagram-container .react-flow__node[data-id="${safeId}"]`) as HTMLElement;
      if (!domNode) domNode = document.querySelector(`#merode-diagram-container .react-flow__node[data-id="${safeName}"]`) as HTMLElement;
      
      if (domNode && domNode.style.transform) {
        const match = domNode.style.transform.match(/translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px/);
        if (match) {
          posX = parseFloat(match[1]);
          posY = parseFloat(match[2]);
        }
      }
    } catch (e) {
      // Ignore DOM errors
    }

    posX = posX ?? ((index % 5) * 150);
    posY = posY ?? (Math.floor(index / 5) * 100);

    // Apply a scaling factor to make the diagram twice as tight in the MXP tool
    const scaleFactor = 0.5;

    guiobjects.push({
      refid: mxpId,
      x: (Number(posX) * scaleFactor).toFixed(2),
      y: (Number(posY) * scaleFactor).toFixed(2)
    });
  });

  // 2. Process Associations
  const generalizations = associations.filter((a: any) => a.isGeneralization);
  const normalDependencies = associations.filter((a: any) => !a.isGeneralization);

  // Process normal dependencies first, so master classes acquire methods 
  // which can then be inherited down to subclasses
  normalDependencies.forEach((assoc: any) => {
    const master = classMap.get(assoc.masterClassId);
    const dependent = classMap.get(assoc.dependentClassId);

    if (!master || !dependent) return;

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
      master.inheritableMethods.push({
        eventId: dependent.crEventId,
        methodId: acqCrMethodId,
        methodName: `MEcr${dependent.name}`,
        type: 'MODIFY'
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
      master.inheritableMethods.push({
        eventId: dependent.endEventId,
        methodId: acqEndMethodId,
        methodName: `MEend${dependent.name}`,
        type: 'MODIFY'
      });
  });

  // Process generalizations in topological order to support multi-level inheritance
  let changed = true;
  const processedAssocs = new Set<string>();
  while (changed) {
    changed = false;
    for (const assoc of generalizations) {
      if (processedAssocs.has(assoc.id)) continue;

      // Wait until the master class has no unprocessed incoming generalizations
      const masterHasPendingIncoming = generalizations.some(
        (a: any) => a.dependentClassId === assoc.masterClassId && !processedAssocs.has(a.id)
      );

      if (!masterHasPendingIncoming) {
        processedAssocs.add(assoc.id);
        changed = true;

        const master = classMap.get(assoc.masterClassId);
        const dependent = classMap.get(assoc.dependentClassId);

        if (!master || !dependent) continue;

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

        dependent.inheritableMethods.push({
          eventId: master.crEventId,
          methodId: inhCrMethodId,
          methodName: `MEcr${master.name}`,
          type: 'CREATE'
        });
        dependent.inheritableMethods.push({
          eventId: master.endEventId,
          methodId: inhEndMethodId,
          methodName: `MEend${master.name}`,
          type: 'END'
        });

        // Inherit all other methods (user-defined and acquired)
        if (master.inheritableMethods) {
          master.inheritableMethods.forEach((udm: any) => {
            const inhMethodId = idGen.next();
            metamethods.push({
              id: inhMethodId, name: udm.methodName, provenance: 'INHERITED', type: udm.type,
              ownerObjectId: dependent.mxpId, ownerEventId: udm.eventId,
              viaMethod: udm.methodId, viaInheritance: inhId
            });
            
            if (udm.type === 'MODIFY') {
              dependent.acquiredMethods.push({
                safeId: idGen.next(),
                methodId: inhMethodId,
                methodName: udm.methodName
              });
            }

            // Allow subclass to pass down this method to its own subclasses
            dependent.inheritableMethods.push({
              eventId: udm.eventId,
              methodId: inhMethodId,
              methodName: udm.methodName,
              type: udm.type
            });
          });
        }
      }
    }
  }

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