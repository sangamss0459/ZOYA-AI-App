package com.zoya.ai

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResult
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "ZoyaDeviceControl",
    permissions = [
        Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone"),
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")
    ]
)
class ZoyaDeviceControlPlugin : Plugin() {

    override fun load() {
        super.load()
        ZoyaScreenCaptureService.frameCallback = { base64Jpeg ->
            val payload = JSObject()
            payload.put("jpegBase64", base64Jpeg)
            notifyListeners("screenFrame", payload)
        }
        ZoyaScreenCaptureService.stopCallback = {
            notifyListeners("screenCaptureStopped", JSObject())
        }
    }

    @PluginMethod
    fun openApp(call: PluginCall) {
        val app = call.getString("app")?.lowercase() ?: ""
        val query = call.getString("query")

        val packageMap = mapOf(
            "youtube" to "com.google.android.youtube",
            "telegram" to "org.telegram.messenger",
            "gmail" to "com.google.android.gm"
        )

        if (app == "settings") {
            val intent = Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve(JSObject().apply {
                put("opened", true)
                put("message", "Opened Android Settings")
            })
            return
        }

        if (app == "youtube" && !query.isNullOrBlank()) {
            val ytIntent = Intent(Intent.ACTION_SEARCH).apply {
                setPackage("com.google.android.youtube")
                putExtra("query", query)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                context.startActivity(ytIntent)
                call.resolve(JSObject().apply {
                    put("opened", true)
                    put("packageName", "com.google.android.youtube")
                    put("message", "Searched YouTube for $query")
                })
                return
            } catch (_: Exception) {
                // Fallback to HTTPS YouTube URL below
            }
        }

        val pkg = packageMap[app]
        if (pkg != null) {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(pkg)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                call.resolve(JSObject().apply {
                    put("opened", true)
                    put("packageName", pkg)
                    put("message", "Opened $app")
                })
                return
            }
        }

        call.resolve(JSObject().apply {
            put("opened", false)
            put("message", "$app is not installed on this device.")
        })
    }

    @PluginMethod
    fun openWebsite(call: PluginCall) {
        val url = call.getString("url") ?: ""
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            call.reject("Only HTTP/HTTPS URLs are permitted.")
            return
        }
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun openTelegramCompose(call: PluginCall) {
        val message = call.getString("message") ?: ""
        val shareUri = Uri.parse("https://t.me/share/url?text=${Uri.encode(message)}")
        val intent = Intent(Intent.ACTION_VIEW, shareUri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun openAndroidSettings(call: PluginCall) {
        val screen = call.getString("screen") ?: "settings"
        val action = if (screen == "accessibility") {
            Settings.ACTION_ACCESSIBILITY_SETTINGS
        } else {
            Settings.ACTION_SETTINGS
        }
        val intent = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve(JSObject().apply { put("opened", true) })
    }

    @PluginMethod
    fun startScreenCapture(call: PluginCall) {
        if (getPermissionState("notifications") != PermissionState.GRANTED &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        ) {
            requestPermissionForAlias("notifications", call, "notificationsCallback")
            return
        }
        launchMediaProjectionPrompt(call)
    }

    @PermissionCallback
    private fun notificationsCallback(call: PluginCall) {
        launchMediaProjectionPrompt(call)
    }

    private fun launchMediaProjectionPrompt(call: PluginCall) {
        val mgr = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(call, mgr.createScreenCaptureIntent(), "mediaProjectionResult")
    }

    @ActivityCallback
    private fun mediaProjectionResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(context, ZoyaScreenCaptureService::class.java).apply {
                action = ZoyaScreenCaptureService.ACTION_START
                putExtra(ZoyaScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ZoyaScreenCaptureService.EXTRA_RESULT_DATA, result.data)
            }
            ContextCompat.startForegroundService(context, serviceIntent)
            call.resolve(JSObject().apply { put("active", true) })
        } else {
            call.resolve(JSObject().apply { put("active", false) })
        }
    }

    @PluginMethod
    fun stopScreenCapture(call: PluginCall) {
        val stopIntent = Intent(context, ZoyaScreenCaptureService::class.java).apply {
            action = ZoyaScreenCaptureService.ACTION_STOP
        }
        context.startService(stopIntent)
        call.resolve(JSObject().apply { put("active", false) })
    }

    @PluginMethod
    fun startBackgroundService(call: PluginCall) {
        val intent = Intent(context, ZoyaAssistantForegroundService::class.java).apply {
            action = ZoyaAssistantForegroundService.ACTION_START
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve(JSObject().apply { put("active", true) })
    }

    @PluginMethod
    fun stopBackgroundService(call: PluginCall) {
        val intent = Intent(context, ZoyaAssistantForegroundService::class.java).apply {
            action = ZoyaAssistantForegroundService.ACTION_STOP
        }
        context.startService(intent)
        call.resolve(JSObject().apply { put("active", false) })
    }

    @PluginMethod
    fun performAccessibilityAction(call: PluginCall) {
        val service = ZoyaAccessibilityService.instance
        if (service == null) {
            call.resolve(JSObject().apply {
                put("ok", false)
                put("message", "Accessibility service is not enabled. Ask the user to enable ZOYA AI in Accessibility Settings.")
            })
            return
        }
        val action = call.getString("action") ?: ""
        val target = call.getString("target") ?: ""
        val result = service.executeAction(action, target)
        call.resolve(result)
    }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        val micGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else true

        call.resolve(JSObject().apply {
            put("isNativeAndroid", true)
            put("microphone", micGranted)
            put("notifications", notifGranted)
            put("accessibilityEnabled", ZoyaAccessibilityService.instance != null)
            put("screenCaptureActive", ZoyaScreenCaptureService.isRunning)
            put("backgroundServiceActive", ZoyaAssistantForegroundService.isRunning)
        })
    }
}
