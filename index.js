/**
 * @file zEdit Patcher - Randomizes the effects of alchemy ingredients.
 * @author ChrRubin
 * @version 1.0
 * @license MIT
 * @copyright ChrRubin 2020
 */

/* global info, xelib, registerPatcher, patcherUrl */

class ChrCustomError extends Error {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ChrCustomError);
        }
        this.name = "ChrCustomError";
    }
}

class IngrEffect {
    constructor(handle){
        /** @type {number} Handle to effect element */
        this.handle = handle;

        /** @type {number} Handle to linked effect record */
        this.efidLink = xelib.GetLinksTo(handle, "EFID");

        /** @type {string} FormID of effect record */
        this.formID = xelib.GetHexFormID(this.efidLink);

        /** @type {string} EditorID of effect record */
        this.editorID = xelib.EditorID(this.efidLink);
    }

    /**
     * Check if given effect is the same as this effect.
     * @param {IngrEffect} effect
     * @return {boolean} True if effect is duplicate.
     * @memberof IngrEffect
     */
    isDuplicate(effect){
        return effect.formID === this.formID;
    }
}

class IngrEffectList {
    /**
     * @typedef {Object} UniqueFormIDsObj
     * @property {string} formID FormID
     * @property {number} count Number of occurences
     */
    /**
     * @typedef {Object} GetResultObj
     * @property {number} index Index of result in list
     * @property {IngrEffect} value Value of effect
     */

    /**
     * Creates an instance of IngrEffectList.
     * @param {number[]} handles Array of effect handles
     * @memberof IngrEffectList
     */
    constructor(handles){
        const formIdSet = new Set();

        /** @type {IngrEffect[]} */
        this.list = handles.map(handle => {
            const ingrEffect = new IngrEffect(handle);
            formIdSet.add(ingrEffect.formID);
            return ingrEffect;
        });

        /** @type {UniqueFormIDsObj[]} */
        this.uniqueFormIDs = [];

        formIdSet.forEach(formID => {
            let count = 0;
            this.list.forEach(effect => {
                if(effect.formID === formID){
                    count += 1;
                }
            });
            this.uniqueFormIDs.push({formID: formID, count: count});
        });
    }
    
    /**
     * Get random effect from list.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getRandom(){
        const i = Math.floor(Math.random() * this.list.length);
        return {index: i, value: this.list[i]};
    }

    /**
     * Gets the first effect with the highest occurence in the list.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getFirstMostOccurrence(){
        let most, resultIndex;
        this.uniqueFormIDs.forEach(obj => {
            if(!most || obj.count > most.count){
                most = obj;
            }
        });

        const value = this.list.find((effect, index) => {
            if(effect.formID === most.formID){
                resultIndex = index;
                return true;
            }
        });

        return {index: resultIndex, value: value};
    }

    /**
     * Removes effect on index i from list.
     * @param {number} i Index of effect
     * @memberof IngrEffectList
     */
    remove(i){
        const effect = this.list[i];
        this.uniqueFormIDs.forEach(obj => {
            if(obj.formID === effect.formID){
                obj.count -= 1;
            }
        });
        this.list.splice(i, 1);
    }
}

/**
 * Shuffles array.
 * Source: https://gist.github.com/guilhermepontes/17ae0cc71fa2b13ea8c20c94c5c35dc4
 * @param {any[]} array Original array
 * @returns {any[]} Shuffled array
 */
function shuffleArray(array) {
    return array.map(a => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
}

registerPatcher({
    info: info,
    gameModes: [xelib.gmSSE, xelib.gmTES5],
    settings: {
        label: 'Alchemy Effects Randomizer',
        templateUrl: `${patcherUrl}/partials/settings.html`,
        defaultSettings: {
            randType: "groups",
            setEsl: true,
            patchFileName: 'RandomAlchemyPatch.esp'
        }
    },
    execute: (patchFile, helpers, settings, locals) => ({
        initialize: () => {
            const ingrs = helpers.loadRecords("INGR", false);
            if (!ingrs.length){
                throw new ChrCustomError("Failed to load INGR records!");
            }

            const winningIngrs = ingrs.map(ingr => xelib.GetWinningOverride(ingr));

            if (settings.randType === "groups"){
                const effectGroups = [];
                winningIngrs.forEach(ingr => {
                    effectGroups.push(xelib.GetElement(ingr, "Effects"));
                });

                locals.effectGroups = shuffleArray(effectGroups);
                locals.index = 0;
            }
            else if (settings.randType === "dist" || settings.randType === "random"){
                const effects = [];
                winningIngrs.forEach(ingr => {
                    xelib.GetElements(ingr, "Effects").forEach(effect => {
                        effects.push(effect);
                    });
                });

                locals.effects = new IngrEffectList(shuffleArray(effects));
            }
            else{
                throw new ChrCustomError("Invalid randomization type selected!");
            }

            locals.winningIngrs = winningIngrs;
        },
        process: [{
            records: (filesToPatch, helpers, settings, locals) => {
                return shuffleArray(locals.winningIngrs);
            },
            patch: (record, helpers, settings, locals) => {
                const formid = xelib.GetHexFormID(record);
                helpers.logMessage(`Patching ${formid}...`);

                const recordEffects = xelib.GetElement(record, "Effects");

                if (settings.randType === "groups"){
                    xelib.SetElement(recordEffects, locals.effectGroups[locals.index]);
                    locals.index += 1;
                    return;
                }

                /** @type {IngrEffect[]} */
                const addedEffects = [];
                let i = 0;

                while (i < 4) {
                    /** @type {GetResultObj} */
                    let result;

                    if (settings.randType === "dist" && i === 0){ 
                        result = locals.effects.getFirstMostOccurrence(); 
                    }
                    else{
                        result = locals.effects.getRandom();
                    }

                    const resultIndex = result.index;
                    const resultEffect = result.value;
                    
                    if (addedEffects.some(effect => effect.isDuplicate(resultEffect))){
                        continue;
                    }
                    
                    addedEffects.push(resultEffect);
                    if (settings.randType === "dist"){
                        locals.effects.remove(resultIndex);
                    }

                    const recordEffect = xelib.GetElement(recordEffects, `[${i}]`);
                    xelib.SetElement(recordEffect, resultEffect.handle);
                    i += 1;
                }
            }
        }],
        finalize: () => {
            helpers.logMessage(`Setting ESL flag to ${settings.setEsl}.`);
            xelib.SetRecordFlag(xelib.GetFileHeader(patchFile), "ESL", settings.setEsl);
        }
    })
});
