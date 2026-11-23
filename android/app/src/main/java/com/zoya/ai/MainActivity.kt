package com.zoya.ai

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebChromeClient

class MainActivity : BridgeActivity() {

    private var pendingWebPermissionRequest: PermissionRequest? = null

    private val audioPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            val pending = pendingWebPermissionRequest
            pendingWebPermissionRequest = null
            if (pending != null) {
                runOnUiThread {
                    if (isGranted) {
                        pending.grant(pending.resources)
                    } else {
                        pending.deny()
                    }
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(ZoyaDeviceControlPlugin::class.java)
        super.onCreate(savedInstanceState)

        bridge?.webView?.webChromeClient = object : BridgeWebChromeClient(bridge) {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return

                val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (!wantsAudio) {
                    super.onPermissionRequest(request)
                    return
                }

                val hasMic = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                if (hasMic) {
                    runOnUiThread {
                        request.grant(request.resources)
                    }
                } else {
                    pendingWebPermissionRequest?.deny()
                    pendingWebPermissionRequest = request
                    audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }
    }

    override fun onDestroy() {
        pendingWebPermissionRequest = null
        super.onDestroy()
    }
}
