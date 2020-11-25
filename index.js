/**
 * @file zEdit Patcher - Randomizes the effects of alchemy ingredients.
 * @author ChrRubin
 * @version 1.0.1
 * @license MIT
 * @copyright ChrRubin 2020
 */

/* global info, xelib, registerPatcher, patcherUrl, patcherPath, fh */

const logByIngrPath = `${patcherPath}\\logByIngredients.txt`;
const logByEffectsPath = `${patcherPath}\\logByEffects.txt`;

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
        this.efidLink = xelib.GetWinningOverride(xelib.GetLinksTo(handle, "EFID"));

        /** @type {string} FormID of linked effect record */
        this.formID = xelib.GetHexFormID(this.efidLink);

        /** @type {string} Name of linked effect record */
        this.name = xelib.FullName(this.efidLink);

        /** @type {string} Magnitude of effect rounded to 6 decimal places */
        this.magnitude = xelib.GetFloatValue(handle, "EFIT\\Magnitude").toFixed(6);

        /** @type {number} Area of effect */
        this.area = xelib.GetUIntValue(handle, "EFIT\\Area");

        /** @type {number} Duration of effect */
        this.duration = xelib.GetUIntValue(handle, "EFIT\\Duration");
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

        /** @type {UniqueFormIDsObj[]} */
        this.clonedUniqueFormIDs = [...this.uniqueFormIDs];

        this._paralysisFormID = "00073F30";
    }

    /**
     * Gets the first effect with the highest occurence in the list.
     * @param {number} i Index of resulting effect. Used to prevent paralysis from being the first effect.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getFirstMostOccurrence(i) {
        /** @type {UniqueFormIDsObj} */
        let most;

        let uniqueFormIDs = this.uniqueFormIDs;
        if (i === 0) {
            uniqueFormIDs = this.uniqueFormIDs.filter(obj => obj.formID !== this._paralysisFormID);
        }

        uniqueFormIDs.forEach(obj => {
            if (!most || obj.count > most.count) {
                most = obj;
            }
        });

        return this.find(most.formID);
    }

    /**
     * Gets one unique effect. This function will only return each unique effect once, and will return 0 if no unique effect remains. 
     * @param {number} i Index of resulting effect. Used to prevent paralysis from being the first effect.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getUniqueEffect(i) {
        if (this.clonedUniqueFormIDs.length < 1) {
            return 0;
        }

        let uniqueEffect;
        if (i === 0 && this.clonedUniqueFormIDs[0].formID === this._paralysisFormID && this.clonedUniqueFormIDs.length === 1) {
            return 0;
        }
        else if (i === 0 && this.clonedUniqueFormIDs[0].formID === this._paralysisFormID) {
            uniqueEffect = this.clonedUniqueFormIDs[1];
            this.clonedUniqueFormIDs.splice(1, 1);
        }
        else {
            uniqueEffect = this.clonedUniqueFormIDs.shift();
        }

        return this.find(uniqueEffect.formID);
    }

    /**
     * Get random effect from list. This is affected by the effect distribution.
     * @param {number} i Index of resulting effect. Used to prevent paralysis from being the first effect.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getRandomFromPool(i) {
        let pool = this.list;
        if (i === 0) {
            pool = this.list.filter(ingrEffect => ingrEffect.formID !== this._paralysisFormID);
        }

        const iRandom = Math.floor(Math.random() * pool.length);
        return this.find(pool[iRandom].formID);
    }

    /**
     * Get random effect from list. This is NOT affected by the effect distribution.
     * @param {number} i Index of resulting effect. Used to prevent paralysis from being the first effect.
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    getRandomEffect(i) {
        let uniqueFormIDs = this.uniqueFormIDs;
        if (i === 0) {
            uniqueFormIDs = this.uniqueFormIDs.filter(obj => obj.formID !== this._paralysisFormID);
        }

        const iUnique = Math.floor(Math.random() * uniqueFormIDs.length);
        this.list = shuffleArray(this.list);
        return this.find(uniqueFormIDs[iUnique].formID);
    }

    /**
     * Find first effect with FormID that matches formID
     * @param {string} formID FormID
     * @return {GetResultObj} Result
     * @memberof IngrEffectList
     */
    find(formID){
        let resultIndex;
        const value = this.list.find((effect, index) => {
            if(effect.formID === formID){
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
        controller: function($scope) {
            const settings = $scope.settings.randomizeAlchemyPatcher;

            $scope.showLogByIngredients = () => {
                if (!fh.jetpack.exists(logByIngrPath)){
                    alert("Log file does not exist!");
                    return;
                }
                fh.openFile(logByIngrPath);
            };
            $scope.showLogByEffects = () => {
                if (!fh.jetpack.exists(logByEffectsPath)){
                    alert("Log file does not exist!");
                    return;
                }
                fh.openFile(logByEffectsPath);
            };

            $scope.$watch("settings.randomizeAlchemyPatcher.randType", (newValue) => {
                if(["groups", "distribution"].includes(newValue)){
                    settings.ignoreDist = false;
                }
            });
        },
        defaultSettings: {
            randType: "groups",
            ignoreDist: false,
            setEsl: true,
            showLog: false,
            patchFileName: 'RandomAlchemyPatch.esp'
        }
    },
    execute: (patchFile, helpers, settings, locals) => ({
        initialize: () => {
            const ingrs = helpers.loadRecords("INGR", false);
            if (!ingrs.length){
                throw new ChrCustomError("Failed to load INGR records!");
            }

            // Stores output log strings
            locals.logByIngredients = []; 
            locals.logByEffects = [];

            const dateLog = `${new Date().toString()}\n`;

            locals.logByIngredients.push(dateLog);
            locals.logByEffects.push(dateLog);

            const settingsLog = `PATCHER SETTINGS:\nIgnored files: ${settings.ignoredFiles.join(", ")}\nRandomization type: ${settings.randType}\nignoreDist: ${settings.ignoreDist}\nsetEsl: ${settings.setEsl}\npatchFileName: ${settings.patchFileName}\n`;
            helpers.logMessage(settingsLog);
            locals.logByIngredients.push(settingsLog);
            locals.logByEffects.push(settingsLog);

            if (settings.randType === "groups") {
                const effectGroups = [];
                ingrs.forEach(ingr => {
                    effectGroups.push(xelib.GetElement(ingr, "Effects"));
                });

                locals.effectGroups = shuffleArray(effectGroups);
                locals.index = 0;
            }
            else if (["distribution", "inclusion", "noInclusion"].includes(settings.randType)){
                const effects = [];
                ingrs.forEach(ingr => {
                    xelib.GetElements(ingr, "Effects").forEach(effect => {
                        effects.push(effect);
                    });
                });

                locals.effectList = new IngrEffectList(shuffleArray(effects));
            }
            else{
                throw new ChrCustomError("Invalid randomization type selected!");
            }

            locals.ingrs = ingrs;
        },
        process: [{
            records: (filesToPatch, helpers, settings, locals) => {
                return shuffleArray(locals.ingrs);
            },
            patch: (record, helpers, settings, locals) => {
                const formid = xelib.GetHexFormID(record);
                helpers.logMessage(`Patching ${formid}...`);

                const recordEffectsElement = xelib.GetElement(record, "Effects");

                if (settings.randType === "groups"){
                    const newEffectGroup = locals.effectGroups[locals.index];
                    xelib.SetElement(recordEffectsElement, newEffectGroup);
                    locals.index += 1;
                    return;
                }

                /** @type {IngrEffect[]} */
                const addedEffects = [];
                /** @type {IngrEffectList} */
                const effectList = locals.effectList;
                let i = 0;

                function getRandom(i) {
                    if (settings.ignoreDist) {
                        return effectList.getRandomEffect(i);
                    }
                    return effectList.getRandomFromPool(i);
                }

                while (i < 4) {
                    /** @type {GetResultObj} */
                    let result;

                    if (settings.randType === "distribution" && i === 0) {
                        result = effectList.getFirstMostOccurrence(i);
                    }
                    else if (settings.randType === "distribution") {
                        result = effectList.getRandomFromPool(i);
                    }
                    else if (settings.randType === "inclusion" && i === 0) {
                        result = effectList.getUniqueEffect(i);
                        if (!result) {
                            result = getRandom(i);
                        }
                    }
                    else {
                        result = getRandom(i);
                    }

                    const resultIndex = result.index;
                    const resultEffect = result.value;
                    
                    if (addedEffects.some(effect => effect.isDuplicate(resultEffect))){
                        continue;
                    }
                    
                    addedEffects.push(resultEffect);
                    if (settings.randType === "distribution") {
                        effectList.remove(resultIndex);
                    }

                    const recordEffect = xelib.GetElement(recordEffectsElement, `[${i}]`);
                    xelib.SetElement(recordEffect, resultEffect.handle);
                    i += 1;
                }
            }
        }],
        finalize: () => {
            helpers.logMessage(`Setting ESL flag to ${settings.setEsl}...`);
            xelib.SetRecordFlag(xelib.GetFileHeader(patchFile), "ESL", settings.setEsl);

            helpers.logMessage("Generating logs...");

            /**
             * @typedef {Object} LogByEffectsObj
             * @property {IngrEffect} effect Effect
             * @property {string[]} ingrs Array of ingredient names
             */
            /** @type {LogByEffectsObj[]} */
            const logByEffectsList = [];

            xelib.GetElements(patchFile, "INGR").sort((a, b) => xelib.GetFormID(a) - xelib.GetFormID(b)).forEach(ingr => {
                const formid = xelib.GetHexFormID(ingr);
                const masterIngr = xelib.GetMasterRecord(ingr);
                const ingrName = xelib.FullName(ingr);

                locals.logByIngredients.push("==============================");
                locals.logByIngredients.push(`INGR: ${ingrName} [${formid}]\n`);

                /** @type {IngrEffect[]} */
                const originalEffects = xelib.GetElements(masterIngr, "Effects").map(effect => new IngrEffect(effect));
                locals.logByIngredients.push(`Original effects:`);
                originalEffects.forEach(ingrEffect => {
                    locals.logByIngredients.push(`- ${ingrEffect.name} (M: ${ingrEffect.magnitude}, A: ${ingrEffect.area}, D: ${ingrEffect.duration})`);

                    if(logByEffectsList.some(({effect}) => effect.isDuplicate(ingrEffect))){
                        return;
                    }
                    logByEffectsList.push({effect: ingrEffect, ingrs: []});
                });
                locals.logByIngredients.push("");

                /** @type {IngrEffect[]} */
                const currentEffects = xelib.GetElements(ingr, "Effects").map(effect => new IngrEffect(effect));
                locals.logByIngredients.push(`New effects:`);
                currentEffects.forEach(ingrEffect => {
                    locals.logByIngredients.push(`- ${ingrEffect.name} (M: ${ingrEffect.magnitude}, A: ${ingrEffect.area}, D: ${ingrEffect.duration})`);

                    const findResult = logByEffectsList.find(({effect}) => effect.isDuplicate(ingrEffect));
                    if(findResult){
                        findResult.ingrs.push(ingrName);
                        return;
                    }
                    logByEffectsList.push({effect: ingrEffect, ingrs: [ingrName]});
                });
                locals.logByIngredients.push("");
            });

            logByEffectsList.sort((a, b) => a.effect.name.localeCompare(b.effect.name)).forEach(obj => {
                locals.logByEffects.push("==============================");
                locals.logByEffects.push(`Effect: ${obj.effect.name} [${obj.effect.formID}]\n`);
                locals.logByEffects.push(`Count: ${obj.ingrs.length}`);
                obj.ingrs.sort().forEach(name => locals.logByEffects.push(`- ${name}`));
                locals.logByEffects.push("");
            });

            helpers.logMessage(`Saving log files...`);
            fh.saveTextFile(logByIngrPath, locals.logByIngredients.join("\n"));
            fh.saveTextFile(logByEffectsPath, locals.logByEffects.join("\n"));

            if(settings.showLog){
                helpers.logMessage("Opening log files...");
                fh.openFile(logByIngrPath);
                fh.openFile(logByEffectsPath);
            }
        }
    })
});
