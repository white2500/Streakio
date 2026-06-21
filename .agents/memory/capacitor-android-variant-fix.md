---
name: Capacitor Android variant resolution fix
description: Fix for "No matching variant of project :capacitor-android was found" with AGP 8+ and pnpm
---

## Rule
When adding Capacitor Android to a pnpm workspace project using AGP 8+, the debug build will fail with:
`No matching variant of project :capacitor-android was found`

## Why
`@capacitor/android`'s `build.gradle` uses `publishing { singleVariant("release") }`.
This means the library only exposes a `release` variant to consuming projects.
When Android Studio builds a `debug` APK, Gradle looks for a `debug` variant of `:capacitor-android` and fails.

## Fix
Add a `debug` block with `matchingFallbacks` to `android/app/build.gradle`:

```groovy
buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
    debug {
        matchingFallbacks = ['release', 'debug']
    }
}
```

This tells Gradle: when resolving dependencies for the debug build, try `release` variant first, then `debug`.

## How to apply
Any time `cap add android` is run for a new Capacitor project, add this `debug` block immediately after.
The `capacitor.settings.gradle` auto-generated path uses pnpm's virtual store path (`.pnpm/@capacitor+android@X.Y.Z_...`) — verify with `ls` that it resolves correctly.
