# Alchemy Effects Randomizer (zEdit Patcher)

A zEdit Patcher that randomizes the alchemy effects of all your alchemical ingredients. Supports different randomization options based on your preferred randomness!

More general info can be found on the [Nexus mods page](https://www.nexusmods.com/skyrimspecialedition/mods/41960).

## Technical Information

Every ingredient (`INGR`) record contains an `Effects` array which lists out the different effects that an ingredient has. Each effect element contains an `EFID` subrecord, which links to the base magical effect (`MGEF`) record of the effect, and an `EFIT` subrecord, which contains data about the magnitude, area and duration of the effect.

This patcher first gathers all loaded `INGR` records, collects all their effects, and randomly assigns effects back to the `INGR` records depending on the randomization type selected in the patcher settings.

The `EFIT` subrecords are collected alongside their respective effect elements, but are unmodified.

Before patching, the array of all loaded `INGR` records are shuffled before passing it to the zEdit UPF module to facilitate some of the randomization types. The patcher will also never assign duplicate effects onto the same `INGR` record.

### Keep Effect Groups (Least random)

As the simplest randomization type, when collecting effects the patcher collects the entire `Effects` array of every `INGR` record instead of collecting each effect element. The patcher then simply shuffles around the `Effects` arrays between all the `INGR` records.

### Keep Effect Distribution (More random)

When using this randomization type, the patcher keeps track of every unique FormID of effects in the `EFID` subrecord, as well as the quantity of which they appear in ingredients (also known as effect distribution).

During the patch process, the 1st effect assigned will always be the first effect that has the highest remaining quanitity. The remaining 3 effects are randomly selected.

Since the array of loaded `INGR` records are shuffled before passing it into the patch process, the result will still be random.

### Ensure Effect Inclusion (Even more random)

Similar to the previous randomization type, the patcher keeps track of every unique FormID of effects in the `EFID` subrecord.

During the patch process, the 1st effect assigned will always be a unique effect that has not yet been assigned until each effect has been assigned, of which case it will be randomly selected. The remaining 3 effects are always randomly selected.

Again, since the array of loaded `INGR` records are shuffled before passing it into the patch process, the result will still be random.

### Ignore Effect Inclusion (Most random)

Another pretty simple randomization type, the patcher will always randomly select effects to assign.

This option has the side effect of effects may be excluded entirely, if RNG decides not to assign them.

### Ignore Effect Distribution

This option is only available when selecting either `Ensure Effect Inclusion` or `Ignore Effect Inclusion` randomization types.

Normally, the randomly selected effects are weighted based on the effect distribution. Effects with higher effect distribution will have a higher chance of being selected.

When this option is enabled, this weightage is removed as the patcher will first select from the array of unique FormIDs of effects, before randomly selecting an effect element that matches this FormID.
