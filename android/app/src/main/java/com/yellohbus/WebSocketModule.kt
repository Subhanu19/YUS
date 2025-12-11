package com.yourapp

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WebSocketModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        val messageQueue: MutableList<String> = mutableListOf()
    }

    override fun getName(): String = "WebSocketModule"

    @ReactMethod
    fun startService() {
        val intent = Intent(reactContext, WebSocketService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, WebSocketService::class.java)
        reactContext.stopService(intent)
    }

    @ReactMethod
    fun sendMessage(message: String) {
        WebSocketService.instance?.let {
            it.sendMessageToServer(message)
        } ?: run {
            synchronized(messageQueue) {
                messageQueue.add(message)
            }
            startService()
        }
    }
}
