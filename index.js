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
        // controller: function($scope) {
        //     let patcherSettings = $scope.settings.randomizeAlchemyPatcher;
        //     $scope.showRandTypeInfo = function() {

        //     };
        // },
        defaultSettings: {
            randType: "groups",
            setEsl: true,
            patchFileName: 'RandomAlchemyPatch.esp'
        }
    },
    execute: (patchFile, helpers, settings, locals) => ({
        initialize: () => {
            let ingrs = helpers.loadRecords("INGR", false);
            if (!ingrs.length){
                throw new ChrCustomError("Failed to load INGR records!");
            }

            let winningIngrs = ingrs.map(ingr => xelib.GetWinningOverride(ingr));

            if (settings.randType === "groups"){
                let effectGroups = [];
                winningIngrs.forEach(ingr => {
                    effectGroups.push(xelib.GetElement(ingr, "Effects"));
                });

                locals.effectGroups = shuffleArray(effectGroups);
                locals.index = 0;
            }
            else if (settings.randType === "dist" || settings.randType === "random"){
                let effects = [];
                winningIngrs.forEach(ingr => {
                    xelib.GetElement(ingr, "Effects").forEach(effect => {
                        effects.push(effect);
                    });
                });

                locals.effects = shuffleArray(effects);
            }
            else{
                throw new ChrCustomError("Invalid randomization type selected!");
            }

            locals.winningIngrs = winningIngrs;
        },
        process: [{
            records: (filesToPatch, helpers, settings, locals) => {
                return locals.winningIngrs;
            },
            patch: (record, helpers, settings, locals) => {
                let recordEffects = xelib.GetElement(record, "Effects");

                if (settings.randType === "groups"){
                    xelib.SetElement(recordEffects, locals.effectGroups[locals.index]);
                    locals.index += 1;
                    return;
                }

                let addedEffectsID = [];
                let i = 0;

                while (i < 4) {
                    let randomIndex = Math.floor(Math.random() * (locals.effects.length + 1));
                    let randomEffect = locals.effects[randomIndex];
                    let randomEffectID = xelib.GetHexFormID(xelib.GetLinksTo(randomEffect, "EFID"));

                    if (addedEffectsID.some(id => id === randomEffectID)){
                        continue; // FIXME: This is definitely a recipe for infinite loops...
                    }

                    addedEffectsID.push(randomEffectID);
                    if(settings.randType === "dist"){
                        locals.effects.splice(randomIndex, 1);
                    }

                    let recordEffect = xelib.GetElement(recordEffects, `[${i}]`);
                    xelib.SetElement(recordEffect, randomEffect);
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
