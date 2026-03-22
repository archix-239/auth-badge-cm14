# ─── Capacitor WebView ────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class cm.omc.authbadge14.** { *; }

# ─── Plugins Capacitor ────────────────────────────────────────────────────────
-keep class com.basecom.capacitor.jailbreakrootdetection.** { *; }
-keep class ee.forgr.capacitor.nfc.** { *; }

# ─── WebView JavaScript Interface ─────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ─── Annotations et réflexion ─────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ─── Stack traces lisibles en production (optionnel) ─────────────────────────
# Décommenter pour faciliter le débogage des crashes en prod
#-keepattributes SourceFile,LineNumberTable
#-renamesourcefileattribute SourceFile
