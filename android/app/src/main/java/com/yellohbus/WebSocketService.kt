package com.yourapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import okio.ByteString
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class WebSocketService : Service() {

    companion object {
        @Volatile var instance: WebSocketService? = null
        private const val CHANNEL_ID = "websocket_channel"
    }

    private lateinit var client: OkHttpClient
    private var webSocket: WebSocket? = null
    private val wsUrl = "wss://yus.kwscloud.in/yus/passenger-ws"

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        startForeground(1337, makeNotification("Connecting..."))

        client = OkHttpClient.Builder()
            .pingInterval(25, TimeUnit.SECONDS)
            .build()

        connectWebSocket()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun connectWebSocket() {
        val req = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                sendEventToJS("socket_open", "connected")
                drainJSMessageQueue()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                sendEventToJS("bus_location_update", text)
            }

            override fun onMessage(ws: WebSocket, bytes: ByteString) {
                sendEventToJS("bus_location_update", bytes.base64())
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                sendEventToJS("socket_closing", reason)
                ws.close(1000, null)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                sendEventToJS("socket_error", t.message ?: "unknown")
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        thread {
            Thread.sleep(3000)
            if (instance != null) connectWebSocket()
        }
    }

    private fun drainJSMessageQueue() {
        val q = WebSocketModule.messageQueue
        synchronized(q) {
            while (q.isNotEmpty()) {
                val msg = q.removeAt(0)
                webSocket?.send(msg)
            }
        }
    }

    fun sendMessageToServer(message: String) {
        webSocket?.let {
            val ok = it.send(message)
            if (!ok) {
                synchronized(WebSocketModule.messageQueue) {
                    WebSocketModule.messageQueue.add(message)
                }
            }
        } ?: run {
            synchronized(WebSocketModule.messageQueue) {
                WebSocketModule.messageQueue.add(message)
            }
        }
    }

    private fun sendEventToJS(eventName: String, payload: String) {
        val reactContext = ReactNativeHostHelper.reactContext ?: return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, payload)
    }

    private fun makeNotification(text: String): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("YellohBus")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
        return builder.build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "WebSocket", NotificationManager.IMPORTANCE_LOW)
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        webSocket?.close(1000, "service_destroy")
        client.dispatcher.executorService.shutdown()
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
