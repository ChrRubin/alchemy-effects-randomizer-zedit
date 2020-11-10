if (Test-Path -Path ".\dist") {
    Remove-Item -Path ".\dist" -Recurse
}

Copy-Item -Path ".\partials" -Recurse -Destination ".\dist\randomizeAlchemyPatcher\partials"
Copy-Item -Path ".\index.js", ".\module.json", ".\LICENSE" -Destination ".\dist\randomizeAlchemyPatcher"

Compress-Archive -Path ".\dist\randomizeAlchemyPatcher" -DestinationPath ".\dist\randomizeAlchemyPatcher.zip"
