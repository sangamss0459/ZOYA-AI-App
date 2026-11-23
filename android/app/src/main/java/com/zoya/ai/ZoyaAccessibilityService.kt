package com.zoya.ai

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.getcapacitor.JSObject

class ZoyaAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        var instance: ZoyaAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Passive observer; actions execute strictly on validated user commands.
    }

    override fun onInterrupt() {
        // Required override
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    fun executeAction(action: String, target: String): JSObject {
        val root = rootInActiveWindow ?: return JSObject().apply {
            put("ok", false)
            put("message", "No active screen window available.")
        }

        return when (action) {
            "read_page" -> {
                val collected = StringBuilder()
                collectText(root, collected)
                JSObject().apply {
                    put("ok", true)
                    put("screenText", collected.toString().take(1500))
                }
            }
            "click" -> {
                val nodes = root.findAccessibilityNodeInfosByText(target)
                val clicked = nodes.firstOrNull { it.isClickable }?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    ?: false
                JSObject().apply {
                    put("ok", clicked)
                    put("message", if (clicked) "Clicked $target" else "Could not find clickable $target")
                }
            }
            "scroll" -> {
                val dir = if (target.contains("up", ignoreCase = true)) {
                    AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                } else {
                    AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
                }
                val scrolled = findScrollable(root)?.performAction(dir) ?: false
                JSObject().apply {
                    put("ok", scrolled)
                    put("message", if (scrolled) "Scrolled $target" else "Screen is not scrollable")
                }
            }
            else -> JSObject().apply {
                put("ok", false)
                put("message", "Unsupported accessibility action: $action")
            }
        }
    }

    private fun collectText(node: AccessibilityNodeInfo?, out: StringBuilder) {
        if (node == null || out.length > 1500) return
        node.text?.let {
            if (it.isNotBlank()) out.append(it).append(" | ")
        }
        for (i in 0 until node.childCount) {
            collectText(node.getChild(i), out)
        }
    }

    private fun findScrollable(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isScrollable) return node
        for (i in 0 until node.childCount) {
            val found = findScrollable(node.getChild(i))
            if (found != null) return found
        }
        return null
    }
}
