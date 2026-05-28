export const mxpTemplateContent = `<?xml version="1.0" encoding="UTF-8"?>
<mxp:mermaidmodel xmlns:mxp="http://merode.econ.kuleuven.ac.be/mermaid/mxp/1.5" mxp.version="1.7" jmermaid.version="1.0" timestamp="{{timestamp}}">
  <mxp:metamodel lastid="{{lastId}}">
    <mxp:datatypes/>
    <mxp:metaobjects>
      {{#each metaobjects}}
      <mxp:metaobject id="{{id}}" name="{{name}}" abstract="{{abstract}}">
        <mxp:metadescription/>
        <mxp:metaconstraints/>
        <mxp:metamultiplepropagationconstraints/>
        <mxp:metaattributes>
          {{#each attributes}}
          <mxp:metaattribute id="{{id}}" name="{{name}}" type="{{type}}">
            <mxp:description/>
            <mxp:validation/>
            <mxp:implementation/>
          </mxp:metaattribute>
          {{/each}}
        </mxp:metaattributes>
        <mxp:metafsms>
          <mxp:metafsm id="{{fsm.id}}" name="DEFAULT" type="DEFAULT" codegeneration="true">
            <mxp:metastates>
              <mxp:metastate id="{{fsm.initialId}}" name="initial" type="INITIAL_STATE"/>
              <mxp:metastate id="{{fsm.existsId}}" name="exists" type="STATE"/>
              <mxp:metastate id="{{fsm.endedId}}" name="ended" type="FINAL_STATE"/>
            </mxp:metastates>
            <mxp:metatransitions>
              <mxp:metatransition id="{{fsm.t1Id}}" name="initialExists" sourcestateid="{{fsm.initialId}}" targetstateid="{{fsm.existsId}}">
                <mxp:metatransitionmethods>
                  <mxp:metatransitionmethod safeid="{{fsm.t1SafeId}}" methodid="{{fsm.crMethodId}}" methodname="MEcr{{name}}"/>
                </mxp:metatransitionmethods>
              </mxp:metatransition>
              <mxp:metatransition id="{{fsm.t2Id}}" name="existsEnded" sourcestateid="{{fsm.existsId}}" targetstateid="{{fsm.endedId}}">
                <mxp:metatransitionmethods>
                  <mxp:metatransitionmethod safeid="{{fsm.t2SafeId}}" methodid="{{fsm.endMethodId}}" methodname="MEend{{name}}"/>
                </mxp:metatransitionmethods>
              </mxp:metatransition>
              {{#if fsm.acquiredMethods.length}}
              <mxp:metatransition id="{{fsm.t3Id}}" name="existsExists" sourcestateid="{{fsm.existsId}}" targetstateid="{{fsm.existsId}}">
                <mxp:metatransitionmethods>
                  {{#each fsm.acquiredMethods}}
                  <mxp:metatransitionmethod safeid="{{safeId}}" methodid="{{methodId}}" methodname="{{methodName}}"/>
                  {{/each}}
                </mxp:metatransitionmethods>
              </mxp:metatransition>
              {{/if}}
            </mxp:metatransitions>
          </mxp:metafsm>
        </mxp:metafsms>
      </mxp:metaobject>
      {{/each}}
    </mxp:metaobjects>
    <mxp:metaevents>
      {{#each metaevents}}
      <mxp:metaevent id="{{id}}" name="{{name}}">
        <mxp:metadescription/>
        <mxp:metaattributes/>
      </mxp:metaevent>
      {{/each}}
    </mxp:metaevents>
    <mxp:metaspecialisedevents/>
    <mxp:metadependencies>
      {{#each metadependencies}}
      <mxp:metadependency id="{{id}}" name="{{name}}" type="{{type}}" master="{{master}}" dependent="{{dependent}}" masterrole="{{masterRole}}" dependentrole="{{dependentRole}}"/>
      {{/each}}
    </mxp:metadependencies>
    <mxp:metainheritances>
      {{#each metainheritances}}
      <mxp:metainheritance id="{{id}}" supertypeid="{{supertypeId}}" subtypeid="{{subtypeId}}"/>
      {{/each}}
    </mxp:metainheritances>
    <mxp:metamethods>
      {{#each metamethods}}
      <mxp:metamethod id="{{id}}" name="{{name}}" provenance="{{provenance}}" type="{{type}}" ownerobjectid="{{ownerObjectId}}" ownereventid="{{ownerEventId}}" {{#if viaMethod}}viamethod="{{viaMethod}}"{{/if}} {{#if viaDependency}}viadependency="{{viaDependency}}"{{/if}} {{#if viaInheritance}}viainheritance="{{viaInheritance}}"{{/if}}>
        <mxp:metaprecondition/>
        <mxp:metaimplementation/>
        <mxp:metapostcondition/>
        <mxp:metaattributes/>
      </mxp:metamethod>
      {{/each}}
    </mxp:metamethods>
  </mxp:metamodel>
  <mxp:guimodel currentview="1" topview.lastid="1">
    <mxp:view id="1" name="Main" isdefault="true">
      <mxp:guidescription>The main view</mxp:guidescription>
      <mxp:guiobjects>
        {{#each guiobjects}}
        <mxp:guiobject refid="{{refid}}" location="{{x}}!{{y}}" size="100.00!50.00" borderthickness="1" bordercolor="0-0-0" backgroundcolor="255-255-255" gradientcolor="null" textcolor="0-0-0" fontfamily="Arial" fontsize="12" fontbold="false" fontitalic="false"/>
        {{/each}}
      </mxp:guiobjects>
    </mxp:view>
  </mxp:guimodel>
</mxp:mermaidmodel>`;